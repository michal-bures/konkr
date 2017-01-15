import Players from 'rules/Players';
import Regions from 'rules/Regions';
import Economy from 'rules/Economy';
import Pawns from 'rules/Pawns';
import Actions from 'rules/Actions';
import Warfare from 'rules/Warfare';
import Bandits from 'rules/Bandits';
import { HexGrid } from 'lib/hexgrid/HexGrid';
import IdGenerator from 'lib/IdGenerator';
import LandGenerator from 'rules/LandGenerator';
import RandomGenerator from 'lib/RandomGenerator';
import AI from 'ai/AI';


const DEFAULT_GAME_SETTINGS = {
    worldWidth: 25,
    worldHeight: 15,
    numFactions: 6,   
    playerFaction: 1,
    seed: undefined,
};

function GameState(spec) {
    // version identifier to determine compatibility of stored gamestate
    const VERSION = 1;

    const self = Object.freeze({
        get spec() { return gameStateSpec; },
        onReset: new Phaser.Signal(),
        toString,
        toDebugString,
        storeState,
        loadState,
        startNewGame,
        toJSON
    });
    
    let gameStateSpec = spec.extend({
        useName: spec => (moduleName, logLevel) => {
            return spec.extend({ 
                actions: () => spec.actions && spec.actions.getNamedProxy(moduleName),
                debug: () => spec.debug && spec.debug.getNamedProxy(moduleName),
                log: () => {
                    if (!spec.log) return undefined;
                    let logger = spec.log.getLogger(moduleName);
                    if (logLevel!==undefined) logger.setLevel(logLevel);
                    return logger;
                }
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
        bandits: spec => new Bandits(spec.useName('bandits')),
        ai: spec => new AI(spec.useName('ai')),
        gameState: () => self
    });
    let {actions, players, regions, random, grid, economy} = gameStateSpec;
    let {log} = gameStateSpec.useName('gameState');

    // order is important - modules that rely on objects from other modules must go last
    // for example pawns will want instances of hexes, so they need grid to be loaded
    const STATEFUL_MODULES = ['grid','pawns','regions','economy','players','ai','ids','random','actions'];

    let initialState = toJSON(),
        gameOver = false;


    function toJSON() {
        let obj = { version: VERSION };
        STATEFUL_MODULES.forEach(moduleName=> {
            log.debug("Saving "+moduleName);
            obj[moduleName] = gameStateSpec[moduleName].toJSON();
        });
        return obj;
    }

    function fromJSON(jsonData) {
        gameOver = false;
        STATEFUL_MODULES.forEach(moduleName=> {
            log.debug(`Loading ${moduleName} state from`, jsonData[moduleName]);
            gameStateSpec[moduleName].fromJSON(jsonData[moduleName]);
        });
        self.onReset.dispatch();
    }

    actions.setHandler('STORE_STATE', (action, name) => {
        storeState(name);
        action.resolve();
    },{ undo() {} });

    function storeState(name) {
        log.debug("Saving current game state...");
        localStorage.setItem(name, JSON.stringify(toJSON()));
        log.debug("Game saved: "+name);
    }

    function loadState(jsonOrKey) {
        let data;
        if (typeof jsonOrKey === 'string') {
            log.debug(`Loading saved game from localStorage[${jsonOrKey}]`);
            data = JSON.parse(localStorage.getItem(jsonOrKey));
        } else {
            data = jsonOrKey;
        }
        if (!data) {
            log.debug(`No savedata found.`);
            return false;
        } else if (data.version != VERSION) {
            log.warn(`Saved game is not compatible with current version (save=${data.version}, current=${VERSION}).`)
            return false;
        }
        log.debug('Loading game data:',jsonOrKey);
        fromJSON(data);
        log.info('Game loaded.');        
    }

    function startNewGame(options) {
        loadState(initialState);
        actions.schedule('START_NEW_GAME', options);
    }

    actions.setHandler('LOAD_STATE', (action, jsonOrKey) => {
        if (!loadState(jsonOrKey)) action.resolve();
        // do not resolve() this action because at this point actions module
    // no longer knows about it, much less expects it to be executing
    });

    actions.setHandler('RESTART_GAME', action=> {
        action.schedule('LOAD_STATE','konkr_autosave_gamestart');
        action.resolve();
    });

    actions.setHandler('START_NEW_GAME',  (action, options) => {
        if (!options) options = DEFAULT_GAME_SETTINGS;
        let {worldWidth, worldHeight, numFactions, playerFaction, seed} = options;
        random.reset(seed);
        log.info("Starting new game (seed="+random.seed+")");
        action.schedule('RESET_HEXGRID', worldWidth, worldHeight);
        action.schedule('GENERATE_LANDMASS');
        action.schedule('RANDOMIZE_REGIONS', "balancedStart", {numFactions});
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
            action.schedule('UPDATE_PLAYER_ECONOMY',player);
            action.schedule('START_PLAYER_TURN', player);
        });
        action.schedule('POST_TURN_EVENTS');
        action.resolve();
    },{ undo() {} });

    actions.setHandler('CHECK_VICTORY_CONDITIONS', (action)=>{
        if (gameOver) {
            action.schedule('START_NEW_TURN');
            return action.resolve();
        } 

        let totalHexes = grid.allHexes().length;
        let bestPlayerRegion = players.bestRegionOf(players.localPlayer);

        if (!bestPlayerRegion || bestPlayerRegion.hexes.length === 1) {
            gameOver = true;
            action.schedule('DEFEAT');
        } else {
            let percentage = Math.floor((bestPlayerRegion.hexes.length / totalHexes) * 100);
            log.info(`Your largest kingdom controls ${percentage}% land on this island (66% needed for victory).`);

            if (percentage >= 66) {
                gameOver = true;
                action.schedule('VICTORY');
            }
        }

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