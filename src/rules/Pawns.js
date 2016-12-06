import {Enum} from 'enumify';
import expect from 'expect';

class PawnType extends Enum {}
PawnType.initEnum(['UNKNOWN','TOWN','TOWER','TROOP_1','TROOP_2','TROOP_3','TROOP_4','UNREST','RAIDERS','GRAVE']);

let lastPawnId = 0;
function generatePawnId() {
    return ++lastPawnId;
}

function Pawns(spec) {
    let { log } = spec;
    
    // public
    let pawns = Object.freeze({
        pawnAt,
        forEach,
        placeAt,
    });

    //private
    let hexPawn = [],
        _pawns = {};

    function pawnAt(hex) {
        return hexPawn[hex.id] || null;
    }

    function forEach(fn) {
        Object.keys(_pawns).forEach(key => fn(_pawns[key]));
    }

    function placeAt(pawnType,hex) {
        if (pawnAt(hex)) {
            throw Error(`Tried to place ${pawnType} at ${hex}, but it's already occupied by ${pawnAt(hex)}`);
        }
        expect(pawnType instanceof PawnType).toBeTruthy("Invalid pawnType '"+pawnType+"' in Pawns.placeAt");
        const newPawn = new Pawn(pawnType,hex);
        hexPawn[hex.id] = newPawn;
        _pawns[newPawn.id] = newPawn;
        newPawn.onMoved.add((pawn, fromHex, toHex) => {
            log.debug(`${pawn} moved from ${fromHex}, ${toHex}`);
            hexPawn[fromHex.id] = undefined;
            hexPawn[toHex.id] = pawn;
        });
        newPawn.onDestroyed.add(()=> {
            log.debug(`${newPawn} destroyed`);
            hexPawn[newPawn.hex.id] = undefined;
            delete _pawns[newPawn.id];
        });
        return newPawn;
    }

    class Pawn {
        constructor(pawnType, hex) {
            expect(pawnType instanceof PawnType).toBeTruthy();
            expect(hex).toExist();
            this._id = generatePawnId();
            this.pawnType = pawnType;
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

    return pawns;
}

export { Pawns, PawnType };