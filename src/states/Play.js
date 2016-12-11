import * as Renderer from 'ui/Renderer';
import HexSelectionProxy from 'ui/HexSelectionProxy';
import Scrolling from 'ui/Scrolling';
import RegionPanel from 'ui/RegionPanel';
import GridOverlays from 'ui/GridOverlays';
import UI from 'lib/controls/UI';

import UIManager from 'ui/UIManager';
import GameState from 'rules/GameState';


function Play(game) { 

    let log = console;
    let gameState = null,
        gameSpec = null,
        gameUi = null,
        debugTabName='actions',
        lastDebugContent='';


    return Object.freeze({
        init,
        preload,
        create,
        update,
        render,
        toString:()=>"[State Play]"
    });

    function init(spec) {

        gameState = new GameState(spec);
        gameSpec = gameState.spec;

        gameUi = gameSpec.extend({
            ui: spec => new UIManager(spec),
            debug: spec => new Renderer.DebugInfo(spec),
            landSprites: spec => new Renderer.LandSprites(spec),
            regionBorders: spec => new Renderer.RegionBorders(spec),
            selRegionHighlight: spec => new Renderer.SelectedRegionHighlight(spec),
            pawnSprites: spec => new Renderer.Pawns(spec),
            hexSelectionProxy: spec => new HexSelectionProxy(spec),
            scrolling: spec => new Scrolling(spec),
            uiRegionPanel: spec => new RegionPanel(spec),
            gridOverlays: spec => new GridOverlays(spec),
        });
        log = spec.log;
        window.c = gameUi;
        window.gameState = gameState;
    }

    function create() {
        game.world.setBounds(0, 0, 3000, 3000);

        //display layers z-order
        game.world.add(gameUi.landSprites.group);          
        game.world.add(gameUi.regionBorders.group);  
        game.world.add(gameUi.selRegionHighlight.group);
        game.world.add(gameUi.gridOverlays.group);  
        game.world.add(gameUi.pawnSprites.group);          
        game.world.add(gameUi.hexSelectionProxy.group);
        game.world.add(gameUi.uiRegionPanel.group);  
        game.stage.backgroundColor='#d5dfef';

        // Keyboard shortcuts
/*        var kEnter = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
        kEnter.onDown.add(function() {director.commitWord(); });
*/
        gameUi.gridOverlays.configureOverlay({
            name: 'defense',
            func: (hex) => { return gameSpec.warfare.defenseOf(hex)/5; }
        });
        gameUi.gridOverlays.show('defense');

        game.canvas.oncontextmenu = function (e) { 
            e.preventDefault(); 
            gameUi.gridOverlays.group.visible = !gameUi.gridOverlays.group.visible;
        };

        let { nextTurnButton } = new UI(gameSpec,{
            name: 'nextTurnButton',
            component: 'button',
            sprite: 'nextTurnButton',
            hAlign: 'right',
            vAlign: 'bottom',
            hOffset: 10,
            vOffset: 10,
        });

        let nextStateCallbacks = [];

        gameSpec.actions.attachGuard((prevAction, nextAction) => new Promise(resolve => {
            switch (nextAction && nextAction.name) {
                case 'START_PLAYER_TURN':
                    return nextStateCallbacks.push(resolve);
                default:
                    //return nextStateCallbacks.push(resolve);
                    //setTimeout(resolve,0);
                    resolve();
            }
        }));



        nextTurnButton.addToGroup(game.world);
        nextTurnButton.onInputUp.add(() => {
            if (nextStateCallbacks.length) {
                nextStateCallbacks.pop()();
            }
        });

        game.debug.reset();

        setupDebugDiv();
        gameSpec.actions.checkHandlers();
        gameSpec.actions.schedule('START_NEW_GAME',{
            worldWidth: 30,
            worldHeight: 30,
            numFactions: 4,
        });

        log.info("Level initialization complete.");
    }

    function setupDebugDiv() {
        const debugDiv = document.getElementById("debug");
        const debugSelect = document.getElementById("debugModeSelect");

        if (!debugDiv) return;
        debugSelect.innerHTML= gameUi.listConstructors().sort().map(key => (gameUi[key].toDebugString?`<option value='${key}'>${key}</option>`:''));
        debugSelect.value = debugTabName;
        debugSelect.onchange = () => { refreshDebugTab(debugSelect.value); };
        setInterval(refreshDebugTab, 100);
    }

    function refreshDebugTab(name = debugTabName) {
        debugTabName=name;
        const newContent = `<pre>${gameUi[name].toDebugString()}</pre>`;
        if (newContent == lastDebugContent) return;
        lastDebugContent = newContent;
        document.getElementById("debugContent").innerHTML = newContent; 
    }

    function preload() {
        game.time.advancedTiming = true;
        game.time.desiredFps = 60;
    }

    function update() {
        gameUi.scrolling.update();
        gameUi.hexSelectionProxy.update();
    }

    function render() {
        gameUi.landSprites.render();
        gameUi.regionBorders.render();
        gameUi.gridOverlays.render();
        gameUi.debug.render();
    }
}

export default Play;