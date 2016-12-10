import { assertDefined } from 'lib/util';
import async from 'async';

function GameFlow({players, log, actions}) {
    
    const self = Object.freeze({
        toString,
        toDebugString
    });

    actions.setHandler('START_NEW_GAME',  (action, {worldWidth, worldHeight, numFactions}) => {
        action.schedule('RESET_HEXGRID', worldWidth, worldHeight);
        action.schedule('GENERATE_LANDMASS');
        action.schedule('RANDOMIZE_REGIONS');
        action.schedule('SET_INITIAL_TREASURY');
        action.schedule('START_NEW_TURN');
        action.resolve();
    });

    actions.setHandler('START_NEW_TURN', (action) => {
        players.forEach(player => {
            action.schedule('UPDATE_ECONOMY', player);
            action.schedule('PLAYER_ACT', player);
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