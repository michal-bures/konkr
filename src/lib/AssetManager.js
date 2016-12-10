/* exported AssetManager */
/* globals -AssetManager */

import { HEX_WIDTH, HEX_HEIGHT } from 'ui/Renderer';

function AssetManager(spec) {
    let { game, log } = spec;

    let load = (id) => {
        var args;
        if (AssetManager.images[id]) {
            args = [id].concat(AssetManager.images[id]);
            game.load.image.apply(game.load,args);
        } else if (AssetManager.spritesheets[id]) {
            args = [id].concat(AssetManager.spritesheets[id]);
            game.load.spritesheet.apply(game.load,args);
        } else {
            log.error("Unknown asset requested:",id);
        }
    };

    return Object.freeze({
        load
    });
}

AssetManager.images = {
    'paneBackground' : ['assets/ui/paneBackground.png']
};

AssetManager.spritesheets = {
    'hex' : ['assets/hex.png', HEX_WIDTH, 84],
    'pawn' : ['assets/pawn.png', 32,48],
    'nextTurnButton' : ['assets/ui/nextTurnButton.png', 67,29]
};

export default AssetManager;