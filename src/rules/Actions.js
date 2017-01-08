import ActionsProvider from 'lib/ActionsProvider';
import HexGroup from 'lib/hexgrid/HexGroup';

function Actions(spec) {
    return new ActionsProvider(spec, "Actions", {

        // WARNING: remember that all objects passed as action parameters must either
        // have plain types, or support serialization (fromJSON, toJSON)

    "actions": {
        // Handled by GameState
        'START_NEW_GAME': ['plain'], // ({ worldWidth, worldHeight, factions })
        'START_FIRST_TURN': [],
        'START_NEW_TURN': [],
        'PRE_TURN_EVENTS': [],
        'POST_TURN_EVENTS': [],
        'CHECK_VICTORY_CONDITIONS': [],
        'STORE_STATE': ['plain'], // ( localStorageItemName )
        'LOAD_STATE': ['plain'], // ( jsonData )
        'RESTART_GAME': [],

        // Handled by Players
        'SETUP_PLAYERS': ['plain','plain'], // (numFactions, playerFaction)
        'START_PLAYER_TURN': ["player"], // (player)
        'END_PLAYER_TURN': ["player"], // (player)
        'CONQUER_HEX': ["hex"], // (hex)
        'BUY_UNIT': ["pawnType", "region"], // (unitType, region)
        'GRAB_UNIT': ["pawn"], // (pawn)
        'DROP_UNIT': ["hex"], // (hex)

        // Handled by AI
        'AI_PLAYER_BEGIN': ["player"],
        'AI_MANAGE_REGION': ["player", "region"],
        'AI_TASK_NEXT_UNIT': ["player", "region"],
        'AI_FREE_UP_HEX': ["hex"],

        // Handled by Bandits
        'MOVE_BANDITS': [],

        // Handled by HexGrid
        'RESET_HEXGRID': ['plain','plain'], // (width, height)

        // Handled by WorldGenerator
        'GENERATE_LANDMASS': [],

        // Handled by Regions
        'CHANGE_HEXES_REGION': ["hexGroup", "region"], // (hexes, region)
        'RANDOMIZE_REGIONS': ["plain","plain"], // (strategy, options)
        'MERGE_REGIONS': ["region","region"],
        'REMOVE_REGION': ["region"],

        // Handled by Economy
        'UPDATE_PLAYER_ECONOMY': ["player"],
        'UPDATE_REGION_ECONOMY': ["region"],
        'COLLECT_REGION_INCOME': ["region"],
        'SET_INITIAL_TREASURY': [], // -> reset treasury for all region in the world to an initial value based on size
        'SET_REGION_TREASURY': ["region", "plain"], // (region, amount)
        'ADJUST_REGION_TREASURY': ["region", "plain"], // (region, changeAmount)
        'CREATE_REGION_CAPITAL': ["region"],
        'DESTROY_REGION_CAPITAL': ["region"], 

        // Handled by Pawns
        'CREATE_PAWN': ["pawnType", "hex"], // (pawnType, hex)
        'DESTROY_PAWN': ["pawn"], // (pawn)
        'MOVE_PAWN': ["pawn", "hex"], // (pawn, hex)
        'KILL_TROOPS_IN_REGION': ["region"], // (region)

        // Handled by UIManager
        'AWAIT_PLAYER_INPUT': [],
    },

    "types": {
        player: {
            toJSON(obj) { return obj.id; },
            fromJSON(id) { return spec.players.byId(id); },
            validate(val) { return !!(val && val.id !== undefined); }
        },
        hex : {
            toJSON(obj) { return obj.id; },
            fromJSON(id) { return spec.grid.getHexById(id); },
            validate(val) { return !!(val && val.position); }
        },
        region : {
            toJSON(obj) { return obj.id; },
            fromJSON(id) { return spec.regions.byId(id); },
            validate(val) { return !!(val && val.hexes); }
        },
        regions : {
            toJSON(regions) { return regions.map(r=>r.id); },
            fromJSON(list) { return list.map(id => spec.regions.byId(id)); },
            validate(val) { return !!val.forEach; }
        },
        hexGroup : {
            toJSON(hexes) { return hexes.toJSON(); },
            fromJSON(data) { return new HexGroup(data.map(hexId=>spec.grid.getHexById(hexId)));},
            validate(val) { return !!val.borderIncludingShoreline; }
        },
        pawnType : {
            toJSON(pawnType) { return pawnType.name; },
            fromJSON(name) { return spec.pawns[name]; },
            validate(val) { return !!spec.pawns[val.name]; }
        },
        pawn : {
            toJSON(obj) { return obj.id; },
            fromJSON(id) { return spec.pawns.byId(id); },
            validate(val) { return !!val.pawnType; }
        },
        plain : {
            toJSON(n) { return n; },
            fromJSON(n) { return n; },
            validate() { return true; }
        }
    }

    });
}

export default Actions;