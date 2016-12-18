import { extend } from 'lib/util';

function Pawn(id, pawnType, hex) {

    let currentHex = hex;

    function toJSON() {
        return {
            id,
            type: pawnType.name,
            hex: hex && hex.id,
        };
    }

    let self = Object.create(pawnType);
    extend(self,{
        get hex() { return currentHex; },
        set hex(val) { currentHex = val; },
        get id() { return id; },
        toString,
        toJSON,
        pawnType: pawnType
    });
    self.Constructor = Pawn;

    return self;

    function toString() {
        return `[${pawnType.name} ♙${id} at ${hex}]`;
    }        
}
Pawn.fromJSON = ({grid, pawns}, {id, type, hex}) => { return new Pawn(id, pawns[type], grid.getHexById(hex)); };

export default Pawn;