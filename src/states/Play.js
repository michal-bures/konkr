import * as Renderer from 'ui/Renderer';
import HexSelectionProxy from 'ui/HexSelectionProxy';
import Scrolling from 'ui/Scrolling';
import RegionPanel from 'ui/RegionPanel';
import GridOverlays from 'ui/GridOverlays';
import DebugInfo from 'ui/DebugInfo';
import UI from 'lib/controls/UI';

import UIManager from 'ui/UIManager';
import GameState from 'rules/GameState';


const DEFAULT_GAME_SETTTINGS = {
    worldWidth: 20,
    worldHeight: 20,
    numFactions: 4,   
};

function Play(game) { 

    let log = console;
    let gameState = null,
        gameSpec = null,
        gameUi = null,
        debugTabName=null,
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
            gameState: () => gameState,
            ui: spec => new UIManager(spec),
            debug: spec => new DebugInfo(spec),
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

        // DEBUG TOOLS SETUP

        let nextStateCallbacks = [];
        let breakAfterEveryAction = true;
        let debugBreakCallback = null;

        gameSpec.actions.attachGuard((prevAction, nextAction) => new Promise(resolve => {
            switch (nextAction && nextAction.name) {
                case 'START_PLAYER_TURN':
                    //setTimeout(resolve, 100);
                    //break;
                    return nextStateCallbacks.push(resolve);
                default:
                    if (breakAfterEveryAction) {
                        debugBreakCallback = resolve;
                    } else {
                        resolve();
                    }
            }
        }));

        nextTurnButton.addToGroup(game.world);
        nextTurnButton.onInputUp.add(() => {
            if (nextStateCallbacks.length) {
                nextStateCallbacks.pop()();
            }
        });

        game.debug.reset();
        // DEBUG
        gameUi.debug.addCommand('actions','⏵ Play', ()=> {
            breakAfterEveryAction = !breakAfterEveryAction;
            if (debugBreakCallback) debugBreakCallback();
            return (breakAfterEveryAction?'⏵ Play':"⏸ Pause");
        });

        gameUi.debug.addCommand('actions','⏯ Step', ()=> {
            if (debugBreakCallback) debugBreakCallback();
        });

        gameUi.debug.addCommand('actions','Undo', ()=> {
            gameSpec.actions.undoLastAction();
        });

        gameUi.debug.addCommand('actions','Restart', ()=> {
            gameSpec.actions.abortAll();
            gameSpec.actions.schedule('RESTART_GAME');
        });

        gameUi.debug.addCommand('actions','New map', ()=> {
            gameSpec.actions.abortAll();
            gameSpec.actions.schedule('LOAD_STATE','konkr_autosave_prestart');
        });


        gameUi.debug.addCommand('actions','Store snapshot', ()=> {
            gameSpec.actions.schedule("STORE_STATE", "konkr_devsnapshot");
        });

        gameUi.debug.addCommand('actions','Load snapshot', ()=> {
            gameSpec.actions.abortAll();
            gameSpec.actions.schedule("LOAD_STATE", JSON.parse(localStorage.getItem("konkr_devsnapshot")));
        });

        setupDebugDiv();
        refreshDebugTab('actions');

        //END OF DEBUG TOOLS SETUP

        gameSpec.actions.checkHandlers();
        gameSpec.actions.schedule('START_NEW_GAME',DEFAULT_GAME_SETTTINGS);

        log.info("Level initialization complete.");
    }

    function setupDebugDiv() {
        const debugDiv = document.getElementById("debug");
        const debugSelect = document.getElementById("debugModeSelect");

        if (!debugDiv) return;
        debugSelect.innerHTML= gameUi.listConstructors().sort().map(key => (gameUi[key].toDebugString?`<option value='${key}'>${key}</option>`:'')).join('');
        debugSelect.onchange = () => { refreshDebugTab(debugSelect.value); };
        setInterval(refreshDebugTab, 100);
    }

    function refreshDebugTab(name = debugTabName) {
        if (debugTabName!==name) {
            //changed tab
            gameUi.debug.generateDebugCommandsHTML(document.getElementById("debugCommandButtons"),name);
        }

        debugTabName=name;
        document.getElementById("debugModeSelect").value = debugTabName;
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