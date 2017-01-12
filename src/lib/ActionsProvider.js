const VALIDATE_ARGUMENTS = true; // validate argument values of every action call? (slower but detects errors)

const MAX_HISTORY_SIZE=200; // don't keep undo history for more than the specified number of actions

function ActionsProvider(spec, providerName, config) {
    let {log, debug} = spec;

    // public
    const actions = {
        attachGuard,
        setHandler,
        schedule,
        undoLastAction,
        undoUntil,
        checkHandlers,
        abortAll,
        toString, 
        toDebugString,
        getNamedProxy,
        getLast,
        getCurrent,
        getNext,
        toJSON,
        fromJSON
    };

    // private
    let actionQueue = [], // queue of future and past actions
        actionPointer = 0, // current position in the queue
        actionRunning = false, // whether the action currently pointed to by actionPointer is already running
        guards = [],  // async function that have to return promise after each action and before 
                      //next action on the stack is started
        pendingGuardPromises = [];

    function toJSON() {
        // note: cannot store undo history, because some actions in it could refer to objects that will
        //       no longer exist after load
        return {
            queue: actionQueue.slice(actionRunning?actionPointer+1:actionPointer).map(a=>a.toJSON()),
            at: 0,            
        };
    }

    function fromJSON(src) {
        if (actionRunning) {
            //cancel current action
            actionQueue[actionPointer].abort();
        }

        pendingGuardPromises = [];
        actionQueue = src.queue.map(json=>ScheduledAction.fromJSON(json));
        actionPointer = src.at;
        actionRunning = false;
        executeNext();
    }

    function currentAction() {
        if (!actionRunning) return null;
        return actionQueue[actionPointer];
    }

    function getNext() {
        return actionQueue[actionPointer+1] || null;
    }
    function getCurrent() {
        return actionQueue[actionPointer] || null;
    }
    function getLast() {
        return actionQueue[actionPointer-1] || null;
    }

    let handlers = {};
    let actionDefs = config.actions;
    let typeDefs = config.types;

    for (const key in actionDefs) {
        handlers[key] = null;
    }
    Object.seal(handlers);

    function undoLastAction(){
        _undoLast();
        executeNext();
    }

    function _undoLast() {
        if (actionPointer===0) throw Error('No action left to undo');
        let undoPointer = actionRunning?actionPointer:actionPointer-1;

        let actionToUndo = actionQueue[undoPointer];
        actionQueue.splice(undoPointer+1,actionToUndo.descendants);
        actionToUndo.descendants=0;
        if (!actionToUndo.canBeUndone()) throw Error(`${actionToUndo} does not support undo`);
        actionToUndo.undo();
        if (actionRunning) {
            actionRunning = false;
        } else {
            --actionPointer;
        }
    }

    function undoUntil(actionName) {
        if (!actionQueue.slice(0,actionPointer).some(action=>action.name===actionName)) {
            log.warn("No action left to undo");
            return;
        } 
        if (actionRunning) _undoLast();
        _undoLast();
        while (actionQueue[actionPointer].name !== actionName) {
            _undoLast();
        }
        executeNext();
    }


    function Guard(title, guardFunc) {
        return Object.freeze({
            get title() { return title; },
            run(...args) { return guardFunc(...args); }
        });
    }

    function attachGuard(title, guardFunc) {
        const g = new Guard(title,guardFunc);
        guards.push(g);
        return {
            detach() {
                guards.splice(guards.indexOf(g),1);
            }
        };
    }

    function ScheduledAction (name, ...args) {
        let processing = false,
            resolution = null;

        const self = Object.seal({
            abort,
            schedule,
            reschedule,
            start,
            resolve,
            reject,
            undo,
            toJSON,
            get args() { return args; },
            get name() { return name; },
            toString,
            descendants: 0,
            data: {}, // auxiliary data that can be assigned by handlers, useful for storing information needed for undo
            issuer:null,            
            canBeUndone() { return isDummy() || (!!handlers[name] && handlers[name].undo); },
            canAbort() { return !!handlers[name] && handlers[name].abort; },
        });

        if (!isDummy && args.length != actionDefs[name].length) {
            throw Error(`${self} called with ${args.length} arguments (expected ${actionDefs[name].length})`);
        }

        if (VALIDATE_ARGUMENTS) {
            args.forEach((arg, index) => {
                if (arg === null) return;
                const expectedType = actionDefs[name][index];
                if (!typeDefs[expectedType].validate(arg)) {
                    log.warn(`${self} validation failed on argument #${index+1}: ${arg} does not appear to be of type ${expectedType}`);
                }
            });
        }

        // pushes another action on top of the scheduler stack; it will be excuted as soon as this
        // action is resolved
        function schedule(actionName, ...args) {
            let a = actions.schedule(actionName, ...args);
            a.issuer = name;
        }

        // schedule another instance of this action
        function reschedule() {
            let a = actions.schedule(name, ...args);
            a.issuer = name;
        }

        // returns true if this is just a dummy marker action
        function isDummy() {
            return actionDefs[name] === null;
        }

        function start() {
            if (resolution) throw Error(`Attempt to restart action that is already done. (${self})`);
            if (processing) throw Error(`Attempt to restart action that is already running. (${self})`);
            processing = true;
            log.debug(`Now running ${self}`);

            if (isDummy()) { //dummy marker action
                self.resolve();
            } else {
                if (!handlers[name]) throw Error(`Missign handler for action ${name}`);
                handlers[name].handle(self,...args);
            }
        }

        function undo() {
            if (!isDummy()) {
                handlers[name].undo(self,...args);
            }
            log.debug(`Undone ${self}`);
            resolution = null;
            processing = false;
        }

        // mark the action resolved and enable the planner to move on to the next action on the 
        // stack
        function resolve() {
            processing = false;
            if (resolution === 'aborted') return;
            if (resolution) throw Error(`Duplicate call of ${self}.resolve()`);
            resolution = 'resolved';
            actionResolved(self);
        }

        // abort this action and allow the scheduler to move on to next action on the stack
        // if any actions scheduled from this action will be aborted as well
        function reject(reason) {
            resolution = 'rejected: '+reason;
            processing = false;
            actionRejected(self, reason);
        }

        function toJSON() {
            log.trace(`converting ${self} to JSON`);
            return {
                name,
                descendants: self.descendants,
                args:[].concat(args).map((arg, index)=>{
                    if (arg === null) return null;
                    return typeDefs[actionDefs[name][index]].toJSON(arg);
                })
            };
        }

        // abort the action (discards any future resolved() callbacks)
        function abort() {
            resolution = 'aborted';
            processing = false;
        }

        function toString() {
            return `[${name}(${args})${self.issuer?` issued by ${self.issuer}`:''}${self.canBeUndone()?"(↶)":""}]`;
        }

        return self;
    }
    ScheduledAction.fromJSON = function(data) {
        const actionDef = actionDefs[data.name];
        let args = data.args.map((arg, i)=> typeDefs[actionDef[i]].fromJSON(arg));
        let a = ScheduledAction.apply(null,[data.name].concat(args));
        a.descendants = data.descendants;
        return a;
    };

    function getNamedProxy(name) {
        return {
            schedule: (id, ...args) => {
                return schedule(id, ...args);
            },
            setHandler: (actionName, handler, config={}) => {
                config.description = `${name}${config.description?': '+config.description:''}`;
                setHandler(actionName, handler, config);
            },
            toString: () => '[Actions proxy: '+ name +']'
        };
    }

    // plans action for execution and returns it
    function schedule(id, ...args) {
        if (handlers[id]===undefined) throw Error(`Call to unknown action '${id}'`);
        const newAction = new ScheduledAction(id, ...args);
        //log.debug(`Scheduled ${newAction})`);
        if (!actionRunning) {
            actionQueue.splice(actionPointer,0,newAction);
            executeNext();
            if (actionQueue[actionPointer-1]) {
                actionQueue[actionPointer-1].descendants++;
            }
        } else {
            actionQueue.splice(actionPointer+currentAction().descendants+1,0,newAction);
            currentAction().descendants++;
        }
        return newAction;
    }

    // aborts all future planned actions (any currently running action will still finish)
    function abortAll() {
        log.debug('Aborting all planed actions');
        actionQueue.splice(actionPointer+(actionRunning?1:0));
    }

    function executeNext(lastAction) {
        if (actionRunning) throw Error(`executeNext() called while another action is still active`);

        if (actionPointer === actionQueue.length) return;

        guards.forEach(guard => {
            let p = guard.run(lastAction,actionQueue[actionPointer]);
            const record = {title:guard.title, promise: p};
            pendingGuardPromises.push(record);
            p.then(()=>{
                let i = pendingGuardPromises.indexOf(record);
                if (i<0) return;
                pendingGuardPromises.splice(i,1);
                if (!pendingGuardPromises.length) doExecuteNext();
            });
        });

        function doExecuteNext() {
            if (actionPointer>MAX_HISTORY_SIZE+2) {
                actionQueue.shift();
                --actionPointer;
            }
            log.trace("All guards passed");
            if (actionPointer === actionQueue.length) return;
            actionRunning = true;
            actionQueue[actionPointer].start();
        }
    }

    function actionResolved(action) {
        if (action !== currentAction()) throw Error(`Action ${action} was resolved but it should not have been running at all!`);
        if (action.canBeUndone()) {
            //log.debug(`Resolved ${action}`);
            ++actionPointer;
        } else {
            //log.debug(`Resolved ${action} (history purged)`);
            actionQueue.splice(0, actionPointer+1);
            actionPointer=0;
        }
        actionRunning = false;
        executeNext(action);
    }

    function actionRejected(action, message) {
        if (action !== currentAction()) throw Error(`Action ${action} was rejected but it should not have been running at all!`);
        log.warn(`Action ${action} rejected: ${message}`);
        actionQueue.splice(actionPointer,action.descendants+1);
        action.descendants=0;
        actionRunning = false;
        executeNext(action);
    }

    //check that all actions have handlers
    function checkHandlers() {
        Object.keys(handlers).forEach(key => {
            if (actionDefs[key] !== null) {
                if (!handlers[key]) log.warn(`Action ${key} has no handler assigned.`);
                actionDefs[key].forEach(arg=> {
                    if (!typeDefs[arg]) throw Error(`Action ${key} uses unrecognized argument type '${arg}' `);
                });
            }
        });
    }

    function setHandler(actionName, handle, config={}) {
        if (handlers[actionName] === undefined) throw Error(`Invalid action name '${actionName}'`);
        if (handlers[actionName]) throw Error(`Action '${actionName}' is already handled by '${handlers[actionName].description}' - cannot assign to '${config.description}'`);
        handlers[actionName] = { 
            handle, 
            description: config.description, 
            undo: config.undo,
            abort: config.abort,
        };
    }

    function toString() {
        return `[ActionsProvider ${providerName}]`;
    }

    function toDebugString() {

        let ptr = Math.max(0, actionPointer-5);
        let treeAnnotation="";

        if (pendingGuardPromises.length) {
            treeAnnotation+=`<b>Paused on ${pendingGuardPromises.length} guards:</b>
${pendingGuardPromises.map(({title})=>` * ${title}`).join('\n')}\n
`;  

        } 
        if (ptr!==0) {
            treeAnnotation=`  ✓ <i>(${ptr} more undoable actions)</i>\n`;
        }

        function buildTree(prefix="", rootLevel=true) {
            if (ptr >= actionQueue.length) return "";
            let action = actionQueue[ptr];
            let ret = [];
            ret.push(`${prefix} ${rootLevel?"":" └─"} ${symbol(ptr)} ${action}`);
            ptr++;
            for (var c = 0; c < action.descendants; ++c) {
                ret.push(buildTree(prefix+"   ", false));
            }
            if (rootLevel && ptr < actionQueue.length) ret.push(buildTree(prefix));
            return ret.join('\n');
        }

        function symbol(i) {
            if (i < actionPointer) {
                return '✓';
            } else if (i > actionPointer) {
                return '⌛';
            } else if (actionRunning) {
                return '⏵';
            } else {
                return '⏸';
            }
        }

        const tActionTypes = 
            Object.keys(handlers)
                  .map(key => `* ${key} => ${handlers[key] && handlers[key].description}`).sort().join('\n');

        return `
${treeAnnotation}${buildTree()}

Registered Handlers:
${tActionTypes}`;
    }
    return actions;
}

export default ActionsProvider;