import ActionsProvider from 'lib/ActionsProvider';

function Actions(spec) {
    return new ActionsProvider(spec, "Actions", {

        // WARNING: remember that all objects passed as action parameters must either
        // have plain types, or provide id property for serialization

    "actions": {
        // Handled by GameState
        'START_NEW_GAME': ['plain'], // ({ worldWidth, worldHeight, factions })
        'START_NEW_TURN': [],
        'CHECK_VICTORY_CONDITIONS': [],
        'STORE_STATE': ['plain'], // ( localStorageItemName )
        'LOAD_STATE': ['plain'], // ( jsonData )
        'RESTART_GAME': [],

        // Handled by Players
        'START_PLAYER_TURN': ["player"], // (player)
        'END_PLAYER_TURN': ["player"], // (player)
        'CONQUER_HEX': ["hex", "region"], // (hex, region)
        'BUY_UNIT': ["pawnType", "region"], // (unitType, region)
        'GRAB_UNIT': ["pawn"], // (pawn)

        // Handled by AI
        'AI_MANAGE_REGION': ["player", "region"], // (player, region)

        // Handled by HexGrid
        'RESET_HEXGRID': ['plain','plain'], // (width, height)

        // Handled by WorldGenerator
        'GENERATE_LANDMASS': [],

        // Handled by Regions
        'CHANGE_HEXES_REGION': ["hexGroup", "region"], // (hexes, region)
        'RANDOMIZE_REGIONS': ["plain"], // (numFactons)
        'MERGE_REGIONS': ["region","region"],

        // Handled by Economy
        'COLLECT_REGION_INCOME': ["region"], // (regions)
        'SET_INITIAL_TREASURY': [], // -> reset treasury for all region in the world to an initial value based on size
        'SET_REGION_TREASURY': ["region", "plain"],
        'CHANGE_REGION_TREASURY': ["region", "plain"], // (region, amount)

        // Handled by Pawns
        'CREATE_PAWN': ["pawnType", "hex"], // (pawnType, hex)
        'DESTROY_PAWN': ["pawn"], // (pawn)
        'MOVE_PAWN': ["pawn", "hex"], // (pawn, hex)
        'KILL_TROOPS_IN_REGION': ["region"], // (region)
        'CHANGE_REGION_CAPITAL': ["region", "hex", "hex"], // (region, hex, previousHex)
    },

    "types": {
        player: {
            toJSON(obj) { return obj.id; },
            fromJSON(id) { return spec.players.byId(id); },
            validate(val) { return !!(val && val.id); }
        },
        hex : {
            toJSON(obj) { return obj.id; },
            fromJSON(id) { return spec.grid.getHexById(id); },
            validate(val) { return !!(val && val.position); }
        },
        region : {
            toJSON(obj) { return obj.id; },
            fromJSON(id) { return spec.regions.byId(id); },
            validate(val) { return !!(val && val.hasCapital); }
        },
        regions : {
            toJSON(regions) { return regions.map(r=>r.id); },
            fromJSON(list) { return list.map(id => spec.regions.byId(id)); },
            validate(val) { return !!val.forEach; }
        },
        hexGroup : {
            toJSON(hexes) { return hexes.toJSON(); },
            fromJSON(data) { return spec.grid.getHexGroupFromJSON(data); },
            validate(val) { return !!val.neighbours; }
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