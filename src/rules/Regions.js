//Region is a connected component on the map belonging to a signle faction

import expect from 'expect';
import { Random } from 'lib/util';
import { PawnType } from 'rules/Pawns';

const NUMBER_OF_FACTIONS = 4;
const MIN_SIZE_FOR_CAPITAL = 2;

let lastRegionId = 0;
function generateRegionId() {
    return ++lastRegionId;
}

class Region {
    constructor({regions, pawns},hexGroup) {
        expect(regions).toExist();
        expect(pawns).toExist();
        this.pawns = pawns;
        this.regions = regions;

        this._id = generateRegionId();
        this._hexes = hexGroup;
        this.treasury = 0;
        this.capital = null;
        this.pickNewCapital();
        this.faction = regions.factionOf(this.hexes.pivot);
        Object.seal(this);
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
        if (this._hexes.size < MIN_SIZE_FOR_CAPITAL) {
            //region too small to have capital
            this.capital = null;
            return;
        }

        const availableHexes = this._hexes.filter(hex=>!this.pawns.pawnAt(hex));
        if (availableHexes.size === 0) {
            //TODO: clear some hex to make space for the new capital
            this.capital = null;
        } else {
            this.capital = this.pawns.placeAt(PawnType.TOWN,availableHexes.pivot);
        }
    }

    toString() {

        return `[Region #${this.id} (${this._hexes.size} hexes,`+(this.hasCapital()?`capital at ${this.capital.hex}`:"no capital")+")]";
    }

}

function Regions (spec) {
    let { grid } = spec;
    
    let regions = [],
        hexFaction = [],
        hexRegion = [];

    return Object.freeze({
        randomize,
        factionOf,
        regionOf,
        init
    });

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
        regions =
            grid
            .components((hex, prevHex) => factionOf(hex) === factionOf(prevHex))
            .map(group=>new Region(spec,group));

        regions.forEach(region=> {
            region.hexes.forEach( hex=> {
                hexRegion[hex.id] = region;
            });
        });
    }
}

export default Regions;