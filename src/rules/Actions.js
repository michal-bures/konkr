


function Actions(spec) {
    let {log} = spec;
    let undoStack = [];

    const self = {
        execute,
        undoLastAction,
        checkHandlers,
        setHandler,
        toString,
        toDebugString,
        getNamedProxy,
    };

    const handlers = {
        // Handled by Regions
        'CREATE_REGION' : null, 
        'ADD_HEXES_TO_REGION' : null, //hexes, region
        'MODIFY_REGION_TREASURY': null, //region, change

        // Handled by Economy
        'UPDATE_ECONOMY' : null, //player

        // Handled by Players
        'PLAYER_PLAY' : null, //player
    };

    let handlerNames = [];

    Object.seal(handlers);

    function getNamedProxy(name) {
        return {
            execute: (id, ...args) => {
                log.debug(`Action ${id} executed by ${name} with arguments`, ...args);
                execute(id, ...args);
            },
            setHandler: (actionName, handler) => {
                setHandler(actionName, handler);
                handlerNames[actionName] = name;
            },
            toString: () => '[Actions proxy: '+ name +']'
        };
    }


    function execute(id, ...args) {
        if (handlers[id]===null) throw Error(`Action ${id} has no handler`);
        if (handlers[id]===undefined) throw Error(`Call to unknown action '${id}'`);
        handlers[id](...args);
    }

    //check that all actions have handlers
    function checkHandlers() {
        let missing = Object.keys(handlers).filter(key => !handlers[key]);
        if (missing.length) log.warning("Some actions lack a handler: "+missing.join(", "));
    }

    function setHandler(actionName, handler) {
        if (handlers[actionName]) throw Error(`Action ${actionName} already has a handler assigned`);
        if (handlers[actionName]===undefined) throw Error(`Invalid action name '${actionName}'`);
        handlers[actionName] = handler;
    }

    function undoLastAction() {
        if (!undoStack.length) return false;
        return undoStack.pop().undo(); 
    }

    function toString() {
        return "[Actions manager]";
    }

    function toDebugString() {
        return Object.keys(handlers).map(key => `* ${key} => ${handlerNames[key] || (handlers[key]?"(anonymous function)":"N/A")}`).join("\n");
    }

    return self;
}

export default Actions;