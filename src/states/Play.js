
import UIManager from 'ui/UIManager';
import GameState from 'rules/GameState';

import UI from 'lib/controls/ui';


const DEFAULT_GAME_SETTTINGS = {
    worldWidth: 10,
    worldHeight: 10,
    numFactions: 2,   
    playerFaction: 1,
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

        // Main injector for game mechanic modules
        gameState = new GameState(spec);
        gameSpec = gameState.spec;

        // Main injector for UI and, rendering and animation modules
        gameUi = (new UIManager(gameSpec)).uiSpec;

        log = spec.log;
        window.c = gameUi;
        window.gameState = gameState;
    }

    function create() {

        game.canvas.oncontextmenu = function (e) { 
            e.preventDefault(); 
            gameUi.gridOverlays.group.visible = !gameUi.gridOverlays.group.visible;
        };

        // DEBUG TOOLS SETUP

        let breakAfterEveryAction = false;
        let debugBreakCallback = null;

        function shouldBreakBefore(nextAction) {
            if (breakAfterEveryAction) return true;
            return false;
            switch (nextAction && nextAction.name) {
//                case 'STORE_STATE':
//                    return (nextAction.args[0] === 'konkr_autosave_turn_start');
                case 'START_PLAYER_TURN_X':
                    return (nextAction.args[0].id === 1);
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
//            log.info('❚❚ Halted after GameState.reset');
//            breakAfterEveryAction = true;
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
        setCommandHotkey('F2','ui.toggleDebugScene');
        setCommandHotkey('F8','gameState.storeSnapshot');
        setCommandHotkey('F10','gameState.loadSnapshot');
        setCommandHotkey('O','gridOverlays.next');
        setCommandHotkey('R','gameState.restartTurn');

        game.debug.reset();
        // DEBUG

        gameUi.debug.attachOverlayRenderer(gameUi.gridOverlays);

        let sceneInterruptedByDebug = null;
        gameUi.debug.addCommand('ui','toggleDebugScene', ()=> {
            
            if (sceneInterruptedByDebug) {
                gameUi.ui.changeSceneNow(sceneInterruptedByDebug);
                log.info("DEBUG OFF: Restored scene "+sceneInterruptedByDebug);
                sceneInterruptedByDebug = null;
            } else {
                sceneInterruptedByDebug = gameUi.ui.scene.name;
                gameUi.ui.changeSceneNow('DEBUG');
                log.info("DEBUG ON: Switched to debug scene");
            }
        });


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
            if (gameSpec.actions.getCurrent() && gameSpec.actions.getCurrent().name ==='AWAIT_PLAYER_INPUT') {
                gameSpec.actions.schedule('AWAIT_PLAYER_INPUT');
            }
            gameState.storeState("konkr_devsnapshot");
            if (debugBreakCallback) {
                debugBreakCallback();
                debugBreakCallback = null;
                breakAfterEveryAction = true;
            }
        });

        gameUi.debug.addCommand('gameState','loadSnapshot', ()=> {
            gameState.loadState("konkr_devsnapshot");
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
        //  Load the Google WebFont Loader script
        game.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');        
    }

    function update() {
        gameUi.scrolling.update();
        gameUi.hexSelectionProxy.update();
        gameUi.grabbedPawn.update();
    }

    function render() {
        gameUi.landSprites.render();
        gameUi.regionBorders.render();
        gameUi.gridOverlays.render();
        gameUi.debug.render();
    }
}

export default Play;