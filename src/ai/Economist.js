function Economist({economy}, region) {
    
    let projectedTreasury = economy.treasuryOf(region);
    let projectedIncome = economy.netIncomeOf(region);

    return Object.freeze({
        approvePawnMerge,
        approvePawnPurchase,
        canAffordPurchase,
        canAffordUpkeep,
    });

    function approvePawnPurchase(pawnType) {
        if (canAffordPurchase(pawnType.price) && canAffordUpkeep(pawnType.upkeep)) {
            projectedTreasury -= pawnType.price;
            projectedIncome -= pawnType.upkeep;
            return true;
        } else {
            return false;
        }
    }

    function approvePawnMerge(pawnList, resultingPawnType) {
        const upkeepDelta = resultingPawnType.upkeep - pawnList.reduce((sum, pawn)=>sum+pawn.upkeep, 0);
        if (canAffordUpkeep(upkeepDelta)) {
            projectedIncome -= upkeepDelta;
            return true;
        } else {
            return false;
        }
    }

    function canAffordPurchase(amount) {
        return projectedTreasury >= amount;
    }

    function canAffordUpkeep(amount) {
        return projectedIncome+projectedTreasury/10 > amount;
    }
}

export default Economist;