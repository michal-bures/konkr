function GameDirector({players, log}) {
    
    let //onBeforeState(tasks, currentState, nextState)
        onBeforeStateChange = new Phaser.Signal(), 
        //onStateChange(?)
        onStateChange = new Phaser.Signal(),
        currentStateIndex = -1,
        tasks = null,
        states = [];

    const self = Object.freeze({
        run,
        toString,
        toDebugString,
        onBeforeStateChange,
        onStateChange
    });

    function run() {
        if (tasks) throw Error("Director already running!");
        states = [];
        players.forEach(player => {
            states.push(new EconomyUpdate(player));
            states.push(new PlayersTurn(player));
        });
        nextState();
    }

    function nextState() {
        tasks = new TaskTracker();

        const currentState = states[currentStateIndex];
        const newState = states[(currentStateIndex+1) % states.length];

        if (currentState) {
            log.debug(`leaving state ${currentState}`);
            onBeforeStateChange.dispatch(tasks.addTask.bind(tasks), currentState, newState);
        }
        tasks.onResolved(() => {
            currentStateIndex = (currentStateIndex+1) % states.length;
            log.debug(`now in state ${newState}`);
            tasks = new TaskTracker();
            onStateChange.dispatch(tasks.addTask.bind(tasks), newState);
            tasks.onResolved(nextState);
        });
    }

    function toString() {
        if (!tasks) return "[GameDirector (not active)]";
        return `[GameDirector: state ${states[currentStateIndex]}, tasks ${tasks}]`;
    }

    function toDebugString() {
 return `
* States: 
${states.map((state,index)=>((index===currentStateIndex?" -> ":"    ")+state.toString())).join("\n")}
* Pending tasks:
    ${(tasks?tasks.waitingFor.map(task => task.toString()).join('\n    '):'')}`;
    }

    class State {
        constructor(type,name) {
            this.name = name;
            this.type = type;
        }

        toString() {
            return `[State ${this.type}${this.name?'/'+this.name:''}]`;
        }
    }

    class PlayersTurn extends State {
        constructor(player) {
            super("PLAYERS_TURN",player.name);
        }
    }

    class EconomyUpdate extends State {
        constructor(player) {
            super("ECONOMY_UPDATE", player.name);
        }
    }

    class TaskTracker {
        constructor() {
            this.waitingFor = [];
            this.resolvedCallback = null;
        }

        onResolved(func) {
            if (this.resolvedCallback) throw Error("Callback already defined");
            this.resolvedCallback = func;
            this.checkIfResolved();
        }

        checkIfResolved() {
            if (!this.resolvedCallback) return;
            if (!this.waitingFor.length) {
                this.resolvedCallback();
                this.resolvedCallback = null;
            }
        }

        addTask(issuer, description) {
            let promise = {
                issuer: issuer,
                description: description,
                done : () => { 
                    this.waitingFor.splice(this.waitingFor.indexOf(promise),1);
                    this.checkIfResolved();
                },
                toString: () => `[TaskRegistration by ${issuer} ("${description}")]`
            };
            this.waitingFor.push(promise);
            return promise;
        }

        toString() {
            return `[TaskTracker (${(this.waitingFor.length?this.waitingFor.length+' waiting':'closed')}))]`;
        }

        toDebugString() {
            return `${this}\nTasks: ${this.waitingFor.map(promise => promise.toString()).join(", ")}`;
        }
    }


    return self;
}

export default GameDirector;