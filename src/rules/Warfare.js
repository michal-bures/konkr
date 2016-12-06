import { PawnType } from 'rules/Pawns';

const PAWN_POWER = new Map([
    [PawnType.TOWN, 1],
    [PawnType.TOWER, 1],
    [PawnType.TROOP_1, 1],
    [PawnType.TROOP_2, 2],
    [PawnType.TROOP_3, 3],
    [PawnType.TROOP_4, 4],
]);

function Warfare(spec) {
    let {regions, pawns, log} = spec;

    return Object.freeze({
        defenseOf,
    });

    function defenseOf(hex) {
        return [hex].concat(hex.neighbours())
            .filter(hex2 => regions.regionOf(hex) === regions.regionOf(hex2))
            .reduce((currentMaximum, hex) => Math.max(currentMaximum, baseDefenseOf(hex)),0);
    }

    // base defense value of a hex not taking into account neighbouring hexes
    function baseDefenseOf(hex) {
        const pawn = pawns.pawnAt(hex);
        if (!pawn) return 0;
        return PAWN_POWER.get(pawn.pawnType) || 0;
    }
}

export default Warfare;