import ActionsProvider from 'lib/ActionsProvider';

import getAttackOpportunities from 'ai/methods/getAttackOpportunities';

function AI(spec) {
    let self = new ActionsProvider(spec, 'AI', [
        'GET_ATTACK_OPPORTUNITIES', /* region, out targetArray */
        'OFFENSIVE_PLAY', /* regions, targetsArray */
    ]);
    self.setHandler('RANK_ATTACK_OPPORTUNITIES', getAttackOpportunities.bind(null,spec));
    self.setHandler('OFFENSIVE_PLAY')
}