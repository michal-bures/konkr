import AssetManager from 'lib/AssetManager';

import paneBackground from 'assets/ui/paneBackground.png'; 
import regionPanel from 'assets/ui/regionPanel.png';
import goldCoins from 'assets/ui/goldCoins.png';

import URL_HEX from 'assets/hex.png'; 
import URL_PAWN from 'assets/pawn.png'; 
import URL_FLAG from 'assets/flag.png'; 
import URL_NEXTTURNBUTTON from 'assets/ui/nextTurnButton.png'; 
import URL_UNDOBUTTON from 'assets/ui/undoButton.png'; 
import URL_SHIELD_SYMBOL from 'assets/shield-symbol.png'; 

import deny from 'assets/audio/deny.wav';
import grabPawn from 'assets/audio/grab.wav';
import dropPawn from 'assets/audio/drop.wav';

import { HEX_WIDTH, HEX_HEIGHT } from 'ui/Renderer';


function GameAssets(spec) {
	return new AssetManager(spec, {
		images: {
    		paneBackground,
    		regionPanel,
    		goldCoins
		},
		spritesheets: {
		    hex : [ URL_HEX, HEX_WIDTH, 42],
		    pawn : [ URL_PAWN, 32,48],
		    flag : [ URL_FLAG, 32,48],
		    nextTurnButton : [ URL_NEXTTURNBUTTON, 67,29],
		    undoButton : [ URL_UNDOBUTTON, 67,29],
            shieldSymbol: [ URL_SHIELD_SYMBOL, 11,15 ]
		},
        sounds: {
            grabPawn,
            deny,
            dropPawn
        }
	});
}

export default GameAssets;
