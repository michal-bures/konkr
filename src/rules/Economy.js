import { signedNumber } from 'lib/util';

function Economy(spec) {
    let {log, pawns, actions, regions} = spec;

    let regionTreasury = new WeakMap();

    const self = Object.freeze({
        priceOf,
        netIncomeOf,
        incomeOf,
        treasuryOf,
        expensesOf,
        upkeepOfPawn,
        onRegionTreasuryChanged: new Phaser.Signal(/* region, newValue, oldValue */),
        onRegionBankrupt: new Phaser.Signal(/* region */),
        toDebugString,
        toJSON() {
            let ret = {};
            regions.forEach(r=> {
                if (treasuryOf(r)!==0) ret[r.id] = treasuryOf(r);
            });
            return ret;
        },
        fromJSON(data) {
            regionTreasury = new WeakMap();
            regions.forEach(r=> {
                if (data[r.id]) regionTreasury.set(r,data[r.id]);
            });
        }
    });

    /// ACTION HANDLERS

    actions.setHandler('CHANGE_REGION_TREASURY', (action, region, amount) => {
        setTreasuryOf(region,treasuryOf(region) + amount);
        action.resolve();
    },
    {
        undo(action, region, amount) {
            setTreasuryOf(region,treasuryOf(region) - amount);
        }
    });

    actions.setHandler('SET_INITIAL_TREASURY', action => {
        regions.forEach(region=>{
            setTreasuryOf(region,netIncomeOf(region)*5);
        });
        action.resolve();
    });    

    actions.setHandler('SET_REGION_TREASURY', (action, region, amount) => {
        setTreasuryOf(region,amount);
        action.resolve();
    });

    actions.setHandler('COLLECT_REGION_INCOME', (action,region)=>{
        const oldValue = treasuryOf(region) || 0;
        let newValue = oldValue + netIncomeOf(region);
        if (newValue < 0) {
            newValue = 0;
            self.onRegionBankrupt.dispatch(region);
            actions.schedule('KILL_TROOPS_IN_REGION', region);
        }
        setTreasuryOf(region, newValue);
        action.resolve();
    });

    /// ACTION TRIGGERS

    regions.onLostCapital.add(region=>{
        actions.schedule('SET_REGION_TREASURY',region,0);
    });

    regions.onGainedCapital.add(region=>{
        actions.schedule('SET_REGION_TREASURY',region,0);
    });

    // PUBLIC METHODS

    function toDebugString() {
        return regions.map(region => {
            if (region.hasCapital()) return `* ${region.id}: ${treasuryOf(region) || 'N/A'} (${signedNumber(netIncomeOf(region))})`;
        }).filter(x=>x).join('\n');
    }

    function netIncomeOf(region) {
        return incomeOf(region) - expensesOf(region);
    }

    function priceOf(pawnType) {
        return pawnType.price || 0;
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
        return pawn.pawnType.upkeep || 0;
    }

    // PRIVATE METHODS

    function setTreasuryOf(region,value) {
        const oldValue = treasuryOf(region);
        if (value === oldValue) return;
        regionTreasury.set(region,value);
        self.onRegionTreasuryChanged.dispatch(region, value, oldValue);
    }


    return self;
}

export default Economy;