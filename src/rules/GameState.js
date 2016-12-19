import Players from 'rules/Players';
import Regions from 'rules/Regions';
import Economy from 'rules/Economy';
import Pawns from 'rules/Pawns';
import Actions from 'rules/Actions';
import Warfare from 'rules/Warfare';
import { HexGrid } from 'lib/hexgrid/HexGrid';
import IdGenerator from 'lib/IdGenerator';
import LandGenerator from 'rules/LandGenerator';
import RandomGenerator from 'lib/RandomGenerator';
import AI from 'ai/AI';

function GameState(spec) {
    let {log} = spec;

    const self = Object.freeze({
        get spec() { return gameStateSpec; },
        onReset: new Phaser.Signal(),
        toString,
        toDebugString,
        toJSON
    });
    
    let gameStateSpec = spec.extend({
        useName: spec => (moduleName) => {
            return spec.extend({ 
                actions: () => spec.actions && spec.actions.getNamedProxy(moduleName),
                debug: () => spec.debug && spec.debug.getNamedProxy(moduleName),
                log: () => spec.log && spec.log.getLogger(moduleName)
            });
        },
        random: () => new RandomGenerator(),
        ids: spec => new IdGenerator(spec),
        grid: spec => new HexGrid(spec),
        pawns: spec => new Pawns(spec.useName('pawns')),
        regions: spec => new Regions(spec.useName('regions')),
        economy: spec => new Economy(spec.useName('economy')),
        actions: spec => new Actions(spec.useName('actions')),
        warfare: spec => new Warfare(spec.useName('warfare')),
        landGen: spec => new LandGenerator(spec.useName('landGen')),
        players: spec => new Players(spec.useName('players')),
        ai: spec => new AI(spec.useName('ai')),
        gameState: () => self
    });
    let {actions, players, regions} = gameStateSpec;

    // order is important - modules that rely on objects from other modules must go last
    // for example pawns will want instances of hexes, so they need grid to be loaded
    const STATEFUL_MODULES = ['grid','pawns','regions','economy','players','ai','ids','random','actions'];

    function toJSON() {
        let obj = {};
        STATEFUL_MODULES.forEach(moduleName=> {
            log.debug("Saving "+moduleName);
            obj[moduleName] = gameStateSpec[moduleName].toJSON();
        });
        return obj;
    }

    function fromJSON(jsonData) {
        STATEFUL_MODULES.forEach(moduleName=> {
            log.debug(`Loading ${moduleName} state from`, jsonData[moduleName]);
            gameStateSpec[moduleName].fromJSON(jsonData[moduleName]);
        });
        self.onReset.dispatch();
    }

    actions.setHandler('STORE_STATE', (action, name) => {
        log.debug("Saving current game state...");
        localStorage.setItem(name, JSON.stringify(toJSON()));
        log.info("Game saved: "+name);
        action.resolve();
    },{ undo() {} });

    actions.setHandler('LOAD_STATE', (action, jsonOrKey) => {
        let data;
        if (typeof jsonOrKey === 'string') {
            log.debug(`Loading saved game from localStorage[${jsonOrKey}]`);
            data = JSON.parse(localStorage.getItem(jsonOrKey));
        } else {
            data = jsonOrKey;
        }
        log.debug('Loading game data:',jsonOrKey);
        fromJSON(data);
        log.info('Game loaded:',jsonOrKey);
        // do not resolve() this action because at this point actions module
        // no longer knows about it, much less expects it to be executing
    });

    actions.setHandler('RESTART_GAME', action=> {
        action.schedule('LOAD_STATE','konkr_autosave_gamestart');
        action.resolve();
    });

    actions.setHandler('START_NEW_GAME',  (action, {worldWidth, worldHeight, numFactions, playerFaction=1}) => {
        action.schedule('STORE_STATE','konkr_autosave_prestart');
        action.schedule('RESET_HEXGRID', worldWidth, worldHeight);
        action.schedule('GENERATE_LANDMASS');
        action.schedule('RANDOMIZE_REGIONS', numFactions);
        action.schedule('SETUP_PLAYERS', numFactions, playerFaction);
        action.schedule('SET_INITIAL_TREASURY');
        action.schedule('STORE_STATE','konkr_autosave_gamestart');
        action.schedule('START_FIRST_TURN');
        action.resolve();
    });

    actions.setHandler('START_FIRST_TURN', action=> {
        self.onReset.dispatch();
        action.schedule('START_NEW_TURN');
        action.resolve();
    });

    actions.setHandler('PRE_TURN_EVENTS', action=> {
        regions.forEach(r=>{
            if (!players.ownerOf(r)) {
                action.schedule('UPDATE_REGION_ECONOMY', r);
            }
        });
        action.resolve();
    }, { undo() {}});

    actions.setHandler('POST_TURN_EVENTS', action=> {
        action.schedule('CHECK_VICTORY_CONDITIONS');
        action.resolve();
    }, { undo() {}});

    actions.setHandler('START_NEW_TURN', (action) => {
        action.schedule('PRE_TURN_EVENTS');
        action.schedule('STORE_STATE','konkr_autosave_turn_start');
        players.forEach(player => {
            player.regions.forEach(region => action.schedule('UPDATE_REGION_ECONOMY',region));
            action.schedule('START_PLAYER_TURN', player);
        });
        action.schedule('POST_TURN_EVENTS');
        action.resolve();
    },{ undo() {} });

    actions.setHandler('CHECK_VICTORY_CONDITIONS', (action)=>{
        // Winning?? No such thing
        action.schedule('START_NEW_TURN');
        action.resolve();
    },{ undo() {} });

    function toString() {
        return `[GameState]`;
    }

    function toDebugString() {
        return "";
    }

    return self;
}

export default GameState;