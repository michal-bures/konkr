function GameDirector({players, log}) {
    
    let //onBeforeState(rfc, currentState, nextState)
        onBeforeStateChange = new Phaser.Signal(), 
        //onStateChange(?)
        onStateChange = new Phaser.Signal(),
        currentStateIndex = -1,
        rfc = null,
        states = [];

    const self = Object.freeze({
        run,
        toString,
        debugInfo,
        onBeforeStateChange,
        onStateChange
    });

    function run() {
        if (rfc) throw Error("Director already running!");
        states = [];
        players.forEach(player => {
            states.push(new EconomyUpdate(player));
            states.push(new PlayersTurn(player));
        });
        nextState();
    }

    function nextState() {
        rfc = new RequestForComments();

        const currentState = states[currentStateIndex];
        const newState = states[(currentStateIndex+1) % states.length];

        if (currentState) {
            log.debug(`leaving state ${currentState}`);
            onBeforeStateChange.dispatch(rfc, currentState, newState);
        }
        rfc.onResolved(() => {
            currentStateIndex = (currentStateIndex+1) % states.length;
            log.debug(`now in state ${newState}`);
            rfc = new RequestForComments();
            onStateChange.dispatch(rfc, newState);
            rfc.onResolved(nextState);
        });
    }

    function toString() {
        if (!rfc) return "[GameDirector (not active)]";
        return `[GameDirector: state ${states[currentStateIndex]}, rfc ${rfc}]`;
    }

    function debugInfo() {
        log.debug(this.toString());
        if (rfc) rfc.debugInfo();
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

    class RequestForComments {
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
                log.debug(this.resolvedCallback);
                this.resolvedCallback();
                this.resolvedCallback = null;
            }
        }

        waitFor(issuer, description) {
            let promise = {
                issuer: issuer,
                description: description,
                done : () => { 
                    this.waitingFor.splice(this.waitingFor.indexOf(promise),1);
                    this.checkIfResolved();
                }
            };
            this.waitingFor.push(promise);
            return promise;
        }

        toString() {
            return `[RFC (${(this.waitingFor.length?this.waitingFor.length+' waiting':'closed')}))]`;
        }

        debugInfo() {
            log.debug(this.toString());
            this.waitingFor.forEach(promise => log.debug(promise));
        }
    }


    return self;
}

export default GameDirector;