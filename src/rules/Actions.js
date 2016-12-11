import ActionsProvider from 'lib/ActionsProvider';

function Actions(spec) {
    return new ActionsProvider(spec, "Actions", [

        // Handled by GameFlow
        'START_NEW_GAME',
        'START_NEW_TURN',
        'CHECK_VICTORY_CONDITIONS',

        // Handled by Players
        'START_PLAYER_TURN', // (player)
        'END_PLAYER_TURN', // (player)
        'CONQUER_HEX', // (hex, region, pawn)
        'BUY_UNIT' , // (unitType)
        'GRAB_UNIT', // (pawn)

        // Handled by AI
        'AI_MANAGE_REGION', // (player, region)

        // Handled by HexGrid
        'RESET_HEXGRID' ,

        // Handled by WorldGenerator
        'GENERATE_LANDMASS', // (width, height)

        // Handled by Regions
        'CHANGE_HEXES_REGION', // (hexes, region)
        'RANDOMIZE_REGIONS',
        'CHANGE_REGION_CAPITAL', // (region, hex, previousHex)

        // Handled by Economy
        'COLLECT_REGION_INCOME' , // (regions)
        'SET_INITIAL_TREASURY' , // ... reset treasury for all region in the world to an initial value based on size
        'SET_REGION_TREASURY' ,
        'CHANGE_REGION_TREASURY' , // (region, amount)

        // Handled by Pawns
        'CREATE_PAWN' , // (pawnType, hex)
        'DESTROY_PAWN' , // (pawn)
        'MOVE_PAWN' , // (pawn, hex)
        'KILL_TROOPS_IN_REGION', // (region)
    ]);
}

export default Actions;