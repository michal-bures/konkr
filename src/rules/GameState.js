import Players from 'rules/Players';
import Regions from 'rules/Regions';
import Economy from 'rules/Economy';
import Pawns from 'rules/Pawns';
import Actions from 'rules/Actions';
import Warfare from 'rules/Warfare';
import { HexGrid } from 'lib/hexgrid/HexGrid';
import LandGenerator from 'rules/LandGenerator';
import AI from 'ai/AI';

function GameState(spec) {
    let {log, initialState} = spec;
    
    let gameStateSpec = spec.extend({
        useName: spec => (moduleName) => {
            return spec.extend({ 
                actions: () => spec.actions && spec.actions.getNamedProxy(moduleName),
                log: () => spec.log && {
                    debug: (...args) => console.debug(`${moduleName}>`, ...args),
                    error: (...args) => console.error(`${moduleName}>`, ...args),
                    warn: (...args) => console.warn(`${moduleName}>`, ...args),
                    log: console.log,
                    info: console.info,
                }
            });
        },
        grid: spec => new HexGrid(spec),
        pawns: spec => new Pawns(spec.useName('pawns')),
        regions: spec => new Regions(spec.useName('regions')),
        economy: spec => new Economy(spec.useName('economy')),
        actions: spec => new Actions(spec.useName('actions')),
        warfare: spec => new Warfare(spec.useName('warfare')),
        landGen: spec => new LandGenerator(spec.useName('landGen')),
        players: spec => new Players(spec.useName('players')),
        ai: spec => new AI(spec.useName('ai'))
    });
    let {actions, players} = gameStateSpec;

    const self = Object.freeze({
        get spec() { return gameStateSpec; },
        toString,
        toDebugString,
        toJSON
    });

    function toJSON() {
        let obj = {};
        ['grid','pawns','regions','economy',/*'actions',*/'players'].forEach(moduleName=> {
            log.debug("Saving "+moduleName);
            obj[moduleName] = gameStateSpec[moduleName].storeState();
        });
        return obj;
    }
/*
    actions.setHandler('STORE_STATE', (action, container) => {
    });

    actions.setHandler('LOAD_STATE', (action) => {

    })*/

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
        return `[GameState]`;
    }

    function toDebugString() {
        return "";
    }

    return self;
}

export default GameState;