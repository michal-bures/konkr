//Region is a connected component on the map belonging to a signle faction

import expect from 'expect';
import { Random } from 'lib/util';

const NUMBER_OF_FACTIONS = 4;

let lastRegionId = 0;
function generateRegionId() {
    return ++lastRegionId;
}

class Region {
    constructor({regions},hexGroup) {
        expect(regions).toExist();
        this._id = generateRegionId();
        this._hexes = hexGroup;
        this.treasury = 0;
        this.capital = null;
        this.regions = regions;
        this.pickNewCapital();
        this.faction = regions.factionOf(this.capital);
    }

    get hexes() {
        return this._hexes;
    }

    get id() {
        return this._id;
    }

    pickNewCapital() {
        this.capital = this._hexes.pivot;
    }

    toString() {
        return `[Region #${this.id} (${this._hexes.size} hexes, capital at ${this.capital})]`;
    }

}

class Regions {
    constructor({grid, log}) {
        this.grid = grid;
        this.log = log;
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
            .map(group=>new Region({regions:this},group));

        this.regions.forEach(region=> {
            region.hexes.forEach( hex=> {
                this.hexRegion[hex.id] = region;
            });
        });
    }
}

export default Regions;