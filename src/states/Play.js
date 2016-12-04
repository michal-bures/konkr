import { HexGrid } from 'lib/HexGrid';
import * as Renderer from 'ui/Renderer';
import TileSelectionProxy from 'ui/TileSelectionProxy';
import { worldGenPerlin, worldGenSolid } from 'rules/WorldGenerator';
import Regions from 'rules/Regions';
import { Pawns } from 'rules/Pawns';
import Injector from 'lib/Injector';

function Play(game) { 

    let log = console;

    return Object.freeze({
        init,
        preload,
        create,
        update,
        render,
    });

    function init(spec) {
        log = spec.log;

        let gameSpec = new Injector(spec);

        gameSpec.registerAll({
            debug: spec => new Renderer.DebugInfo(spec),
            grid: () => new HexGrid(30,18),
            pawns: spec => new Pawns(spec),
            regions: spec => new Regions(spec),
            landSprites: spec => new Renderer.LandSprites(spec),
            pawnSprites: spec => new Renderer.Pawns(spec),
            generateWorld: () => worldGenPerlin,
            tileSelectionProxy: spec => new TileSelectionProxy(spec)
        });

        gameSpec.generateWorld(gameSpec);
        gameSpec.regions.randomize();

        let g = {};
        //display layers hierarchy
        g.root = game.add.group();                                  
            g.staticBackground = g.root.add(game.add.group());      // static background (does not move with the world)
            g.world = g.root.add(game.add.group());                 // the scrolling game world
                g.terrain = g.world.add(gameSpec.landSprites.group);          // terrain tiles in the scrolling game world
                g.pawns = g.world.add(gameSpec.pawnSprites.group);     // elements displayed between terrain and objects in the scrolling game world
                g.tileSelectionProxy = g.world.add(gameSpec.tileSelectionProxy.agent); // invisible sprite capturing mouseover/mousedown items on game world and translating them to events on individual hexagons
            g.UIbackground = g.root.add(game.add.group());
            g.UI = g.root.add(game.add.group());
  
        // A simple background    
        /*
        var bg = g.staticBackground.create(0, 0, CFG.world.background);
        bg.width = game.width;
        bg.scale.y = bg.scale.x;
        bg.y=game.world.height-120-bg.height;*/
        //bg.height = game.world.height;

        game.stage.backgroundColor='#d5dfef';

        // Keyboard shortcuts
/*        var kEnter = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
        kEnter.onDown.add(function() {director.commitWord(); });
*/
        log.info("Level initialization complete.");

        game.debug.reset();
    }

    function preload() {
        game.time.advancedTiming = true;
        game.time.desiredFps = 120;
    }

    function create() {

    }

    function update() {

    }

    function render() {
    }
}

export default Play;