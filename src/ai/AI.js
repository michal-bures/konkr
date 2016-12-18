import HexValuation from 'lib/hexgrid/HexValuation';
import Marshal from 'ai/Marshal';
import RegionEconomist from 'ai/Economist';
import HexGroup from 'lib/hexgrid/HexGroup';

function AI(spec) {
    let {actions, pawns, regions, debug, log} = spec;

    let ai = Object.freeze({
        AttackOpportunities,
        toDebugString,
    });

    // list of hexes where the AI has definitively decided to place unit
    let commitedUnits = null;

    actions.setHandler("AI_PLAYER_BEGIN", (action,player) => {
        action.data.prevCommitedUnits = commitedUnits;
        commitedUnits = new HexGroup();
        player.regions.forEach(region => region.hasCapital() && actions.schedule('AI_MANAGE_REGION', player, region));
        action.resolve();
    }, {
        undo(action) {
            action.data.prevCommitedUnits = commitedUnits;
        }
    });

    actions.setHandler("AI_MANAGE_REGION", (action, player, region) => {
        actions.schedule("AI_TASK_NEXT_UNIT", player, region);
        action.resolve();
    }, { undo(action) {
    }});

    actions.setHandler("AI_TASK_NEXT_UNIT", (action, player, region) => {

        let marshal = new Marshal(spec,player.getAvailableUnits(region)
            .filter(pawn=>!commitedUnits.contains(pawn.hex)));
        let economist = new RegionEconomist(spec, region);

        let defense = 0;
        let nextTarget = null;

        let defenseBenefit = new DefenseBenefit(spec,region);
        defenseBenefit.recalculate(commitedUnits);
        debug.valuation('defenseBenefit', defenseBenefit);

        let defenseTarget = defenseBenefit.pop();
        if ( defenseTarget && defenseTarget.val >= 2 && economist.approvePawnPurchase(pawns.TOWER)) {
            log.debug(`Building tower on ${defenseTarget.hex}.`);
            action.schedule("AI_FREE_UP_HEX",defenseTarget.hex);
            action.schedule("BUY_UNIT", pawns.TOWER, region);
            action.schedule("DROP_UNIT",defenseTarget.hex);
        }

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

        debug.valuation('AttackOpportunities', attackOpportunities);
        nextTarget = nextTarget.hex;
        log.debug(`Gonna try to capture ${nextTarget} (defense ${defense})...`);

        let plan = marshal.gatherMight(defense + 1);

        if (!plan) {
            log.warn(`Marshal found no plan for gathering ${defense +1} worth of units.`);
            return action.resolve();
        }
        log.debug(`Planning to ${plan.buy?`buy ${plan.buy} and`:''} use ${plan.use.length?plan.use.map(pawn=>pawn.toString()).join(', '):''}.`);

        if (plan.buy && !economist.approvePawnPurchase(plan.buy)) {
            log.debug(`...but cannot afford to pay for ${plan.buy}.`);
            return action.resolve();
        }
        if (plan.use.length > 1 && !economist.approvePawnMerge(plan.use, plan.result)) {
            log.debug(`...but cannot afford the increased upkeep cost.`);
            return action.resolve();
        }

        if (plan.buy) action.schedule('BUY_UNIT', plan.buy, region);
        plan.use.forEach(pawn => {
            action.schedule('GRAB_UNIT', pawn);
        });
        action.schedule('CONQUER_HEX', nextTarget, region);
        action.schedule('AI_TASK_NEXT_UNIT', player, region);
        commitedUnits.add(nextTarget);
        action.resolve();
    }, { undo() {}});

    actions.setHandler('AI_FREE_UP_HEX',(action, hex)=> {
        //TODO: Implement
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

    function DefenseBenefit({warfare, regions}, region) {
        let cache = new HexValuation.Manual();
    
        function sameRegion(h) {
            return regions.regionOf(h) === region;
        }
        function notSameRegion(h) {
            return regions.regionOf(h) !== region;
        }

        function recalculate(ignoredHexes) {
            region.hexes
                .filter(hex=>!pawns.pawnAt(hex) || pawns.pawnAt(hex).isTroop())
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
            recalculate,
            get: cache.get,
            pop: cache.pop
        });
    }

    function toDebugString() {
        return `Currently commited units:
${commitedUnits.map(u=>u.toString()).join('\n')}`;
    }

    return ai;
}

export default AI;