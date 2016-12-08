import { PawnType } from 'rules/Pawns';
import { signedNumber } from 'lib/util';

const PAWN_UPKEEP = new Map([
    [PawnType.TROOP_1, 2],
    [PawnType.TROOP_2, 6],
    [PawnType.TROOP_3, 18],
    [PawnType.TROOP_4, 64],
    [PawnType.UNREST, 1],
    [PawnType.RAIDERS, 1],
    [PawnType.GRAVE, 1]
]);

const PAWN_PURCHASE_COST = new Map([
    [PawnType.TROOP_1, 10],
    [PawnType.TROOP_2, 20],
    [PawnType.TROOP_3, 30],
    [PawnType.TROOP_4, 40],
    [PawnType.TOWER, 15],
]);

function Economy(spec) {
    let {log, pawns, actions, regions} = spec;

    let regionTreasury = new WeakMap();

    const self = Object.freeze({
        netIncomeOf,
        incomeOf,
        treasuryOf,
        expensesOf,
        upkeepOfPawn,
        onRegionTreasuryChanged: new Phaser.Signal(/* region, newValue, oldValue */),
        onRegionBankrupt: new Phaser.Signal(/* region */),
        toDebugString
    });

    actions.addHandler('BUY_UNIT', (callback, unitType, hex)=> {
        if (!PAWN_PURCHASE_COST.get(unitType)) throw Error(`Unit ${unitType} cannot be bought by a player.`);
        
        actions.execute('CHANGE_TREASURY',regions.regionOf(hex), -PAWN_PURCHASE_COST.get(unitType))
        .then(actions.execute('CREATE_PAWN',unitType,hex)
        .then(callback));

    });

    actions.addHandler('CHANGE_TREASURY', (callback, region, amount) => {
        regionTreasury.set(region, regionTreasury.get(region) + amount);
        callback();
    });

    actions.addHandler('UPDATE_ECONOMY', (callback,player)=>{
        player.controlledRegions.forEach( (region) => {
            const oldValue = regionTreasury.get(region) || 0;
            let newValue = oldValue + netIncomeOf(region);
            if (newValue < 0) {
                newValue = 0;
                self.onRegionBankrupt.dispatch(region);
                actions.execute('KILL_EVERYTHING_IN_REGION', region);
            }
            regionTreasury.set(region,newValue);
            if (newValue != oldValue) {
                self.onRegionTreasuryChanged.dispatch(region, newValue, oldValue);
            }
        });
        return callback();
    });

    function toDebugString() {
        return regions.map(region => {
            if (region.hasCapital()) return `* ${region.id}: ${regionTreasury.get(region) || 'N/A'} (${signedNumber(netIncomeOf(region))})`;
        }).filter(x=>x).join('\n');
    }

    function netIncomeOf(region) {
        return incomeOf(region) - expensesOf(region);
    }

    function costOf(pawnType) {

    }

    function incomeOf(region) {
        if (!region.hasCapital()) return 0;
        return region.hexes.length;
    }

    function expensesOf(region) {
        if (!region.hasCapital()) return 0;
        let sum = 0;
        region.hexes.forEach((hex) => {
            sum += upkeepOfPawn(pawns.pawnAt(hex));
        });
        return sum;
    }

    function treasuryOf(region) {
        return regionTreasury.get(region) || 0;
    }

    function upkeepOfPawn(pawn) {
        if (!pawn) return 0;
        return PAWN_UPKEEP.get(pawn.pawnType) || 0;
    }

    return self;
}

export default Economy;