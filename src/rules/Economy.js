import { signedNumber } from 'lib/util';

function Economy(spec) {
    let {log, pawns, actions, regions, grid, random} = spec;

    let regionTreasury = new WeakMap();
    let regionCapital = new WeakMap();

    const self = Object.freeze({
        buyablePawns,
        priceOf,
        netIncomeOf,
        incomeOf,
        treasuryOf,
        expensesOf,
        upkeepOfPawn,
        capitalOf,
        onRegionGainedCapital: new Phaser.Signal(/* region, hex */),
        onRegionLostCapital: new Phaser.Signal(/* region */),
        onRegionTreasuryChanged: new Phaser.Signal(/* region, newValue, oldValue */),
        onRegionBankrupt: new Phaser.Signal(/* region */),
        toDebugString,
        toJSON() {
            return regions.filter(capitalOf).map(r=>(
                {
                    region: r.id,
                    treasury: treasuryOf(r),
                    capital: capitalOf(r).id
                })
            );
        },
        fromJSON(data) {
            regionTreasury = new WeakMap();
            regionCapital = new WeakMap();
            data.forEach(({region, treasury, capital})=>{
                let r = regions.byId(region);
                regionTreasury.set(r, treasury);
                regionCapital.set(r, grid.getHexById(capital));
            });
        }
    });

    /// ACTION HANDLERS

    actions.setHandler('ADJUST_REGION_TREASURY', (action, region, amount) => {
        setTreasuryOf(region,treasuryOf(region) + amount);
        action.resolve();
    },
    {
        undo(action, region, amount) {
            setTreasuryOf(region,treasuryOf(region) - amount);
        }
    });

    actions.setHandler('SET_INITIAL_TREASURY', action => {
        regions.filter(regionQualifiesForCapital).forEach(region=>{
            action.schedule('CREATE_REGION_CAPITAL',region);
            for(let i=0;i<2;++i) action.schedule('UPDATE_REGION_ECONOMY', region);
        });
        action.resolve();
    });    

    actions.setHandler('SET_REGION_TREASURY', (action, region, amount) => {
        action.data.previousAmount = treasuryOf(region);
        setTreasuryOf(region,amount);
        action.resolve();
    },{
        undo(action,region) { setTreasuryOf(region,action.data.previousAmount); }
    });

    actions.setHandler('UPDATE_PLAYER_ECONOMY',(action,player) => {
        player.regions.forEach(region=>{
            action.schedule('UPDATE_REGION_ECONOMY',region);
        });
        action.resolve();
    }, {
        undo() {}
    });

    actions.setHandler('UPDATE_REGION_ECONOMY', (action, region) => {
        if (!capitalOf(region) && regionQualifiesForCapital(region)) {
            action.schedule('SET_REGION_TREASURY',region,0);
            action.schedule("CREATE_REGION_CAPITAL",region);
            action.schedule('COLLECT_REGION_INCOME', region);
        } else if (capitalOf(region) && !regionQualifiesForCapital(region)) {
            action.schedule("DESTROY_REGION_CAPITAL",region);
            action.schedule('KILL_TROOPS_IN_REGION', region);
        } else if (capitalOf(region)) {
            action.schedule('COLLECT_REGION_INCOME', region);
        } else {
            action.schedule('KILL_TROOPS_IN_REGION', region);
        }
        action.resolve();
    }, {
        undo() {}
    });

    actions.setHandler('CREATE_REGION_CAPITAL', (action, region)=> {
        let availableHexes = region.hexes.filter(hex=>!pawns.pawnAt(hex));
        if (regionCapital.get(region)) throw Error(`${region} already has a capital!`);
        if (availableHexes.length === 0) availableHexes = region.hexes.filter(hex=>!pawns.pawnAt(hex).isTroop());            
        if (availableHexes.length === 0) availableHexes = region.hexes;            
        if (availableHexes.lenght === 0) throw Error(`Cannot create capital for ${region} as it has no hexes!`);

        let capitalHex = random.hex(availableHexes);
        regionCapital.set(region,capitalHex);
        if (pawns.pawnAt(capitalHex)) action.schedule("DESTROY_PAWN", pawns.pawnAt(capitalHex));
        action.schedule("CREATE_PAWN", pawns.TOWN, capitalHex);
        self.onRegionGainedCapital.dispatch(region, capitalHex);
        action.resolve();
    },
    {
        undo(action, region) {
            regionCapital.delete(region);
        }
    });    

    actions.setHandler("DESTROY_REGION_CAPITAL", (action, region) => {
        let oldCapital = regionCapital.get(region);
        if (!oldCapital) return action.reject(`Cannot remove capital from ${region} that already lacks one!`);
        regionCapital.delete(region);
        if (pawns.pawnAt(oldCapital) && pawns.pawnAt(oldCapital).pawnType===pawns.TOWN) action.schedule("DESTROY_PAWN", pawns.pawnAt(oldCapital));
        self.onRegionLostCapital.dispatch(region);
        action.data.oldCapital = oldCapital;
        action.schedule('SET_REGION_TREASURY',region,0);
        action.resolve();
    },
    {
        undo(action, region) {
            regionCapital.set(region, action.data.oldCapital);
        }
    });    


    actions.setHandler('COLLECT_REGION_INCOME', (action,region)=>{

        const oldValue = treasuryOf(region) || 0;
        let newValue = oldValue + netIncomeOf(region);
        if (newValue < 0) {
            self.onRegionBankrupt.dispatch(region);
            actions.schedule('KILL_TROOPS_IN_REGION', region);
            actions.schedule('SET_REGION_TREASURY', region, 0);
            actions.schedule('COLLECT_REGION_INCOME', region);
        } else {
            actions.schedule('SET_REGION_TREASURY', region, newValue);
        }
        action.resolve();
    }, { undo() {} });    


    /// ACTION TRIGGERS

    regions.onChanged.add((region) => {
        if (capitalOf(region) && !region.hexes.contains(capitalOf(region))) {
            log.warn(`DESTROY CAPITAL OF ${region}`);
            actions.schedule("DESTROY_REGION_CAPITAL",region);
        }
    });

    regions.onDestroyed.add((region)=> {
        if (capitalOf(region)) actions.schedule("DESTROY_REGION_CAPITAL",region);
    });

    regions.onMerged.add((fromRegion, toRegion)=> {
        if (capitalOf(fromRegion) && capitalOf(toRegion)) {
            actions.schedule('ADJUST_REGION_TREASURY', toRegion, treasuryOf(fromRegion));
        }
    });

    // PUBLIC METHODS

    function toDebugString() {
        return regions.map(region => {
            if (capitalOf(region)) return `* ${region} with capital at ${capitalOf(region)}: ${treasuryOf(region)} (${signedNumber(netIncomeOf(region))})`;
        }).filter(x=>x).join('\n');
    }

    function netIncomeOf(region) {
        return incomeOf(region) - expensesOf(region);
    }

    function priceOf(pawnType) {
        return pawnType.price || 0;
    }

    function incomeOf(region) {
        if (!capitalOf(region)) return 0;
        return region.hexes.length;
    }

    function expensesOf(region) {
        if (!capitalOf(region)) return 0;
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

    function buyablePawns(region) {
        const allowance = treasuryOf(region);
        return pawns.pawnTypes.filter(pawnType => pawnType.price && (pawnType.price <= allowance));
    }

    function capitalOf(region) {
        return regionCapital.get(region);
    }

    // PRIVATE METHODS

    function setTreasuryOf(region,value) {
        const oldValue = treasuryOf(region);
        if (value === oldValue) return;
        regionTreasury.set(region,value);
        self.onRegionTreasuryChanged.dispatch(region, value, oldValue);
    }

    function regionQualifiesForCapital(region) {
        return region.hexes.length >= 2;
    }

    return self;
}

export default Economy;