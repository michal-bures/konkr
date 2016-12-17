import HexValuation from 'lib/hexgrid/HexValuation';
import Marshal from 'ai/Marshal';
import RegionEconomist from 'ai/Economist';

function AI(spec) {
    let {actions, pawns, debug, log} = spec;

    let ai = Object.freeze({
        AttackOpportunities
    });

    actions.setHandler("AI_MANAGE_REGION", (action,player, region) => {
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

        let marshal = new Marshal(spec, pawns.select({ 
            hexes: region.hexes, 
            custom: pawn=> pawn.isTroop() && player.canMoveUnit(pawn)
        }));
        let plan = marshal.gatherMight(defense + 1);

        if (!plan) {
            log.warn(`Marshal found no plan for gathering ${defense +1} worth of units.`);
            return action.resolve();
        }
        log.debug(`Planning to ${plan.buy?`buy ${plan.buy} and`:''} use ${plan.use.length?plan.use.map(pawn=>pawn.toString()).join(', '):''}.`);

        let economist = new RegionEconomist(spec, region);

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
        action.schedule('AI_MANAGE_REGION', player, region);
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

    return ai;
}

export default AI;