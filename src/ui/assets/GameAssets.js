import AssetManager from 'lib/AssetManager';

import URL_HEX from 'assets/hex.png'; 
import URL_PAWN from 'assets/pawn.png'; 
import URL_SPRITE_ATLAS_PNG from 'assets/sprites.png';
import URL_SPRITE_ATLAS_JSON from 'assets/sprites.js';
/*import URL_FLAG from 'assets/flag.png'; 
import URL_NEXTTURNBUTTON from 'assets/ui/nextTurnButton.png'; 
import URL_UNDOBUTTON from 'assets/ui/undoButton.png'; 
import URL_SYMBOL from 'assets/symbols.png'; 
import URL_OPTION_BUTTON from 'assets/ui/optionButton.png'; 
import URL_POPOVER_SPRITE from 'assets/ui/popoverPointer.png';*/

import deny from 'assets/audio/deny.wav';
import grabPawn from 'assets/audio/grab.wav';
import dropPawn from 'assets/audio/drop.wav';

import { HEX_WIDTH, HEX_HEIGHT } from 'ui/Renderer';


function GameAssets(spec) {
	return new AssetManager(spec, {
        atlas: {
            core: [ URL_SPRITE_ATLAS_PNG, URL_SPRITE_ATLAS_JSON ]
        },
		images: {},
		spritesheets: {
		    hex : [ URL_HEX, HEX_WIDTH, 42],
		    pawn : [ URL_PAWN, 32,48],
		},
        sounds: {
            grabPawn,
            deny,
            dropPawn
        }
	});
}

export default GameAssets;
