/* exported AssetManager */
/* globals -AssetManager */

import { HEX_WIDTH, HEX_HEIGHT } from 'ui/Renderer';

class AssetManager {
    constructor({game, log}) {
        this.game = game;
        this.log = log;

    }

    load(id) {
        const game = this.game;
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
    }
}

AssetManager.images = {
    'control-panel': ['assets/control-panel.png'],
    'stolenBackground': ['assets/stolen-background.png']
};

AssetManager.spritesheets = {
    'hex' : ['assets/hex.png', HEX_WIDTH, 41],
};

export default AssetManager;