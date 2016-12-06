import { PawnType } from 'rules/Pawns';

const PAWN_UPKEEP = new Map([
    [PawnType.TROOP_1, 2],
    [PawnType.TROOP_2, 6],
    [PawnType.TROOP_3, 18],
    [PawnType.TROOP_4, 64],
    [PawnType.UNREST, 1],
    [PawnType.RAIDERS, 1],
    [PawnType.GRAVE, 1]
]);

function Economy(spec) {
    let {pawns} = spec;

    return Object.freeze({
        netIncomeOf,
        incomeOf,
        expensesOf,
        upkeepOfPawn
    });

    function netIncomeOf(region) {
        return incomeOf(region) - expensesOf(region);
    }

    function incomeOf(region) {
        return region.hexes.length;
    }

    function expensesOf(region) {
        let sum = 0;
        region.hexes.forEach((hex) => {
            sum += upkeepOfPawn(pawns.pawnAt(hex));
        });
        return sum;
    }

    function upkeepOfPawn(pawn) {
        if (!pawn) return 0;
        return PAWN_UPKEEP.get(pawn.pawnType) || 0;
    }
}

export default Economy;