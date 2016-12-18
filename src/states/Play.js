import * as Renderer from 'ui/Renderer';
import HexSelectionProxy from 'ui/HexSelectionProxy';
import Scrolling from 'ui/Scrolling';
import RegionPanel from 'ui/RegionPanel';
import GridOverlays from 'ui/GridOverlays';
import UI from 'lib/controls/UI';
import Messages from 'ui/Messages';

import UIManager from 'ui/UIManager';
import GameState from 'rules/GameState';


const DEFAULT_GAME_SETTTINGS = {
    worldWidth: 15,
    worldHeight: 15,
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

        // logging plugin that display some messages directly on screen
        // must be initialized before more loggers are forked from the root logger
        var originalFactory = spec.log.methodFactory;
        spec.log.methodFactory = function (methodName, logLevel, loggerName) {
            var rawMethod = originalFactory(methodName, logLevel, loggerName);

            return function (...args) {
                rawMethod.apply(undefined,[(loggerName||'') + ">"].concat(...args));
                if (methodName!=='debug' && methodName!=='trace') gameUi.messages.push(`${args.join(' ')}`, methodName);
            };
        };
        spec.log.setLevel(spec.log.getLevel()); // apply plugin


        gameState = new GameState(spec);
        gameSpec = gameState.spec;

        gameUi = gameSpec.extend({
            gameState: () => gameState,
            ui: spec => new UIManager(spec),
            landSprites: spec => new Renderer.LandSprites(spec),
            regionBorders: spec => new Renderer.RegionBorders(spec),
            selRegionHighlight: spec => new Renderer.SelectedRegionHighlight(spec),
            pawnSprites: spec => new Renderer.Pawns(spec),
            hexSelectionProxy: spec => new HexSelectionProxy(spec),
            scrolling: spec => new Scrolling(spec),
            uiRegionPanel: spec => new RegionPanel(spec),
            gridOverlays: spec => new GridOverlays(spec),
            messages: spec => new Messages(spec),
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
        game.world.add(gameUi.pawnSprites.group);          
        game.world.add(gameUi.gridOverlays.group);  
        game.world.add(gameUi.hexSelectionProxy.group);
        game.world.add(gameUi.messages.group);  
        game.world.add(gameUi.uiRegionPanel.group);  
        game.stage.backgroundColor='#d5dfef';

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

        let breakAfterEveryAction = true;
        let debugBreakCallback = null;

        function shouldBreakBefore(nextAction) {
            if (breakAfterEveryAction) return true;
            switch (nextAction && nextAction.name) {
                case 'STORE_STATE':
                    return (nextAction.args[0] === 'konkr_autosave_turn_start');
                case 'START_PLAYER_TURN':
                    return true;
                default:
                    return false;
            }            
        }

        function shouldBreakAfter(prevAction) {
            switch (prevAction && prevAction.name) {
                default:
                    return false;
            }
        }

        gameSpec.actions.attachGuard((prevAction, nextAction) => new Promise(resolve => {
            //if (debugBreakCallback) return setTimeout(resolve,0);
            if (shouldBreakAfter(prevAction)) {
                log.info('❚❚ Halted after ' + prevAction.name);
                debugBreakCallback = resolve;
            } else if (shouldBreakBefore(nextAction)) {
                if (!breakAfterEveryAction) log.info('❚❚ Halted before ' + nextAction.name);
                debugBreakCallback = resolve;
            } else {
                if (prevAction && (prevAction.name==='END_PLAYER_TURN')) {
                    setTimeout(resolve, 0);
                } else {
                    resolve();
                }
            }
        }));

        //pause after game state has been reloaded
        gameState.onReset.add(()=> {
            log.info('❚❚ Halted after GameState.reset');
            breakAfterEveryAction = true;
        });

        nextTurnButton.addToGroup(game.world);
        nextTurnButton.onInputUp.add(() => {
            /*if (nextStateCallbacks.length) {
                nextStateCallbacks.pop()();
            }*/
        });

        function setCommandHotkey(keyName,commandName) {
            let key = Phaser.Keyboard[keyName];
            if (!key) throw Error(`${keyName} is not a valid Phaser Key name`);
            game.input.keyboard.addKey(key).onDown.add(()=> {
                gameUi.debug.executeCommand(commandName);
            });
        }

        // Keyboard shortcuts
        setCommandHotkey('BACKSPACE','actions.undo');
        setCommandHotkey('N','actions.step');
        setCommandHotkey('SPACEBAR','actions.play');
        setCommandHotkey('F1','gridOverlays.toggle');
        setCommandHotkey('F8','gameState.storeSnapshot');
        setCommandHotkey('F10','gameState.loadSnapshot');
        setCommandHotkey('O','gridOverlays.next');
        setCommandHotkey('R','gameState.restartTurn');

        game.debug.reset();
        // DEBUG

        gameUi.debug.attachOverlayRenderer(gameUi.gridOverlays);

        gameUi.debug.addCommand('actions','play', ()=> {
            breakAfterEveryAction = false;
            if (debugBreakCallback) {
                debugBreakCallback();
                debugBreakCallback = null;
            }
            log.info("⏵ Actions queue resumed");
        });

        gameUi.debug.addCommand('actions','step', ()=> {
            if (!breakAfterEveryAction) {
                breakAfterEveryAction = true;
            }
            if (debugBreakCallback) {
                log.info("⏯ "+ (gameSpec.actions.getCurrent() && gameSpec.actions.getCurrent().name));
                debugBreakCallback();
                debugBreakCallback = null;
            }
        });

        gameUi.debug.addCommand('actions','undo', ()=> {
            if (!gameSpec.actions.getLast()) return;
            gameUi.messages.push('↶ '+gameSpec.actions.getLast().name);
            gameSpec.actions.undoLastAction();
        });

        gameUi.debug.addCommand('gameState','restart', ()=> {
            gameSpec.actions.abortAll();
            gameSpec.actions.schedule('RESTART_GAME');
        });

        gameUi.debug.addCommand('gameState','newMap', ()=> {
            gameSpec.actions.abortAll();
            gameSpec.actions.schedule('LOAD_STATE','konkr_autosave_prestart');
        });

        gameUi.debug.addCommand('gameState','restartTurn', ()=> {
            gameSpec.actions.abortAll();
            gameSpec.actions.schedule('LOAD_STATE','konkr_autosave_turn_start');
        });


        gameUi.debug.addCommand('gameState','storeSnapshot', ()=> {
            gameSpec.actions.schedule("STORE_STATE", "konkr_devsnapshot");
            if (debugBreakCallback) {
                debugBreakCallback();
                debugBreakCallback = null;
                breakAfterEveryAction = true;
            }
        });

        gameUi.debug.addCommand('gameState','loadSnapshot', ()=> {
            gameSpec.actions.abortAll();
            gameSpec.actions.schedule("LOAD_STATE", "konkr_devsnapshot");
            if (debugBreakCallback) {
                debugBreakCallback();
                debugBreakCallback = null;
            }
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