function Scene(spec, cfg) {
    
    let { 
        name,
        uiElements,
        preActionGuards=[],
        postActionGuards=[],
        bindSignals=[],
        regionSelectFilter,
    } = cfg;


    let signalBindings = [];

    return {
        setup,
        teardown,
        interrupt,
        preActionGuards,
        postActionGuards,
        regionSelectFilter,
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
import LocalPlayerTurn from './LocalPlayerTurn';
import Debug from './Debug';

Scene.InstantSpectating = InstantSpectating;
Scene.FastSpectating = FastSpectating;
Scene.LocalPlayerTurn = LocalPlayerTurn;
Scene.Debug = Debug;

export default Scene;