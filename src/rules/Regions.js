//Region is a connected component on the map belonging to a signle faction

import IterableOn from 'lib/decorators/IterableOn';
import HexGroup from 'lib/hexgrid/HexGroup';
import Region from 'rules/entities/Region';
import UniqueHeap from 'lib/UniqueHeap';
import RegionRandomizer from 'rules/RegionRandomizer';

const MAX_NUMBER_OF_FACTIONS = 6;

function Regions (spec) {
    let { grid, log, actions, ids, random } = spec;

    //private
    const _regions = [], //must be const in order not to break IterableOn
        hexRegion = [],
        regionRandomizer = new RegionRandomizer(spec);

    //public
    let regions = {
        factionOf,
        regionOf,
        byId,
        onCreated: new Phaser.Signal(/* region */),
        onHexesChangedOwner: new Phaser.Signal(/* hexGroup */),
        onChanged: new Phaser.Signal(/* region */),
        onDestroyed: new Phaser.Signal(/* region */),
        onMerged: new Phaser.Signal(/* srcRegion, rcvRegion */),
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

        // capture the hexes and keep track of which regions have lost some hexes
        hexOrGroup.forEach( hex=> {
            let owner = hexRegion[hex.id];
            if (owner) {
                if (!lostHexesByRegion[owner.id]) lostHexesByRegion[owner.id]=new HexGroup();
                lostHexesByRegion[owner.id].add(hex);
            }
            if (receivingRegion) {
                hexRegion[hex.id] = receivingRegion;
            } else {
                delete hexRegion[hex.id];
            }
        });
 
        // update all regions that have lost hexes in this transaction
        Object.keys(lostHexesByRegion).forEach(key => {
            hexesRemovedFromRegion(regions.byId(key), lostHexesByRegion[key]);
        });

        if (receivingRegion) {
            receivingRegion.hexes.add(hexOrGroup);
            // check if any regions shoudl merge with the region that gained land
            checkForRegionMerging(hexOrGroup);
            regions.onChanged.dispatch(receivingRegion);
        }

        regions.onHexesChangedOwner.dispatch(hexOrGroup);
        action.data.lostHexesByRegion = lostHexesByRegion; // store for undo
        action.resolve();
    },
    {
        undo(action, hexOrGroup, receivingRegion) {
            if (!(hexOrGroup instanceof HexGroup)) hexOrGroup = new HexGroup(hexOrGroup);
            
            if (receivingRegion) {
                receivingRegion.hexes.remove(hexOrGroup);
                hexOrGroup.forEach(hex=> { hexRegion[hex.id] = null; });
            }

            for (const key in action.data.lostHexesByRegion) {
                let r = byId(key);
                r.hexes.add(action.data.lostHexesByRegion[key]);
                action.data.lostHexesByRegion[key].forEach(hex => {
                    hexRegion[hex.id] = r;
                });
            }

            regions.onChanged.dispatch(receivingRegion);
            regions.onHexesChangedOwner.dispatch(hexOrGroup);

        }
    });

    actions.setHandler('MERGE_REGIONS',(action, absorbedRegion, receivingRegion)=>{
        action.schedule('CHANGE_HEXES_REGION', absorbedRegion.hexes.clone(), receivingRegion);
        regions.onMerged.dispatch(absorbedRegion, receivingRegion);
        action.resolve();
    }, { undo() {} });

    actions.setHandler('RANDOMIZE_REGIONS', (action, algorithm, options) => {
        const hexFaction=regionRandomizer.run(algorithm, options);
/*        grid.forEach((hex)=>{
            hexFaction[hex.id] = random.integer(1,numFactions);
        });*/
        _regions.length = 0;
        grid.components((hex, prevHex) => hexFaction[hex.id] === hexFaction[prevHex.id])
            .forEach((group) => createRegion(group, hexFaction[group.pivot.id]));
        action.resolve();
    });

    actions.setHandler('REMOVE_REGION', (action, region)=> {
        delete _regions[region.id];
        if (region.hexes.length) {
            action.schedule('CHANGE_HEXES_REGION', region.hexes, null);
        }
        regions.onDestroyed.dispatch(region);
        action.resolve();
    },
    {
        undo(action, region) {
            _regions[region.id] = region;
            region.hexes.forEach(hex => hexRegion[hex.id] = region);
            regions.onCreated.dispatch(region);
        }
    }
    );

    function byId(id) {
        return _regions[id];
    }

    function checkForRegionMerging(hexOrGroup) {
        if (!hexOrGroup.length) return;
        let alreadyMerged = {};
        let candidates = new UniqueHeap((a,b)=>b.hexes.length - a.hexes.length);
        hexOrGroup.border().forEach(hex1 => {
            let region1 = regionOf(hex1);
            if (!region1) return;
            hex1.neighbours().forEach(hex2 => {
                let region2 = regionOf(hex2);
                if (!region2) return;
                if (region1 !== region2 && region1.faction === region2.faction) {
                    candidates.push(region1);
                    candidates.push(region2);
                    alreadyMerged[region1]=true;
                }   
            });
        });

        let strongestRegion = candidates.pop();
        if (strongestRegion) {
            let absorbedRegion;
            while ((absorbedRegion = candidates.pop())) {
                actions.schedule('MERGE_REGIONS', absorbedRegion, strongestRegion);
            }
        }
    }

    // for internal use from HEXES_CHANGED_OWNER only!! Does NOT update hexRegion
    function hexesRemovedFromRegion(region, hexGroup) {
        region.hexes.remove(hexGroup);

        // check if region is still connected
        let comps = region.hexes.components();

        if (comps.length > 1) {
            // Oh shit boys, we have a split over here

            if (spec.economy.capitalOf(region)) {
                let ownerOfCapital = comps.getOwnerOf(spec.economy.capitalOf(region));
                // the component with capital is staying in this region
                if (ownerOfCapital) comps.remove(ownerOfCapital);
                    else comps.popLargestGroup(); // capital was actually just conquered
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

        if (region.hexes.length===0) {
            actions.schedule('REMOVE_REGION', region);
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