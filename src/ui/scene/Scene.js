function Scene(spec, cfg) {
    
    let { 
        name,
        uiElements,
        preActionGuards=[],
        postActionGuards=[],
        bindSignals=[],
    } = cfg;


    let signalBindings = [];

    return {
        setup,
        teardown,
        interrupt,
        preActionGuards,
        postActionGuards,
        uiElements,
        get name() { return name; },
        toString() { return `[Scene ${name}]`;},
        toDebugString
    };

    function setup() {
        Object.keys(bindSignals).forEach(moduleName=> {
            Object.keys(bindSignals[moduleName]).forEach(signalName=>{
                signalBindings.push(spec[moduleName][signalName]
                    .add(bindSignals[moduleName][signalName]));
            });
        });
    }

    function interrupt() {
        purgeSignalBindings();
        // TODO: Stop tweens
    }

    function purgeSignalBindings() {
        signalBindings.forEach(binding=>binding.detach());
        signalBindings=[];
    }

    function teardown() {
        purgeSignalBindings();
        return Promise.resolve();
    }

    function toDebugString() {
        return `
[${name}]
bound to ${signalBindings.length} signals`;
    }
}

// Instances
import FastSpectating from './FastSpectating';
import InstantSpectating from './InstantSpectating';
import PlayerTurn from './PlayerTurn';

Scene.InstantSpectating = InstantSpectating;
Scene.FastSpectating = FastSpectating;
Scene.PlayerTurn = PlayerTurn;

export default Scene;