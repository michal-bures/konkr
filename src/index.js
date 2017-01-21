import log from 'loglevel';

import GameAssets from 'ui/assets/GameAssets';
import Injector from 'lib/Injector';
import DebugInfo from 'ui/DebugInfo';

import Play from 'states/Play';

//====== Global objects accessible from all modules ======
var game;         //Phaser.Game instance

/* exported nextId */
var idCounter = 0;
//Generate next unique ID
function nextId() { return ++idCounter; }

//========================================================
// ENTRYPOINT

//init globals

game = new Phaser.Game(1, 1, Phaser.AUTO, 'konkr_game_container', null, false, true);

var spec = new Injector(undefined,{
    log: () => log,
    game: () => game,
    assets: spec => new GameAssets(spec),
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
    },

    update: function() {
        //this.lblLoadingPhase.destroy();
        game.state.start("Play", true, false, spec);
    }
};

game.state.add("Boot",Boot);
game.state.add("Play",Play);
game.state.start("Boot");

