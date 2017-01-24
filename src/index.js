import log from 'loglevel';

import GameAssets from 'ui/assets/GameAssets';
import Injector from 'lib/Injector';
import DebugInfo from 'ui/DebugInfo';
import UserPrefs from 'lib/UserPrefs';
import { debounce } from 'lib/util';

import Play from 'states/Play';

const DEFAULT_USER_PREFS = {
    tutorialDisabled: undefined,
};

//========================================================
// ENTRYPOINT

//init globals

let game = new Phaser.Game(1, 1, Phaser.AUTO, 'konkr_game_container', null, false, true);

var spec = new Injector(undefined,{
    log: () => log,
    game: () => game,
    assets: spec => new GameAssets(spec),
    userPrefs: () => new UserPrefs('konkr_user_prefs',DEFAULT_USER_PREFS),
    debug: spec => new DebugInfo(spec),
    inDebugMode: () => document.getElementById("debug")
});

//default loglevel
if (spec.inDebugMode) {
    log.setDefaultLevel(log.levels.DEBUG);
    log.setLevel(log.levels.DEBUG);
} else {
    log.setDefaultLevel(log.levels.INFO);
    log.setLevel(log.levels.INFO);
}

//========================================================
// GAME STATE: Init

var Boot = function() {
};
Boot.prototype= {
    preload: function() {
        spec.assets.loadAll();

    },

    create: function() {
        game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.RESIZE;
        game.stage.backgroundColor='#d5dfef';
        game.scale.pageAlignHorizontally = true;
        const initialResizeHandler = debounce(() => {
            game.state.start("Play", true, false, spec);
        },200);
        game.scale.onSizeChange.addOnce(initialResizeHandler);
    },

    update: function() {
    }
};

game.state.add("Boot",Boot);
game.state.add("Play",Play);
game.state.start("Boot");

