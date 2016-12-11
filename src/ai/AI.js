import HexValuation from 'lib/hexgrid/HexValuation';
import { PawnType } from 'rules/pawns';

function AI(spec) {
    let {actions, pawns, economy} = spec;

    let ai = Object.freeze({
        AttackOpportunities
    });

    actions.setHandler("AI_MANAGE_REGION", (action,player, region) => {
        debugger;

        let attackOpportunities = new AttackOpportunities(spec, player, region, 0);
        attackOpportunities.recalculate();

        let nextTarget = attackOpportunities.pop();
        if(!nextTarget) return action.resolve();

        let availableUnits = pawns.select({
            hexes:region.hexes,
            type:PawnType.TROOP_1
        });

        if (!availableUnits) {
            if (economy.treasuryOf(region) > 10 &&
                economy.netIncomeOf(region)+economy.treasuryOf(region)/10 > 2) {

                action.schedule('BUY_UNIT', PawnType.TROOP_1);
                action.schedule('CONQUER_HEX', nextTarget);
                action.schedule('AI_MANAGE_REGION', player, region);
            } 
        } else {
            action.schedule('GRAB_UNIT', availableUnits[0]);
            action.schedule('CONQUER_HEX', nextTarget);
            action.schedule('AI_MANAGE_REGION', player, region);
        }
        action.resolved();
    });

    function AttackOpportunities({warfare}, player, fromRegion, maxDefense) {
        let cache = new HexValuation.Manual();

        function recalculate() {
            fromRegion.hexes
                .neighbours()
                .filter(hex => !player.controls(hex) && warfare.defenseOf(hex) <= maxDefense)
                .forEach(hex => {
                    cache.set(hex,warfare.defenseOf(hex));
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