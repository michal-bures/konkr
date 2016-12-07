//Region is a connected component on the map belonging to a signle faction

import { Random } from 'lib/util';
import { PawnType } from 'rules/Pawns';
import IterableOn from 'lib/decorators/IterableOn';

const NUMBER_OF_FACTIONS = 4;
const MIN_SIZE_FOR_CAPITAL = 2;

let lastRegionId = 0;
function generateRegionId() {
    return ++lastRegionId;
}

function Regions (spec) {
    let { grid, pawns, log } = spec;

    //private
    const _regions = [], //must be const in order not to break IterableOn
        hexRegion = [];


    //public
    let regions = {
        randomize,
        factionOf,
        regionOf,
        init,
        byId
    };
    IterableOn(regions,_regions);
    Object.freeze(regions);

    //implementation

    function randomize() {
        let hexFaction=[];
        grid.forEach((hex)=>{
            hexFaction[hex.id] = Random.integer(1,NUMBER_OF_FACTIONS);
        });
        _regions.length = 0;
        grid.components((hex, prevHex) => hexFaction[hex.id] === hexFaction[prevHex.id])
            .map(group=>new Region(hexFaction[group.pivot.id],group))
            .forEach(region=>{
                _regions.push(region);
                region.hexes.forEach( hex=> {
                    hexRegion[hex.id] = region;
                });
            });
    }

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

    function init() {

    }
   
    class Region {
        constructor(faction,hexGroup) {
            this._id = generateRegionId();
            this._hexes = hexGroup;
            this.faction = faction;
            this.treasury = 0;
            this.capital = null;
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