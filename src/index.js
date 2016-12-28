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

game = new Phaser.Game(100, 100, Phaser.AUTO, 'konkr_game_container');

var spec = new Injector(undefined,{
    log: () => log,
    game: () => game,
    assets: spec => new GameAssets(spec),
    debug: spec => new DebugInfo(spec),
});


//default loglevel
log.setDefaultLevel(log.levels.DEBUG);
log.setLevel(log.levels.DEBUG);

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
        game.stage.backgroundColor='#d5dfef';
        game.scale.pageAlignHorizontally = true;
        var txt = game.add.text(game.width/2,game.height/2,"Konkr.io",{fill:"black", font:"24px Bookman Old Style"});
        txt.anchor.set(0.5);
        this.lblLoadingPhase = game.add.text(game.world.width/2,game.world.height/2+60,"Please wait...",{fill:"white", font:"16px Bookman Old Style"});
        this.lblLoadingPhase.anchor.set(0.5);
    },

    update: function() {
        this.lblLoadingPhase.destroy();
        game.state.start("Play", true, false, spec);
    }
};


//========================================================
// GAME STATE: Level Select
/*
var LevelSelect = function(game) {
    this.levels = new LevelCollection();
};
LevelSelect.prototype = {
    preload: function() {
        this.game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;

        game.load.spritesheet('menu-item','assets/menu-item.png',344,24);
    },
    create: function(game) {
        var self = this;
        var MENU_ITEM_HEIGHT = 24;
        var MENU_ITEM_SPACING = 8;
        var TEXT_PADDING = 4;
        var y = MENU_ITEM_SPACING;

        game.debug.stop();

        this.levels.load("level/list.txt", listLoaded);
        function listLoaded() {
            if (localStorage.lastLevel && self.levels.levelExists(localStorage.lastLevel)) {
                selectLevel(localStorage.lastLevel);
                return;
            } 

            self.levels.list.forEach(function(level){
                game.add.button(MENU_ITEM_SPACING, y, 'menu-item', function() { selectLevel(level); }, this, 1, 0);
                game.add.text(MENU_ITEM_SPACING+TEXT_PADDING, y + TEXT_PADDING, level, {font: "16px Arial", fill:'white'});
                y+= MENU_ITEM_HEIGHT + MENU_ITEM_SPACING;
            });        
        }
        
        function selectLevel(level) {
            self.levels.getLevel(level, levelLoaded);
            log.info("Loading level '"+ level+ "'...");
            localStorage.lastLevel = level;
        }

        function levelLoaded(cfg) {
            game.state.start("PrepareLevel", true, false, cfg);
        }
    }

};
*/
//========================================================
// GAME STATE: PrepareLevel
var PrepareLevel = function(game) {
    this.level = null;
};
PrepareLevel.prototype = {
    init: function(levelCfg) {
        /*log.trace("Intializing level configuration", levelCfg);
        applyCfg(levelCfg);
        this.dictionaryReady = false;
        this.loadingPhase = "Připravuji slovník...";
        var self = this;
        //Load level dictionary
        //Dictionary.get().onReady.addOnce(function(){self.dictionaryReady=true;});
        this.hndLoadingProgress = Dictionary.get().onLoadingProgress.add(function(done,total) { 
            var perc = Math.floor(done / total * 100);
            self.loadingPhase = "Připravuji slovník ("+perc+"%)"; 
        });*/
    },

    preload: function() {
        //Shared assets
    },

    create: function(game) {
    },

    update: function() {
    },

    render: function() {
    }
};

//========================================================
// GAME STATE: GameOver
/*
var GameOver = function(game) {
    this.level = null;
};
GameOver.prototype = {
    init: function(score) {
        this.finalScore = score;
    },
    preload: function() {
    },

    create: function(game) {
        var txt = game.add.text(game.world.width/2,game.world.height/2,"Seš mrtvej!",{fill:"white"});
        txt.anchor.set(0.5);
        if (this.finalScore) {
            this.lblLoadingPhase = game.add.text(game.world.width/2,game.world.height/2+40,"Ušel jsi "+ this.finalScore +" kroků",{fill:"white", font:"16px Arial"});
            this.lblLoadingPhase.anchor.set(0.5);
        }
        game.time.events.add(2000,function() { game.state.start("LevelSelect"); });
    },

    update: function() {
    },

    render: function() {
    }
};
*/

game.state.add("Boot",Boot);
game.state.add("PrepareLevel",PrepareLevel);
game.state.add("Play",Play);
game.state.start("Boot");

