import TaskTracker from 'lib/TaskTracker';
import async from 'async';

function Actions(spec) {
    let {log} = spec;
    let undoStack = [],
        executing = [],
        onAction = new Phaser.Signal(/* taskTracker, name, ...args */);

    const self = {
        execute,
        create,
        undoLastAction,
        checkHandlers,
        addHandler,
        toString,
        toDebugString,
        getNamedProxy,
        onAction,
    };

    const handlers = {
        // Handled by multiple
        'RESET_WORLD' : [],

        // Handled by WorldGenerator
        'GENERATE_LANDMASS': [], // (width, height)

        // Handled by Regions
        'CAPTURE_HEXES': [], // (hexes, region)
        'RANDOMIZE_REGIONS' :[],
        'CHANGE_REGION_CAPITAL': [], // (region, hex, previousHex)

        // Handled by Economy
        'UPDATE_ECONOMY' : [], // (player)
        'SET_INITIAL_TREASURY' : [], // ... reset treasury for all region in the world to an initial value based on size
        'CHANGE_REGION_TREASURY' : [], // (region, amount)
        'BUY_UNIT' : [], // (unitType, hex)

        // Handled by Pawns
        'CREATE_PAWN' : [], // (pawnType, hex)
        'DESTROY_PAWN' : [], // (pawn)
        'MOVE_PAWN' : [], // (pawn, hex)

        // Handled by Players
        'PLAYER_ACT' : [], // (player)
    };

    Object.seal(handlers);

    function create(actionName, ...args) {
        return () => {
            return execute(actionName, ...args);
        };        
    }

    function getNamedProxy(name) {
        return {
            execute: (id, ...args) => {
                return execute(id, ...args);
            },
            create: self.create,
            addHandler: (actionName, handler, comment) => {
                addHandler(actionName, handler, `${name}${comment?': '+comment:''}`);
            },
            toString: () => '[Actions proxy: '+ name +']'
        };
    }

    // starts executing action and  returns promise
    function execute(id, ...args) {
        log.debug(`Executing ${id}`, ...args);
        return new Promise(resolve=>{
            if (!handlers[id]) throw Error(`Call to unknown action '${id}'`);
            if (!handlers[id].length) throw Error(`Action ${id} has no handlers`);
            var tracker = new TaskTracker(`${id}(${args})`);
            executing.push(tracker);
            async.parallel(handlers[id].map(({handler, description}) => (callback) => {
                let task = tracker.addTask(description);
                handler(()=>{
                    task.done();
                    callback();
                },...args);
            }),()=> {
                log.debug(`Action ${id} finished executing.`);
                executing.splice(executing.indexOf(tracker),1);
                resolve();
            });
        });
    }

    //check that all actions have handlers
    function checkHandlers() {
        let missing = Object.keys(handlers).filter(key => !handlers[key].length);
        if (missing.length) log.warn("Some actions lack a handler: "+missing.join(", "));
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
                        :"N/A")}`).sort().join("\n");
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