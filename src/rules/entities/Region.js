import HexGroup from 'lib/hexgrid/HexGroup';

class Region {
    constructor(id, faction, hexes=new HexGroup()) {
        this._id = id;
        this._hexes = hexes;
        this.faction = faction;
    }
    
    get hexes() {
        return this._hexes; 
    }
    
    get id() { 
        return this._id; 
    }

    toJSON() {
        return {
            id: this._id,
            hexes: this._hexes.toJSON(),
            faction: this.faction,
            capital: this.capital && this.capital.id
        };
    }

    static fromJSON({grid},{id, faction, hexes}) {
        return new Region(id, faction, new HexGroup(hexes.map(hexId=>grid.getHexById(hexId))));
    }

    toString() {
        return `[♔${this.id} (F${this.faction} ,${this._hexes.length} hexes)]`;
    }
}

export default Region;