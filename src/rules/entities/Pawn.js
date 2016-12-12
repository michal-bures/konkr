class Pawn {
    constructor(id, pawnType, hex) {
        this._id = id;
        this.pawnType = pawnType;
        this._hex = hex;
    }

    toJSON() {
        return {
            id: this._id,
            type: this.pawnType.name,
            hex: this.hex && this.hex.id,
        };
    }

    static fromJSON({grid, pawns}, {id, type, hex}) { return new Pawn(id, pawns[type], grid.getHexById(hex)); }

    set hex(hex) {
        this._hex = hex;
    }

    get hex() {
        return this._hex;
    }

    get id() {
        return this._id;
    }

    toString() {
        return `[${this.pawnType} #${this.id} at ${this._hex}]`;
    }        
}

export default Pawn;