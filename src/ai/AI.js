import HexValuation from 'lib/hexgrid/HexValuation';


function AI(spec) {
    let {actions, pawns, economy, debug, log} = spec;

    let ai = Object.freeze({
        AttackOpportunities
    });

    let currentRegion;
    let currentPlayer;

    const troopByMight = {
        1: pawns.TROOP_1,
        2: pawns.TROOP_2,
        3: pawns.TROOP_4,
        4: pawns.TROOP_3,
    };

    actions.setHandler("AI_MANAGE_REGION", (action,player, region) => {
        currentRegion = region;
        currentPlayer = player;
        let defense = 0;
        let nextTarget = null;
        let attackOpportunities = null;
        while (!nextTarget && defense<=4) {
            log.debug("Looking for reachable tiles with max defense of "+defense);
            attackOpportunities = new AttackOpportunities(spec, player, region, defense);
            attackOpportunities.recalculate();
            nextTarget = attackOpportunities.pop();
            ++defense;
        }
        --defense;
        if (!nextTarget) {
            log.debug("No capturable hexes are available at all, bummer!");
            return action.resolve();
        }

        debug.valuation('attackOpportunities', attackOpportunities);
        nextTarget = nextTarget.hex;
        log.debug(`Gonna try to capture ${nextTarget} (defense ${defense})...`);

        let totalMight = 0;

        let villager = null;
        let strongestTroop = null;
        let capableUnits = pawns.select({
            hexes: region.hexes,
            custom: (pawn => {
                if (pawn.isTroop() && player.canMoveUnit(pawn)) {
                    totalMight += pawn.might;
                    if (!strongestTroop || pawn.might > strongestTroop.might) {
                        strongestTroop = pawn;
                    } else if (!villager && pawn.might ===1) {
                        villager = pawn;
                    }
                    return pawn.might > defense;
                } else {
                    return false;
                }
            })
        });

        if (capableUnits.length) {
            // we have a strong enough pawn available
            log.debug(`...${capableUnits[0]} will do the job.`);
            action.schedule('GRAB_UNIT', capableUnits[0]);
            action.schedule('CONQUER_HEX', nextTarget, region);
            action.schedule('AI_MANAGE_REGION', player, region);
        } else {
            //can't capture the tile with any existing pawns, try if i can merge some to get the exact 
            //attack needed
            if (strongestTroop && villager && canAffordUpkeep(upkeepCostOfMerge(villager, strongestTroop))) {
                action.schedule('GRAB_UNIT', villager.hex);
                action.schedule('GRAB_UNIT', strongestTroop.hex);
                action.schedule('CONQUER_HEX', nextTarget, region);
                action.schedule('AI_MANAGE_REGION', player, region);
            } else {
                //merging didn't help either, try to boost the strongest unit by buing stuff
                let unitToBuy = troopByMight[defense - strongestTroop.might + 1];
                if (canAffordPayment(unitToBuy.price) && canAffordUpkeep(unitToBuy.upkeep)) {
                    action.schedule('GRABD_UNIT', strongestTroop.hex);
                    action.schedule('BUY_UNIT', unitToBuy, region);
                    action.schedule('CONQUER_HEX', nextTarget, region);
                    action.schedule('AI_MANAGE_REGION', player, region);
                }
            }
            if (economy.treasuryOf(region) > 10 &&
                economy.netIncomeOf(region)+economy.treasuryOf(region)/10 > 2) {

            } 
        }
        action.resolve();
    }, { undo() {}});

    function upkeepCostOfMerge(u1, u2) {
        return (troopByMight[u1.pawnType.might+u2.pawnType.might].upkeep - u1.pawnType.upkeep - u2.pawnType.upkeep);
    }

    function canAffordUpkeepIncrease(region, increase) {
        return economy.netIncomeOf(region)+economy.treasuryOf(region)/10 > increase;
    }

    function mergeUnitsToGainMight(units,targetMight) {
        log.debug("Trying to merge units in ",units," to achieve might "+ targetMight);
        if (targetMight > 4) return;
        let tierList = {};
        units.forEach(unit=> {
            tierList[unit.might] = unit;
        });

        let smallestOverkill = Infinity;
        let smallestOverkillPair = null;
        for (const m1 in tierList) {
            for (const m2 in tierList) {
                if (m1 + m2 === targetMight) {
                    log.debug(`Found an exact solution!: ${m1} + ${m2}`);
                    return [m1, m2];
                } else if (m1 + m2 > targetMight && m1 + m2 - targetMight < smallestOverkill) {
                    smallestOverkill = m1 + m2 - targetMight;
                    smallestOverkillPair = [m1, m2];
                    log.debug(`Could go with ${m1} + ${m2}, which will overkill by ${smallestOverkill}`);
                }
            }
        }
        return smallestOverkillPair;
    }

    function AttackOpportunities({warfare}, player, fromRegion, maxDefense) {
        let cache = new HexValuation.Manual();

        function recalculate() {
            fromRegion.hexes
                .neighbours()
                .filter(hex => warfare.defenseOf(hex) <= maxDefense)
                .forEach(hex => {
                    cache.set(hex,1);
                });
        }

        return Object.freeze({
            recalculate,
            get: cache.get,
            pop: cache.pop
        });
    }

    return ai;
}

export default AI;