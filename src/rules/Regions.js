//Region is a connected component on the map belonging to a signle faction

import { Random } from 'lib/util';
import { PawnType } from 'rules/Pawns';

const NUMBER_OF_FACTIONS = 4;
const MIN_SIZE_FOR_CAPITAL = 2;

let lastRegionId = 0;
function generateRegionId() {
    return ++lastRegionId;
}

function Regions (spec) {
    let { grid, pawns, log } = spec;
    
    //public
    let regions = Object.freeze({
        randomize,
        factionOf,
        regionOf,
        init
    });

    //private
    let _regions = [],
        hexFaction = [],
        hexRegion = [];

    //implementation

    function randomize() {
        grid.forEach((hex)=>{
            hexFaction[hex.id] = Random.integer(1,NUMBER_OF_FACTIONS);
        });
        init();
    }

    function factionOf(hex) {
        return hexFaction[hex.id];
    }

    function regionOf(hex) {
        return hexRegion[hex.id];
    }

    function init() {
        _regions =
            grid
            .components((hex, prevHex) => factionOf(hex) === factionOf(prevHex))
            .map(group=>new Region(group));

        _regions.forEach(region=> {
            region.hexes.forEach( hex=> {
                hexRegion[hex.id] = region;
            });
        });
    }
   
    class Region {
        constructor(hexGroup) {
            this._id = generateRegionId();
            this._hexes = hexGroup;
            this.treasury = 0;
            this.capital = null;
            this.faction = regions.factionOf(this.hexes.pivot);
            this.pickNewCapital();
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
            if (this.capital) this.capital.destroy();
            if (this._hexes.length < MIN_SIZE_FOR_CAPITAL) {
                //region too small to have capital
                this.capital = null;
                return;
            }

            const availableHexes = this._hexes.filter(hex=>!pawns.pawnAt(hex));
            if (availableHexes.length === 0) {
                //TODO: clear some hex to make space for the new capital
                this.capital = null;
            } else {
                this.capital = pawns.placeAt(PawnType.TOWN,availableHexes.getRandomHex());
            }
        }

        toString() {
            return `[Region #${this.id} (${this._hexes.length} hexes,`+(this.hasCapital()?`capital at ${this.capital.hex}`:"no capital")+")]";
        }
    }

    return regions;
}

export default Regions;