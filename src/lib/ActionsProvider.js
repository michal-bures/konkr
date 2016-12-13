const VALIDATE_ARGUMENTS = true; // validate argument values of every action call? (slower but detects errors)


function ActionsProvider(spec, providerName, config) {
    let {log, debug} = spec;

    // public
    const actions = {
        attachGuard,
        setHandler,
        schedule,
        undoLastAction,
        checkHandlers,
        abortAll,
        toString, 
        toDebugString,
        getNamedProxy,
        toJSON,
        fromJSON
    };

    // private
    let actionQueue = [], // queue of future and past actions
        actionPointer = 0, // current position in the queue
        actionRunning = false, // whether the action currently pointed to by actionPointer is already running
        guards = [];  // async function that have to return promise after each action and before 
                      //next action on the stack is started

    function toJSON() {
        if (actionRunning) log.warn(`Unsafe serialization while ${currentAction()} is executing.`);
        return {
            queue: actionQueue.slice(actionRunning?1:0).map(a=>a.toJSON()),
            at: actionPointer,            
        };
    }

    function fromJSON(src) {
        actionQueue = src.queue.map(json=>ScheduledAction.fromJSON(json));
        actionPointer = src.at;
        actionRunning = false;
        executeNext();
    }

    function currentAction() {
        if (!actionRunning) return null;
        return actionQueue[actionPointer];
    }

    let handlers = {};
    let actionDefs = config.actions;
    let typeDefs = config.types;

    for (const key in actionDefs) {
        handlers[key] = null;
    }
    Object.seal(handlers);

    function undoLastAction(){
        if (actionRunning) throw Error('Cannot issue UNDO while another action is running');
        if (actionPointer===0) throw Error('No action left to undo');
        let actionToUndo = actionQueue[actionPointer-1];
        actionQueue.splice(actionPointer,actionToUndo.descendants);
        actionToUndo.undo();
        --actionPointer;
    }

    function attachGuard(guardFunc) {
        guards.push(guardFunc);
        return {
            detach() {
                guards.splice(guards.indexOf(guardFunc),1);
            }
        };
    }

    function ScheduledAction (name, ...args) {
        let processing = false,
            resolution = null;

        const self = Object.seal({
            schedule,
            reschedule,
            start,
            resolve,
            reject,
            undo,
            toJSON,
            get name() { return name; },
            toString,
            descendants: 0,
            issuer:null,            
            canBeUndone() { return !!handlers[name].undo; }
        });

        if (args.length != actionDefs[name].length) {
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

        function start() {
            if (resolution) throw Error(`Attempt to restart action that is already done.`);
            if (processing) throw Error(`Attempt to restart action that is already running.`);
            processing = true;
            if (!handlers[name]) throw Error(`Missign handler for action ${name}`);
            log.debug(`Now running ${name}`);
            handlers[name].handle(self,...args);
        }

        function undo() {
            handlers[name].undo(self,...args);
            resolution = null;
        }


        // mark the action resolved and enable the planner to move on to the next action on the 
        // stack
        function resolve() {
            if (resolution) throw Error(`Duplicate call of ${self}.resolve()`);
            resolution = 'resolved';
            processing = false;
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
            log.debug(`converting ${self} to JSON`);
            return {
                name,
                descendants: self.descendants,
                args:[].concat(args).map((arg, index)=>{
                    if (arg === null) return null;
                    return typeDefs[actionDefs[name][index]].toJSON(arg);
                })
            };
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
        log.debug(`Scheduled ${newAction})`);
        if (!actionRunning) {
            actionQueue.splice(actionPointer,0,newAction);
            executeNext();
        } else {
            log.debug(`Putting ${newAction} at ${actionPointer + currentAction().descendants+1}`);
            actionQueue.splice(actionPointer+currentAction().descendants+1,0,newAction);
            currentAction().descendants++;
        }
        return newAction;
    }

    // aborts all future planned actions (any currently running action will still finish)
    function abortAll() {
        log.debug('Aborting all planed actions');
        actionQueue.splice(actionPointer+(actionRunning?1:0));
        actionPointer=0;
    }

    function executeNext(lastAction) {
        if (actionRunning) throw Error(`executeNext() called while another action is still active`);
        guards.reduce((previousPromise, guard) => previousPromise.then(() => {
            return guard(lastAction, actionQueue[actionPointer]);
        }), Promise.resolve()).then(() => {
            if (actionPointer === actionQueue.length) return;
            actionRunning = true;
            actionQueue[actionPointer].start();
        });
    }

    function actionResolved(action) {
        if (action !== currentAction()) throw Error(`Action ${action} was resolved but it should not have been running at all!`);
        if (action.canBeUndone()) {
            log.debug(`Resolved ${action}`);
            ++actionPointer;
        } else {
            log.debug(`Resolved ${action} (history purged)`);
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
            if (!handlers[key]) log.warn(`Action ${key} has no handler assigned.`);
            actionDefs[key].forEach(arg=> {
                if (!typeDefs[arg]) throw Error(`Action ${key} uses unrecognized argument type '${arg}' `);
            });
        });
    }

    function setHandler(actionName, handle, config={}) {
        if (handlers[actionName] === undefined) throw Error(`Invalid action name '${actionName}'`);
        if (handlers[actionName]) throw Error(`Action '${actionName}' is already handled by '${handlers[actionName].description}' - cannot assign to '${config.description}'`);
        handlers[actionName] = { handle, description: config.description, undo: config.undo };
    }

    function toString() {
        return `[ActionsProvider ${providerName}]`;
    }

    function toDebugString() {

        function buildTree(prefix="", index=0, rootLevel=true) {
            if (index >= actionQueue.length) return "";
            let action = actionQueue[index];
            let ret = [];
            ret.push(`${prefix} ${rootLevel?"":" └─"} ${symbol(index)} ${action}`);
            index++;
            for (var c = 0; c < action.descendants; ++c) {
                ret.push(buildTree(prefix+"   ", index+c, false));
            }
            if (rootLevel && index+c < actionQueue.length) ret.push(buildTree(prefix, index+c));
            return ret.join('\n');
        }

        function symbol(i) {
            if (i < actionPointer) {
                return '✓';
            } else if (i > actionPointer) {
                return '⌛';
            } else if (actionRunning) {
                return '▶▶';
            } else {
                return '⏸▶';
            }
        }
/*
        const tQueue = actionQueue.map((action,i)=> {
            return ` ${actionSymbol(i)} ${action}`;
        }).join('\n');*/

        const tActionTypes = 
            Object.keys(handlers)
                  .map(key => `* ${key} => ${handlers[key] && handlers[key].description}`).sort().join('\n');

        return `${buildTree()}

Registered Handlers:
${tActionTypes}`;
    }
    return actions;
}

export default ActionsProvider;