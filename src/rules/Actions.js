import TaskTracker from 'lib/TaskTracker';
import async from 'async';

function Actions(spec) {
    let {log} = spec;
    let undoStack = [],
        executing = [],
        onAction = new Phaser.Signal(/* taskTracker, name, ...args */);

    const self = {
        execute,
        undoLastAction,
        checkHandlers,
        addHandler,
        toString,
        toDebugString,
        getNamedProxy,
        onAction,
    };

    const handlers = {
        // Handled by Regions
        'CREATE_REGION' : [], 
        'ADD_HEXES_TO_REGION' : [], //hexes, region
        'MODIFY_REGION_TREASURY': [], //region, change

        // Handled by Economy
        'UPDATE_ECONOMY' : [], //player

        // Handled by Players
        'PLAYER_ACT' : [], //player
    };

    Object.seal(handlers);

    function getNamedProxy(name) {
        return {
            execute: (id, ...args) => {
                log.debug(`Action ${id} executed by ${name} with arguments`, ...args);
                return execute(id, ...args);
            },
            addHandler: (actionName, handler) => {
                addHandler(actionName, handler, `${name}`);
            },
            toString: () => '[Actions proxy: '+ name +']'
        };
    }

    // starts executing action and  returns promise
    function execute(name, ...args) {
        log.debug(`Executing ${name}`, ...args);
        return new Promise(resolve=>{
            if (!handlers[name]) throw Error(`Call to unknown action '${name}'`);
            if (!handlers[name].length) throw Error(`Action ${name} has no handlers`);
            var tracker = new TaskTracker(`${name}(${args})`);
            executing.push(tracker);
            async.parallel(handlers[name].map(({handler, description}) => (callback) => {
                let task = tracker.addTask(description);
                handler(()=>{
                    task.done();
                    callback();
                },...args);
            }),()=> {
                log.debug(`Action ${name} finished executing.`);
                executing.splice(executing.indexOf(tracker),1);
                resolve();
            });
        });
    }

    //check that all actions have handlers
    function checkHandlers() {
        let missing = Object.keys(handlers).filter(key => !handlers[key]);
        if (missing.length) log.warning("Some actions lack a handler: "+missing.join(", "));
    }

    function addHandler(actionName, handler, description='anonymous') {
        if (!handlers[actionName]) throw Error(`Invalid action name '${actionName}'`);
        handlers[actionName].push({ handler, description } );
    }

    function undoLastAction() {
        if (!undoStack.length) return false;
        return undoStack.pop().undo(); 
    }

    function toString() {
        return "[Actions manager]";
    }

    function toDebugString() {
        const actionTypes = 
            Object.keys(handlers)
                  .map(key => `* ${key} => ${(handlers[key].length?handlers[key]
                        .map(({description})=>`[${description}]`).join(' ')
                        :"N/A")}`).join("\n");
        const pendingActions = executing.map( tracker => `* ${tracker.toDebugString()}`).join('\n');

        return `Pending Actions:
${pendingActions}

Registered Handlers:
${actionTypes}`;
    }

    // Pending Actions tracking



    return self;
}

export default Actions;