function ActionsProvider(spec, providerName, actionList) {
    let {log} = spec;
    let history = [],
        activeAction = null, // action currently running
        onAction = new Phaser.Signal(/* taskTracker, name, ...args */),
        scheduledByCurrentAction = [], // actions added during the exectuion of the current action
        planned = [], // stack of planned actions
        guards = [];  // async function that have to return promise after each action and before 
                      //next action on the stack is started

    const actions = {
        attachGuard,
        setHandler,
        schedule,
        undoLastAction,
        checkHandlers,
        toString, 
        toDebugString,
        getNamedProxy,
        onAction,
    };

    let handlers = {
        // Special Actions (handled here)
        // will undo all actions until the named action is back on top of the history stack
        'UNDO_UNTIL': null, // (actionName)
    };

    actionList.forEach(action => handlers[action] = null);

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
    });

    function attachGuard(guardFunc) {
        guards.push(guardFunc);
    }

    function ScheduledAction (name, ...args) {
        let undoFunc = null,
            processing = false,
            resolution = null;

        const self = Object.seal({
            schedule,
            start,
            resolve,
            reject,
            enableUndo,
            get name() { return name; },
            toString,
            issuer:null,            
            canBeUndone() { return !!undoFunc; }
        });

        // pushes another action on top of the scheduler stack; it will be excuted as soon as this
        // action is resolved
        function schedule(actionName, ...args) {
            let a = actions.schedule(actionName, ...args);
            a.issuer = name;
        }

        function start() {
            if (resolution) throw Error(`Attempt to restart action that is already done.`);
            if (processing) throw Error(`Attempt to restart action that is already running.`);
            processing = true;
            if (!handlers[name]) throw Error(`Missign handler for action ${activeAction.name}`);
            log.debug(`Now running ${activeAction}`);
            handlers[activeAction.name].handle(self,...args);
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

        function enableUndo(func) {
            undoFunc = func;
        }

        function toString() {
            return `[${name}(${args})${self.issuer?` issued by ${self.issuer}`:''}]`;
        }

        return self;
    }

    function getNamedProxy(name) {
        return {
            schedule: (id, ...args) => {
                return schedule(id, ...args);
            },
            setHandler: (actionName, handler, comment) => {
                setHandler(actionName, handler, `${name}${comment?': '+comment:''}`);
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
            planned.push(newAction);
            executeNext();
        } else {
            scheduledByCurrentAction.push(newAction);
        }
        return newAction;
    }

    function executeNext(lastAction) {
        if (activeAction) throw Error(`executeNext() called while another action is still active`);
        while (scheduledByCurrentAction.length) {
            planned.unshift(scheduledByCurrentAction.pop());
        }
        if (!planned.length) return;

        guards.reduce((previousPromise, guard) => previousPromise.then(() => {
            return guard(lastAction, planned[0]);
        }), Promise.resolve()).then(() => {
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
        if (scheduledByCurrentAction.length) {
            log.debug(`Unscheduled ${scheduledByCurrentAction.length} dependent action(s)`);
            scheduledByCurrentAction.length=0;
        }
        activeAction = null;
        executeNext(action);
    }

    //check that all actions have handlers
    function checkHandlers() {
        let missing = Object.keys(handlers).filter(key => handlers[key]===undefined);
        if (missing.length) log.warn("Some actions lack a handler: "+missing.join(", "));
    }

    function setHandler(actionName, handle, description='anonymous') {
        if (handlers[actionName] === undefined) throw Error(`Invalid action name '${actionName}'`);
        if (handlers[actionName]) throw Error(`Action '${actionName}' is already handled by '${handlers[actionName].description}' - cannot assign to '${description}'`);
        handlers[actionName] = { handle, description };
    }

    function undoLastAction() {
        if (!history.length) throw Error(`History is empty`);
        let a = history.pop();
        let promise = a.undo(); 
        if (!promise.then) throw Error(`${a}.undo() did not return a promise`);
        return promise;
    }

    function toString() {
        return `[ActionsProvider ${providerName}]`;
    }

    function toDebugString() {
        const tHistory = history.map(action => ` ✓ ${action}`).join('\n');
        const tCurrent = activeAction ? `▶▶ ${activeAction}` : '▶▶ (idle)';
        const tPrePlanned = scheduledByCurrentAction.map(action => ` └─ ⌛ ${action}`).join('\n');
        const tPlanned = planned.map(action => ` ⌛ ${action}`).join('\n');
        const tActionTypes = 
            Object.keys(handlers)
                  .map(key => `* ${key} => ${handlers[key].description}`).sort().join('\n');

        return `${tHistory}
${tCurrent}
${tPrePlanned}
${tPlanned}

Registered Handlers:
${tActionTypes}`;
    }

    return actions;
}

export default ActionsProvider;