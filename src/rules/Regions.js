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

class Regions {
    constructor({grid, log, pawns}) {
        expect(pawns).toExist();
        this.grid = grid;
        this.log = log;
        this.pawns = pawns;

        this.regions = [];
        this.hexFaction = [];
        this.hexRegion = [];
    }

    randomize() {
        this.grid.forEach((hex)=>{
            this.hexFaction[hex.id] = Random.integer(1,NUMBER_OF_FACTIONS);
        });
        this.init();
    }

    factionOf(hex) {
        return this.hexFaction[hex.id];
    }

    regionOf(hex) {
        return this.hexRegion[hex.id];
    }

    init() {
        this.regions =
            this.grid
            .components((hex, prevHex) => this.factionOf(hex) === this.factionOf(prevHex))
            .map(group=>new Region({regions:this, pawns:this.pawns},group));

        this.regions.forEach(region=> {
            region.hexes.forEach( hex=> {
                this.hexRegion[hex.id] = region;
            });
        });
    }
}

export default Regions;