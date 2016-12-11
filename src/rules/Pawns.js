import {Enum} from 'enumify';
import expect from 'expect';

class PawnType extends Enum {
    isTroop() { return false; }
    get defense() { return 0; }
    get upkeep() { return 0; }
    get price() { return 0; }
}
PawnType.initEnum({
    UNKNOWN: {
    },
    TOWN: {
        defense: 1
    },
    TROOP_1: {
        isTroop:()=>true,
        price: 10,
        upkeep: 2,
        defense: 1
    },
    GRAVE: {
        upkeep: 1
    },
    TROOP_2: {
        isTroop: ()=>true,
        price: 20,
        upkeep: 6,
        defense: 2
    },
    TROOP_3: {
        isTroop: ()=>true,
        price: 30,
        upkeep: 18,
        defense: 3
    },
    TROOP_4: {
        isTroop: ()=>true,
        price: 40,
        upkeep: 64,
        defense: 4
    },
    TOWER: {
        price: 15,
        defense: 2
    },
    UNREST: {
        upkeep: 1
    },
    RAIDERS: {
        upkeep: 1
    }
});


let lastPawnId = 0;
function generatePawnId() {
    return ++lastPawnId;
}

function Pawns(spec) {
    let { actions, log, src } = spec;
    
    // public
    let pawns = {
        pawnAt,
        select,
        forEach,
        toDebugString,
        storeState: () => _pawns.map(pawn=>pawn.toJSON()),
        onCreated: new Phaser.Signal(/* pawn */),
        onDestroyed: new Phaser.Signal(/* pawn */),
        onMoved: new Phaser.Signal(/* pawn, hex */)
    };

    PawnType.enumValues.forEach(pawnType => {
        pawns[pawnType.name] = pawnType;
    });

    Object.freeze(pawns);

    //private
    let hexPawn = [],
        _pawns = [];

    if (src) {
        throw Error('Not implemented');
    }

    actions.setHandler("CREATE_PAWN", (action, pawnType, hex) => {
        if (pawnAt(hex)) return action.reject("Cannot replace existing pawn"); //TODO: Implement
        const newPawn = placeAt(pawnType, hex);
        pawns.onCreated.dispatch(newPawn);
        return action.resolve();
    });

    actions.setHandler("DESTROY_PAWN", (action, pawn) => {
        delete hexPawn[pawn.hex.id];
        delete _pawns[pawn.id];
        pawns.onDestroyed.dispatch(pawn);
        action.resolve();
    });

    actions.setHandler("MOVE_PAWN", (action, pawn, hex) => {
        movePawn(pawn, hex);
        action.resolve();
    });

    actions.setHandler("KILL_TROOPS_IN_REGION", (action, region) => {
        pawns.select({ hexes: region.hexes, })
            .filter(pawn => pawn.pawnType.isTroop())
            .map(pawn => {
                action.schedule("DESTROY_PAWN", pawn);
                action.schedule("CREATE_PAWN", PawnType.GRAVE, pawn.hex);
            });
        action.resolve();
    });

    actions.setHandler("CHANGE_REGION_CAPITAL", (action, region, newCapital, prevCapital) => {
        if (prevCapital && newCapital) {
            action.schedule("MOVE_PAWN", pawnAt(prevCapital), newCapital);
        } else if (prevCapital && !newCapital) {
            action.schedule("DESTROY_PAWN", pawnAt(prevCapital));
        } else if (!prevCapital && newCapital) {
            action.schedule("CREATE_PAWN", PawnType.TOWN, newCapital);
        }
        action.resolve();
    });

    function pawnAt(hex) {
        return hexPawn[hex.id] || null;
    }

    function toDebugString() {
        const byType = new Map();
        pawns.forEach(pawn => {
            if (!byType.get(pawn.pawnType)) byType.set(pawn.pawnType,[]);
            byType.get(pawn.pawnType).push(pawn);
        });
        
        let ret = [];
        byType.forEach((value,key) => {
            ret.push(`* ${key}:`);
            value.forEach(pawn=> {
                ret.push(`   * ${pawn}`);
            });
        });
        return ret.join('\n');
    }

    function movePawn(pawn,toHex) {
        if (pawnAt(toHex)) {
            throw new Error(`Tried to move ${pawn} from ${pawn.hex} to ${toHex}, but an existing pawn ${pawns.pawnAt(toHex)} is in the way.`);
        } else if (!toHex) {
            throw new Error(`Tried to move ${pawn} from ${pawn.hex} to a nonexistent hex.`);
        }
        const fromHex = pawn.hex;
        if (fromHex) {
            if (fromHex === toHex) {
                log.warn(`Canceled noop move action for ${pawn}`);
                return;
            }
            delete hexPawn[fromHex.id];
        }
        pawn.hex = toHex;
        hexPawn[toHex.id] = pawn;
        log.debug(`${pawn} moved from ${fromHex} to ${toHex}`);
        pawns.onMoved.dispatch(pawn,fromHex,toHex);

    }

    function forEach(fn) {
        _pawns.forEach(fn);
    }

    function select({type,hexes,custom=()=>true}) {
        const filterFunction = (pawn=> {
            if (type && pawn.pawnType !== type) return false;
            if (!custom(pawn)) return false;
            return true;
        });

        let ret = [];
        if (hexes) {
            //iterate over hexes, probably faster than over all pawns
            hexes.forEach(hex => {
                const pawn = pawnAt(hex);
                if (pawn && filterFunction(pawn)) ret.push(pawn);
            });
        } else {
            for (const pawn in _pawns) {
                if (filterFunction(pawn)) ret.push(pawn);
            }
        }
        return ret;
    } 

    function placeAt(pawnType,hex) {
        if (pawnAt(hex)) {
            throw Error(`Tried to place ${pawnType} at ${hex}, but it's already occupied by ${pawnAt(hex)}`);
        }
        expect(pawnType instanceof PawnType).toBeTruthy("Invalid pawnType '"+pawnType+"' in Pawns.placeAt");
        const newPawn = new Pawn(pawnType,hex);
        hexPawn[hex.id] = newPawn;
        _pawns[newPawn.id] = newPawn;
        return newPawn;
    }

    class Pawn {
        constructor(pawnType, hex) {
            expect(pawnType instanceof PawnType).toBeTruthy();
            expect(hex).toExist();
            this._id = generatePawnId();
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

    return pawns;
}

export default Pawns;