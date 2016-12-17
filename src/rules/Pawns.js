import {Enum} from 'enumify';
import expect from 'expect';
import Pawn from './entities/Pawn';

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
        defense: 1,
        might: 1,
        merge: {
            TROOP_1: 'TROOP_2',
            TROOP_2: 'TROOP_3',
            TROOP_3: 'TROOP_4'
        }
    },
    TROOP_2: {
        isTroop: ()=>true,
        price: 20,
        upkeep: 6,
        defense: 2,
        might: 2,
        merge: {
            TROOP_1: 'TROOP_3',
            TROOP_2: 'TROOP_4',
        }
    },
    TROOP_3: {
        isTroop: ()=>true,
        price: 30,
        upkeep: 18,
        defense: 3,
        might: 3,
        merge: {
            TROOP_1: 'TROOP_4',
        }
    },
    TROOP_4: {
        isTroop: ()=>true,
        price: 40,
        upkeep: 64,
        defense: 4,
        might: 4,
    },
    TOWER: {
        price: 15,
        defense: 2
    },
    GRAVE: {
        upkeep: 1
    },

    UNREST: {
        upkeep: 1
    },
    RAIDERS: {
        upkeep: 1
    }
});

function Pawns(spec) {
    let { actions, log, ids } = spec;
    
    // public
    let pawns = {
        byId(id) { return _pawns[id]; },
        pawnAt,
        select,
        getMergeResult,
        forEach,
        toDebugString,
        toJSON,
        fromJSON,
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

    function toJSON() {
        return _pawns.map(pawn=>pawn && pawn.toJSON()).filter(e=>e);
    }

    function fromJSON(data) {
        hexPawn = [];
        _pawns = [];
        data.forEach(pawnData=>{
            const pawn = Pawn.fromJSON(spec, pawnData);
            _pawns[pawn.id] = pawn;
            hexPawn[pawn.hex.id] = pawn;
        });
    }

    actions.setHandler("CREATE_PAWN", (action, pawnType, hex) => {
        if (pawnAt(hex)) return action.reject("Cannot replace existing pawn"); //TODO: Implement
        const newPawn = placeAt(pawnType, hex);
        pawns.onCreated.dispatch(newPawn);
        return action.resolve();
    }, { undo(action, pawnType, hex) {
        let pawn = pawnAt(hex);
        delete hexPawn[hex.id];
        delete _pawns[pawn.id];
        pawns.onDestroyed.dispatch(pawn);
    }});

    actions.setHandler("DESTROY_PAWN", (action, pawn) => {
        delete hexPawn[pawn.hex.id];
        delete _pawns[pawn.id];
        pawns.onDestroyed.dispatch(pawn);
        action.resolve();
    }, { undo(action, pawn) {
        hexPawn[pawn.hex.id] = pawn;
        _pawns[pawn.id] = pawn;
        pawns.onCreated.dispatch(pawn);
    }});

    actions.setHandler("MOVE_PAWN", (action, pawn, hex) => {
        action.data.previousHex = hex;
        movePawn(pawn, hex);
        action.resolve();
    }, { undo(action, pawn) {
        movePawn(pawn, action.data.previousHex);
    }});

    actions.setHandler("KILL_TROOPS_IN_REGION", (action, region) => {
        pawns.select({ hexes: region.hexes, })
            .filter(pawn => pawn.pawnType.isTroop())
            .map(pawn => {
                action.schedule("DESTROY_PAWN", pawn);
                action.schedule("CREATE_PAWN", PawnType.GRAVE, pawn.hex);
            });
        action.resolve();
    }, { undo() {} });

    function pawnAt(hex) {
        return hexPawn[hex.id] || null;
    }

    function toDebugString() {
        const byType = {};
        pawns.forEach(pawn => {
            const t = pawn.pawnType.name;
            if (!byType[t]) byType[t]=[];
            byType[t].push(pawn);
        });
        
        log.debug(byType);

        let ret = [];
        for (const key in byType) {
            ret.push(`* ${key}:`);
            byType[key].forEach(val=> {
                ret.push(`   * ${val}`);
            });
        }
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

    function getMergeResult(pawnType1, pawnType2) {
        if (!pawnType1.merge || !pawnType1.merge[pawnType2.name]) return null;
        return pawns[pawnType1.merge[pawnType2.name]];
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
        const newPawn = new Pawn(ids.next('pawn'),pawnType,hex);
        hexPawn[hex.id] = newPawn;
        _pawns[newPawn.id] = newPawn;
        return newPawn;
    }

    return pawns;
}

export default Pawns;