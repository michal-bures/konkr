import {Enum} from 'enumify';
import expect from 'expect';

class PawnType extends Enum {}
PawnType.initEnum(['UNKNOWN','TOWN','TOWER','TROOP_1','TROOP_2','TROOP_3','TROOP_4','UNREST','RAIDERS','GRAVE']);

let lastPawnId = 0;
function generatePawnId() {
    return ++lastPawnId;
}

class Pawn {
    constructor({grid, pawns}, pawnType, hex) {
        expect(pawnType instanceof PawnType).toBeTruthy();
        expect(hex).toExist();
        this._id = generatePawnId();
        this.pawnType = pawnType;
        this.pawns = pawns;
        this._hex = hex;
        this.onMoved = new Phaser.Signal();
        this.onDestroyed = new Phaser.Signal();
    }

    moveTo(toHex) {
        if (!this.pawns.pawnAt(toHex)) {
            throw new Error(`Tried to move ${this} from ${this._hex} to ${toHex}, but an existing pawn ${this.pawns.pawnAt(toHex)} is in the way.`);
        } else if (!toHex.exists()) {
            throw new Error(`Tried to move ${this} from ${this._hex} to a nonexistent hex.`);
        }
        const fromHex = this._hex;
        this._hex = toHex;
        this.onMoved.dispatch(this,fromHex,toHex);
    }

    get hex() {
        return this._hex;
    }

    get id() {
        return this._id;
    }

    destroy() {
        this.onDestroyed.dispatch();
    }

    toString() {
        return `[${this.pawnType} #${this.id} at ${this._hex}]`;
    }
}

class Pawns {
    constructor({grid, log}) {
        this.grid = grid;
        this._hexPawn = [];
        this._pawns = {};
        this.log = log;
    }

    pawnAt(hex) {
        return this._hexPawn[hex.id] || null;
    }

    forEach(fn) {
        Object.keys(this._pawns).forEach(key => fn(this._pawns[key]));
    }

    placeAt(pawnType,hex) {
        if (this.pawnAt(hex)) {
            throw Error(`Tried to place ${pawnType} at ${hex}, but it's already occupied by ${this.pawnAt(hex)}`);
        }
        expect(pawnType instanceof PawnType).toBeTruthy("Invalid pawnType '"+pawnType+"' in Pawns.placeAt");
        const newPawn = new Pawn({grid:this.grid, pawns:this},pawnType,hex);
        this._hexPawn[hex.id] = newPawn;
        this._pawns[newPawn.id] = newPawn;
        newPawn.onMoved.add((pawn, fromHex, toHex) => {
            this.log.debug(`${pawn} moved from ${fromHex}, ${toHex}`);
            this._hexPawn[fromHex.id] = undefined;
            this._hexPawn[toHex.id] = pawn;
        });
        newPawn.onDestroyed.add(()=> {
            this.log.debug(`${newPawn} destroyed`);
            this._hexPawn[newPawn.hex.id] = undefined;
            delete this._pawns[newPawn.id];
        });
        return newPawn;
    }
}

export { Pawns, PawnType };