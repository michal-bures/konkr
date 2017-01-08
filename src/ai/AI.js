import HexValuation from 'lib/hexgrid/HexValuation';
import Marshal from 'ai/Marshal';
import RegionEconomist from 'ai/Economist';
import HexGroup from 'lib/hexgrid/HexGroup';

function AI(spec) {
    let {actions, pawns, regions, economy, debug, log, grid, random, bandits} = spec;

    // list of hexes where the AI has definitively decided to place unit
    let hexesWithCommitedUnits = null;

    let ai = Object.freeze({
        AttackOpportunities,
        toDebugString,
        toJSON() { 
            return {
                commited: hexesWithCommitedUnits && hexesWithCommitedUnits.map(hex=>hex.id),
            };
        },
        fromJSON(data) {
            hexesWithCommitedUnits = data.commited && new HexGroup(data.commited.map(id=>grid.getHexById(id)));
        }
    });

    actions.setHandler("AI_PLAYER_BEGIN", (action,player) => {
        action.data.prevhexesWithCommitedUnits = hexesWithCommitedUnits;
        hexesWithCommitedUnits = new HexGroup();
        player.regions.forEach(region => economy.capitalOf(region) && actions.schedule('AI_MANAGE_REGION', player, region));
        action.resolve();
    }, {
        undo(action) {
            action.data.prevhexesWithCommitedUnits = hexesWithCommitedUnits;
        }
    });

    actions.setHandler("AI_MANAGE_REGION", (action, player, region) => {
        actions.schedule("AI_TASK_NEXT_UNIT", player, region);
        action.resolve();
    }, { undo() {
    }});

    actions.setHandler("AI_TASK_NEXT_UNIT", (action, player, region) => {

        let marshal = new Marshal(spec,player.getAvailableUnits(region)
            .filter(pawn=>!hexesWithCommitedUnits.contains(pawn.hex)));
        let economist = new RegionEconomist(spec, region);


        // Priority 1: deal with bandits that are about to multiply
        let dangerousBandits = locateDangerousBandits(region);
        if (dangerousBandits.length) {
            let target = random.oneOf(dangerousBandits);
            log.debug(`Trying to eliminate bandit ${target}`);
            let plan = marshal.gatherMight(1);
            tryExecutePlan(plan, target.hex);
            return action.resolve();
        }

        // Priority 2: build towers on vulneurable hexes
        let defenseBenefit = new TowerBenefit(spec,region);
        defenseBenefit.recalculateWhileIgnoring(hexesWithCommitedUnits);
        debug.valuation('defenseBenefit', defenseBenefit);

        let defenseTarget = defenseBenefit.peek();
        if ( defenseTarget && defenseTarget.val >= 2 && economist.approvePawnPurchase(pawns.TOWER)) {
            defenseBenefit.pop();
            log.debug(`Building tower on ${defenseTarget.hex}.`);
            action.schedule("AI_FREE_UP_HEX",defenseTarget.hex);
            action.schedule("BUY_UNIT", pawns.TOWER, region);
            action.schedule("DROP_UNIT",defenseTarget.hex);
            action.schedule("AI_TASK_NEXT_UNIT", player, region);
            return action.resolve();
        }

        // Priority 3: make an offensive move
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
        if (nextTarget) {
            debug.valuation('AttackOpportunities', attackOpportunities);
            nextTarget = nextTarget.hex;
            log.debug(`Gonna try to capture ${nextTarget} (defense ${defense})...`);
            let plan = marshal.gatherMight(defense + 1);
            if (tryExecutePlan(plan, nextTarget)) return action.resolve();
        }

        if (marshal.totalMight() === 0) return action.resolve();

        // Priority 4: defensive move
        log.debug("Allocating rest of units to defense");

        defenseBenefit.recalculateWhileIgnoring(hexesWithCommitedUnits);

        let defensiveMoveBenefit = new DefensiveMoveBenefit(spec,defenseBenefit,region);
        debug.valuation('defensiveMoveBenefit', defenseBenefit);
        
        let target;
        do {
            target = defensiveMoveBenefit.pop();
        } while (target && pawns.pawnAt(target.hex) && pawns.pawnAt(target.hex).isTroop());
        
        if (!target || target.val === 0) {
            log.debug("No defensive move found");
            return action.resolve();
        } else {
            target = target.hex;
            log.debug(`Going to defend ${target}`);
            let plan = marshal.gatherMight(1);
            tryExecutePlan(plan, target);
            return action.resolve();
        }

        function tryExecutePlan(plan, targetHex) {
            if (!plan) {
                log.warn(`Marshal found no plan for gathering ${defense +1} worth of units.`);
                return false;
            }
            log.debug(`Planning to ${plan.buy?`buy ${plan.buy} and`:''} use ${plan.use.length?plan.use.map(pawn=>pawn.toString()).join(', '):''}.`);

            if (plan.buy && !economist.approvePawnPurchase(plan.buy)) {
                log.debug(`...but cannot afford to pay for ${plan.buy}.`);
                return false;
            }
            if (plan.use.length > 1 && !economist.approvePawnMerge(plan.use, plan.result)) {
                log.debug(`...but cannot afford the increased upkeep cost.`);
                return false;
            }

            if (plan.buy) action.schedule('BUY_UNIT', plan.buy, region);
            plan.use.forEach(pawn => {
                action.schedule('GRAB_UNIT', pawn);
            });
            if (regions.regionOf(targetHex) === region) {
                action.schedule('DROP_UNIT', targetHex);
            } else {
                action.schedule('CONQUER_HEX', targetHex);
            }
            action.schedule('AI_TASK_NEXT_UNIT', player, region);
            hexesWithCommitedUnits.add(targetHex);
            return true;        
        }
    }, { undo() {}});

    actions.setHandler('AI_FREE_UP_HEX',(action, hex)=> {
        if (!pawns.pawnAt(hex)) return action.resolve();
        let region = regions.regionOf(hex);
        let freeHex = hex.floodFind(hex=>!pawns.pawnAt(hex), hex=>regions.regionOf(hex) === region);
        if (!freeHex) return action.reject(`Failed to free up ${hex}, no free space available in the region`);
                      //TODO: Deal with it
        action.schedule('GRAB_UNIT', pawns.pawnAt(hex));
        action.schedule('DROP_UNIT', freeHex);
        action.resolve();
    }, { undo() {}});

    function AttackOpportunities({warfare}, player, fromRegion, maxDefense) {
        let cache = new HexValuation.Manual();

        function recalculate() {
            cache.reset();
            fromRegion.hexes
                .neighbours()
                .filter(hex => warfare.defenseOf(hex) <= maxDefense)
                .forEach(hex => {
                    cache.set(hex,random.integer(0,1000));
                });
        }

        return Object.freeze({
            recalculate,
            get: cache.get,
            pop: cache.pop,
            peek: cache.peek,
        });
    }

    function TowerBenefit({warfare, regions}, region) {
        let cache = new HexValuation.Manual();
    
        function sameRegion(h) {
            return regions.regionOf(h) === region;
        }
        function notSameRegion(h) {
            return regions.regionOf(h) !== region;
        }

        function recalculateWhileIgnoring(ignoredHexes) {
            cache.reset();
            region.hexes
                .filter(hex=>{
                    return !pawns.pawnAt(hex) || pawns.pawnAt(hex).isTroop();
                })
                .forEach(hex => {
                    let threat = 0;
                    hex.neighbours(sameRegion).forEach(adjacentHex=> {
                        if (adjacentHex.neighbours(notSameRegion).length) {
                            threat += Math.max(0, 1-warfare.defenseOf(
                                adjacentHex,
                                pawn=>!pawn.isTroop() || ignoredHexes.contains(pawn.hex)
                            ));
                        }
                    });
                    cache.set(hex,threat);
                });
        }

        return Object.freeze({
            recalculateWhileIgnoring,
            get: cache.get,
            pop: cache.pop,
            peek: cache.peek,
        });
    }

    function DefensiveMoveBenefit(spec,towerBenefit,region) {
        let bandits = new HexValuation.Manual();
        const composite = new HexValuation.Composite(towerBenefit, bandits);

        pawns.select({
            type: pawns.BANDIT,
            hexes: region.hexes
        }).forEach(bandit=>bandits.set(bandit.hex,random.integer(1000,2000)));

        return Object.freeze({
            get: composite.get,
            pop: composite.pop,
            peek: composite.peek,
        });

    }

    function locateDangerousBandits(region) {
        return pawns.select({
            type: pawns.BANDIT,
            hexes: region.hexes
        }).filter(bandits.willMultiply);

    }

    function toDebugString() {
        return `Currently commited units:
${hexesWithCommitedUnits.map(u=>u.toString()).join('\n')}`;
    }

    return ai;
}

export default AI;