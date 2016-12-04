import expect from 'expect';

import { HexGrid } from 'lib/HexGrid';
import { Ground, DebugInfo } from 'lib/Renderer';
import TileSelectionProxy from 'lib/ui/TileSelectionProxy';
import { worldGenPerlin, worldGenSolid } from 'lib/WorldGenerator';

class Play {
    constructor(game) {
        this.game = game;
    }

    init(env) {
        const {game, log, debugMode} = env;
        expect(game).toExist();
        expect(log).toExist();

        this.debugMode = debugMode;
        this.debug = new DebugInfo(env);
        env.debug = this.debug;
        const grid = new HexGrid(30,18);
        env.grid = grid;
        
        worldGenPerlin(env);

        this.ground = new Ground(env);
        env.ground = this.ground;

        let g = {};
        //display layers hierarchy
        g.root = game.add.group();                                  
            g.staticBackground = g.root.add(game.add.group());      // static background (does not move with the world)
            g.world = g.root.add(game.add.group());                 // the scrolling game world
                g.terrain = this.ground.getGroup();          // terrain tiles in the scrolling game world
                g.underObjects = g.world.add(game.add.group());     // elements displayed between terrain and objects in the scrolling game world
                g.objects = g.world.add(game.add.group());          // objects placed on terrain in the game world
                g.overObjects = g.world.add(game.add.group());      // elements overlayed over objects in the game world
                g.tileSelectionProxy = g.world.add(new TileSelectionProxy(env)); // invisible sprite capturing mouseover/mousedown items on game world and translating them to events on individual hexagons
            g.UIbackground = g.root.add(game.add.group());
            g.UI = g.root.add(game.add.group());
  
        // A simple background    
        /*
        var bg = g.staticBackground.create(0, 0, CFG.world.background);
        bg.width = game.width;
        bg.scale.y = bg.scale.x;
        bg.y=game.world.height-120-bg.height;*/
        //bg.height = game.world.height;

        this.game.stage.backgroundColor='#d5dfef';

        // Keyboard shortcuts
/*        var kEnter = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
        kEnter.onDown.add(function() {director.commitWord(); });
*/
        log.info("Level initialization complete.");

        game.debug.reset();
    }

    preload() {
        this.game.time.advancedTiming = true;
        this.game.time.desiredFps = 120;
    }

    create() {

    }

    update() {

    }

    render() {
        if (this.debugMode) {
            this.debug.render();
        }
    }

}

export default Play;