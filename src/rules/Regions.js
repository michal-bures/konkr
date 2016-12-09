//Region is a connected component on the map belonging to a signle faction

import { Random } from 'lib/util';
import IterableOn from 'lib/decorators/IterableOn';
import { HexGroup } from 'lib/hexgrid/Hexagon';

const MAX_NUMBER_OF_FACTIONS = 4;
const MIN_SIZE_FOR_CAPITAL = 2;

let lastRegionId = 0;
function generateRegionId() {
    return ++lastRegionId;
}

function Regions (spec) {
    let { grid, log, actions, pawns } = spec;

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
        onHexesChangedOwner: new Phaser.Signal(/* hexGroup, newRegion, prevRegion */),
        onDestroyed: new Phaser.Signal(/* region */),
        toDebugString,
    };
    IterableOn(regions,_regions);
    Object.freeze(regions);

    //implementation

    actions.addHandler('CONQUER_HEX', (callback, hex, region, pawn) => {
        actions.execute('CHANGE_HEXES_REGION', hex, region).then(callback);
    });

    actions.addHandler('CHANGE_HEXES_REGION', (callback, hexOrGroup, region) => {
        let lostHexesByRegion = {};

        hexOrGroup.forEach( hex=> {
            let owner = hexRegion[hex.id];
            if (owner) {
                if (!lostHexesByRegion[owner.id]) lostHexesByRegion[owner.id]=new HexGroup();
                lostHexesByRegion[owner.id].add(hex);
            }
            hexRegion[hex.id] = region;

        });
        if (region) {
            region.hexes.add(hexOrGroup);
            if (!region.hasCapital() && region.hexes.length >= MIN_SIZE_FOR_CAPITAL) {
                region.pickNewCapital();
            }
        }

        Object.keys(lostHexesByRegion).forEach(key => {
            let region = regions.byId(key),
                hexGroup = lostHexesByRegion[key];

            region.hexes.remove(hexGroup);
            if (region.hasCapital() && region.hexes.length < MIN_SIZE_FOR_CAPITAL) {
                actions.execute('CHANGE_REGION_CAPITAL', region, null, region.capital);
            }
            if (region.hexes.length===0) {
                delete _regions[region.id];
                regions.onDestroyed.dispatch(region);
            }
        });
        regions.onHexesChangedOwner.dispatch(hexOrGroup);
        callback();
    });

    actions.addHandler('CHANGE_REGION_CAPITAL', (callback, region, newCapital) => {
        const oldCapital = region.capital;
        region.capital = newCapital;

        if (!oldCapital && newCapital) {
            regions.onGainedCapital.dispatch(region, newCapital);
        } else if (oldCapital && !newCapital) {
            regions.onLostCapital.dispatch(region);
        }
        callback();
    });

    actions.addHandler('RANDOMIZE_REGIONS', (callback, numFactions=99) => {
        numFactions = Math.min(numFactions, MAX_NUMBER_OF_FACTIONS);
        let hexFaction=[];
        grid.forEach((hex)=>{
            hexFaction[hex.id] = Random.integer(1,numFactions);
        });
        _regions.length = 0;
        grid.components((hex, prevHex) => hexFaction[hex.id] === hexFaction[prevHex.id])
            .map(group=> {
                let region = new Region(hexFaction[group.pivot.id]);
                _regions[region.id] = region;
                actions.execute('CHANGE_HEXES_REGION', group, region);
            });
        callback();
    });



    function byId(id) {
        return _regions[id];
    }

    function factionOf(hex) {
        if (regionOf(hex)===undefined) return 0;
        return regionOf(hex).faction;
    }

    function regionOf(hex) {
        return hexRegion[hex.id];
    }

    function toDebugString() {
        return regions.map(region => {
            return `* ${region}`;
        }).filter(x=>x).join('\n');
    }
   
    class Region {
        constructor(faction) {
            this._id = generateRegionId();
            this._hexes = new HexGroup();
            this.faction = faction;
            this.capital = null;
            regions.onCreated.dispatch(this);
        }
        
        get hexes() {
            return this._hexes; 
        }
        
        get id() { 
            return this._id; 
        }

        hasCapital() {
            return !!this.capital; 
        }
        
        pickNewCapital() {
            const availableHexes = this.hexes.filter(hex=>!pawns.pawnAt(hex));
            const prevCapital = this.capital;
            if (availableHexes.length === 0) {
                //TODO: clear some hex to make space for the new capital
                actions.execute('CHANGE_REGION_CAPITAL', this, null, prevCapital);
            } else {
                actions.execute('CHANGE_REGION_CAPITAL', this, availableHexes.getRandomHex(), prevCapital);
            }            
        }

        toString() {
            return `[Region #${this.id} (${this._hexes.length} hexes,`+(this.hasCapital()?`capital at ${this.capital}`:"no capital")+")]";
        }
    }

    return regions;
}

export default Regions;