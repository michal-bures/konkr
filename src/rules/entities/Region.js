import HexGroup from 'lib/hexgrid/HexGroup';

class Region {
    constructor(id, faction, hexes=new HexGroup(), capital=null) {
        this._id = id;
        this._hexes = hexes;
        this.faction = faction;
        this.capital = capital;
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

    toJSON() {
        return {
            id: this._id,
            hexes: this._hexes.toJSON(),
            faction: this.faction,
            capital: this.capital && this.capital.id
        };
    }

    static fromJSON({grid},{id, faction, hexes, capital}) {
        return new Region(id, faction, new HexGroup(hexes.map(hexId=>grid.getHexById(hexId))), grid.getHexById(capital));
    }

    toString() {
        return `[Region #${this.id} (${this.faction} ,${this._hexes.length} hexes,`+(this.hasCapital()?`capital at ${this.capital}`:"no capital")+")]";
    }
}

export default Region;