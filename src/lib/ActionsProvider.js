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
    let history = [],
        activeAction = null, // action currently running
        planned = [], // stack of planned actions
        guards = [];  // async function that have to return promise after each action and before 
                      //next action on the stack is started

    function toJSON() {
        return {
            history: history.map(a=>a.toJSON()),
            planned: planned.map(a=>a.toJSON()),
        };
    }

    function fromJSON(src) {
        history = src.history.map(json=>ScheduledAction.fromJSON(json));
        planned = src.planned.map(json=>ScheduledAction.fromJSON(json));
    }

    let handlers = {
        // Special Actions (handled here)
        // will undo all actions until the named action is back on top of the history stack
        'UNDO_UNTIL': null, // (actionName)
    };
    let actionDefs = config.actions;
    actionDefs.UNDO_UNTIL = [];
    let typeDefs = config.types;

    for (const key in actionDefs) {
        handlers[key] = null;
    }
    Object.seal(handlers);

    setHandler("UNDO_UNTIL", (action, targetName) => {
        if (history.find(act=> act.name === 'targetName')) {
            undoAnotherUnlessDone();
        } else {
            return action.reject(`no action of type ${targetName} is in the history stack`);
        }

        function undoAnotherUnlessDone() {
            if (history[history.length-1].name !== targetName) {
                undoLastAction.then(undoAnotherUnlessDone);
            }
        }
        action.resolve();

    });


    function undoLastAction(){
        if (activeAction) throw Error('Cannot issue UNDO while another action is running');
        if (!history.length) throw Error('No action to undo');
        const actionToUndo = history.pop();
        actionToUndo.undo();
        actionToUndo.reschedule();
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
            abortDescendants,
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
            if (!handlers[name]) throw Error(`Missign handler for action ${activeAction.name}`);
            log.debug(`Now running ${name}`);
            handlers[name].handle(self,...args);
        }

        function abortDescendants() {
            for (let i=0; i<self.descendants; ++i) planned.shift();
            self.descendants=0;
        }

        function undo() {
            abortDescendants();
            handlers[name].undo(self,...args);
        }


        // mark the action resolved and enable the planner to move on to the next action on the 
        // stack
        function resolve() {
            if (resolution) throw Error(`Duplicate call of ${self}.resolve()`);
            resolution = 'resolved';
            actionResolved(self);
        }

        // abort this action and allow the scheduler to move on to next action on the stack
        // if any actions scheduled from this action will be aborted as well
        function reject(reason) {
            resolution = 'rejected: '+reason;
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
            return `[${name}(${args})${self.issuer?` issued by ${self.issuer}`:''}${self.canBeUndone()?" ↶":""}]`;
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
        if (!activeAction) {
            planned.unshift(newAction);
            executeNext();
        } else {
            log.debug(`Putting ${newAction} at ${activeAction.descendants}`);
            planned.splice(activeAction.descendants,0,newAction);
            activeAction.descendants++;
        }
        return newAction;
    }

    // aborts all future planned actions (any currently running action will still finish)
    function abortAll() {
        log.debug('Aborting all planed actions');
        planned.length = 0;
    }

    function executeNext(lastAction) {
        if (activeAction) throw Error(`executeNext() called while another action is still active`);
        guards.reduce((previousPromise, guard) => previousPromise.then(() => {
            return guard(lastAction, planned[0]);
        }), Promise.resolve()).then(() => {
            if (!planned.length) return;
            activeAction = planned.shift();
            activeAction.start();
        });
    }

    function actionResolved(action) {
        if (action !== activeAction) throw Error(`Action ${action} was resolved but it should not have been running at all!`);
        if (activeAction.canBeUndone()) {
            log.debug(`Resolved ${activeAction}`);
            history.push(activeAction);
        } else {
            log.debug(`Resolved ${activeAction} (history purged)`);
            history.length=0;
        }
        activeAction = null;
        executeNext(action);
    }

    function actionRejected(action, message) {
        log.warn(`Action ${action} rejected: ${message}`);
        action.abortDescendants();
        activeAction = null;
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

        let lastPrefix = "";

        function buildTree(container, symbol, prefix="", index=0) {
            if (index >= container.length) return "";
            let action = container[index];
            let ret = [];
            ret.push(`${prefix} └─ ${symbol} ${action}`);
            lastPrefix=prefix;
            index++;
            for (var c = 0; c < action.descendants; ++c) {
                ret.push(buildTree(container, symbol, prefix+"   ", index+c));
            }
            if (index+c < container.length) ret.push(buildTree(container, symbol, prefix, index));
            return ret.join('\n');
        }

        const tHistory = buildTree(history,'✓');
        const tCurrent = activeAction ? `▶▶ ${activeAction}` : '▶▶ (idle)';
        const tPlanned = buildTree(planned, '⌛',lastPrefix);

        const tActionTypes = 
            Object.keys(handlers)
                  .map(key => `* ${key} => ${handlers[key] && handlers[key].description}`).sort().join('\n');

        return `${tHistory}
${tCurrent}
${tPlanned}

Registered Handlers:
${tActionTypes}`;
    }
    return actions;
}

export default ActionsProvider;