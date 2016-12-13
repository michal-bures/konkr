//Region is a connected component on the map belonging to a signle faction

import { Random } from 'lib/util';
import IterableOn from 'lib/decorators/IterableOn';
import HexGroup from 'lib/hexgrid/HexGroup';
import Region from 'rules/entities/Region';

const MAX_NUMBER_OF_FACTIONS = 4;
const MIN_SIZE_FOR_CAPITAL = 2;

function Regions (spec) {
    let { grid, log, actions, pawns, ids, debug } = spec;

    //private
    const _regions = [], //must be const in order not to break IterableOn
        hexRegion = [];

    //public
    let regions = {
        factionOf,
        regionOf,
        byId,
        onCreated: new Phaser.Signal(/* region */),
        onGainedCapital: new Phaser.Signal(/* region, hex */),
        onLostCapital: new Phaser.Signal(/* region */),
        onCapitalConquered: new Phaser.Signal(/* region, hex */),
        onHexesChangedOwner: new Phaser.Signal(/* hexGroup */),
        onChanged: new Phaser.Signal(/* region */),
        onDestroyed: new Phaser.Signal(/* region */),
        toDebugString,
        toJSON,
        fromJSON
    };
    IterableOn(regions,_regions);
    Object.freeze(regions);

    function toJSON() {
        return _regions.map(r=>r.toJSON()).filter(r=>r);
    }

    function fromJSON(data) {
        _regions.length=0;
        hexRegion.length=0;
        data.forEach(regionData => {
            const region = Region.fromJSON(spec, regionData);
            _regions[region.id] = region;
            region.hexes.forEach(hex=>hexRegion[hex.id]=region);
        });
    }

    actions.setHandler('CHANGE_HEXES_REGION', (action, hexOrGroup, receivingRegion) => {
        let lostHexesByRegion = {};

        if (!(hexOrGroup instanceof HexGroup)) hexOrGroup = new HexGroup(hexOrGroup);

        // capture the hexes and keep track of which regions have lost some hexes
        hexOrGroup.forEach( hex=> {
            let owner = hexRegion[hex.id];
            if (owner) {
                if (!lostHexesByRegion[owner.id]) lostHexesByRegion[owner.id]=new HexGroup();
                lostHexesByRegion[owner.id].add(hex);
            }
            hexRegion[hex.id] = receivingRegion;
        });
 
        // update all regions that have lost hexes in this transaction
        Object.keys(lostHexesByRegion).forEach(key => {
            hexesRemovedFromRegion(regions.byId(key), lostHexesByRegion[key]);
        });

        if (receivingRegion) {
            receivingRegion.hexes.add(hexOrGroup);
            // check if any regions shoudl merge with the region that gained land
            checkForRegionMerging(hexOrGroup);
            // check if region gained capital
            if (!receivingRegion.hasCapital() && receivingRegion.hexes.length >= MIN_SIZE_FOR_CAPITAL) {
                pickNewCapital(receivingRegion);
            }

            regions.onChanged.dispatch(receivingRegion);
        }

        regions.onHexesChangedOwner.dispatch(hexOrGroup);
        action.resolve();
    });

    actions.setHandler('MERGE_REGIONS',(action, region1, region2)=>{
        if (region1.hexes.length>region2.hexes.length) {
            action.schedule('CHANGE_HEXES_REGION', region2.hexes.clone(), region1);
        } else {
            action.schedule('CHANGE_HEXES_REGION', region1.hexes.clone(), region2);
        }        
        action.resolve();
    });

    actions.setHandler('RANDOMIZE_REGIONS', (action, numFactions=99) => {
        numFactions = Math.min(numFactions, MAX_NUMBER_OF_FACTIONS);
        let hexFaction=[];
        grid.forEach((hex)=>{
            hexFaction[hex.id] = Random.integer(1,numFactions);
        });
        _regions.length = 0;
        grid.components((hex, prevHex) => hexFaction[hex.id] === hexFaction[prevHex.id])
            .forEach((group) => createRegion(group, hexFaction[group.pivot.id]));
        action.resolve();
    });

    function byId(id) {
        return _regions[id];
    }

    function checkForRegionMerging(hexOrGroup) {
        if (!hexOrGroup.length) return;
        hexOrGroup.border().forEach(hex1 => {
            let region1 = regionOf(hex1);
            if (!region1) return;
            hex1.neighbours().forEach(hex2 => {
                let region2 = regionOf(hex2);
                if (!region2) return;
                if (region1 !== region2 && region1.faction === region2.faction) {
                    actions.schedule('MERGE_REGIONS', region1, region2);
                }   
            });
        });
    }

    // for internal use from HEXES_CHANGED_OWNER only!! Does NOT update hexRegion
    function hexesRemovedFromRegion(region, hexGroup) {
        region.hexes.remove(hexGroup);

        // check if region is still connected
        let comps = region.hexes.components();

        if (comps.length > 1) {
            // Oh shit boys, we have a split over here
            if (region.hasCapital()) {
                // the component with capital is staying in this region
                comps.remove(comps.getOwnerOf(region.capital));
            } else {
                // the largest component is staying in this region
                comps.popLargestGroup(); 
            }

            // assign any disconnected components to standalone regions
            let comp;
            while (!!(comp = comps.popLargestGroup())) {
                createRegion(comp, region.faction);
            }
        }

        if (region.capital && hexGroup.contains(region.capital)) {
            // the region capital was just conqured
            regions.onCapitalConquered.dispatch(region, region.capital);
            pickNewCapital(region);
        }
        if (region.hexes.length===0) {
            delete _regions[region.id];
            regions.onDestroyed.dispatch(region);
        } else {
            regions.onChanged.dispatch(region);
        }
    }

    // for internal use only!!
    function createRegion(hexGroup, faction) {
        let region = new Region(ids.next('region'),faction);
        _regions[region.id] = region;
        actions.schedule('CHANGE_HEXES_REGION', hexGroup, region);
        regions.onCreated.dispatch(region);
    }

    function pickNewCapital(region) {
        const availableHexes = region.hexes.filter(hex=>!pawns.pawnAt(hex));
        const prevCapital = region.capital;
        if (availableHexes.length === 0) {
            //TODO: clear some hex to make space for the new capital
            region.capital = null;
            if (prevCapital) regions.onLostCapital.dispatch(region, prevCapital);
            actions.schedule('CHANGE_REGION_CAPITAL', region, null, prevCapital);
        } else {
            region.capital = availableHexes.getRandomHex();
            if (!prevCapital) regions.onGainedCapital.dispatch(region, region.capital);
            actions.schedule('CHANGE_REGION_CAPITAL', region, region.capital, prevCapital);
        }            
    }

    function factionOf(hex) {
        if (!regionOf(hex)) return 0;
        return regionOf(hex).faction;
    }

    function regionOf(hex) {
        return hexRegion[hex.id];
    }

    function toDebugString() {
        window.regions_list = _regions;
        window.hexRegion = hexRegion;

        return regions.map(region => {
            return `* ${region}`;
        }).filter(x=>x).join('\n');
    }
   
    return regions;
}

export default Regions;