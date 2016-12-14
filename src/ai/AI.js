import HexValuation from 'lib/hexgrid/HexValuation';

function AI(spec) {
    let {actions, pawns, economy, debug} = spec;

    let ai = Object.freeze({
        AttackOpportunities
    });

    actions.setHandler("AI_MANAGE_REGION", (action,player, region) => {

        let attackOpportunities = new AttackOpportunities(spec, player, region, 0);
        attackOpportunities.recalculate();
        debug.valuation('attackOpportunities', attackOpportunities);

        let nextTarget = attackOpportunities.pop();
        if(!nextTarget) return action.resolve();
        nextTarget = nextTarget.hex;

        let availableUnits = pawns.select({
            hexes: region.hexes,
            type: pawns.TROOP_1,
            custom: player.canMoveUnit.bind(player)
        });

        if (!availableUnits.length) {
            if (economy.treasuryOf(region) > 10 &&
                economy.netIncomeOf(region)+economy.treasuryOf(region)/10 > 2) {

                action.schedule('BUY_UNIT', pawns.TROOP_1, region);
                action.schedule('CONQUER_HEX', nextTarget, region);
                action.schedule('AI_MANAGE_REGION', player, region);
            } 
        } else {
            action.schedule('GRAB_UNIT', availableUnits[0]);
            action.schedule('CONQUER_HEX', nextTarget, region);
            action.schedule('AI_MANAGE_REGION', player, region);
        }
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