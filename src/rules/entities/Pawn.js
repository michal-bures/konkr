import { extend } from 'lib/util';

function Pawn(id, pawnType, initialHex) {


    function toJSON() {
        return {
            id,
            type: pawnType.name,
            hex: self.hex && self.hex.id,
        };
    }

    let self = Object.create(pawnType);
    extend(self,{
        hex: initialHex,
        get id() { return id; },
        toString,
        toJSON,
        pawnType: pawnType
    });
    self.Constructor = Pawn;

    return self;

    function toString() {
        return `[${pawnType.name} ♙${id} at ${self.hex}]`;
    }        
}
Pawn.fromJSON = ({grid, pawns}, {id, type, hex}) => { return new Pawn(id, pawns[type], grid.getHexById(hex)); };

export default Pawn;