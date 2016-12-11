import { assertDefined } from 'lib/util';
import async from 'async';

function GameFlow({players, log, actions, pawns}) {
    
    const self = Object.freeze({
        toString,
        toDebugString
    });

    actions.setHandler('START_NEW_GAME',  (action, {worldWidth, worldHeight, numFactions}) => {
        action.schedule('RESET_HEXGRID', worldWidth, worldHeight);
        action.schedule('GENERATE_LANDMASS');
        action.schedule('RANDOMIZE_REGIONS', numFactions);
        action.schedule('SET_INITIAL_TREASURY');
        action.schedule('START_NEW_TURN');
        action.resolve();
    });

    actions.setHandler('START_NEW_TURN', (action) => {
        players.forEach(player => {
            player.regions.forEach(region => action.schedule('COLLECT_REGION_INCOME',region));
            action.schedule('START_PLAYER_TURN', player);
        });
        action.schedule('CHECK_VICTORY_CONDITIONS');
        action.resolve();
    });

    actions.setHandler('CHECK_VICTORY_CONDITIONS', (action)=>{
        // Winning?? No such thing
        action.schedule('START_NEW_TURN');
        action.resolve();
    });

    function toString() {
        return `[GameFlow]`;
    }

    function toDebugString() {
        return "";
    }

    return self;
}

export default GameFlow;