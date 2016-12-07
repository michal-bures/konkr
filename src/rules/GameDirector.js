import { assertDefined } from 'lib/util';
import async from 'async';

function GameDirector({players, log, actions}) {
    
    let states = [];

    const self = Object.freeze({
        run,
        toString,
        toDebugString
    });

    function run() {
        if (states.length) throw Error("Director already running!");
        states = [];
        players.forEach(player => {
            states.push(callback => actions.execute('UPDATE_ECONOMY', player).then(callback));
            states.push(callback => actions.execute('PLAYER_ACT', player).then(callback));
        });
        async.series(states,(error)=>{
            if (error) throw Error("Error in GameDirector main loop: "+ error);
            states = [];
            run();
        });
    }

    function toString() {
        return `[GameDirector: states ${states}]`;
    }

    function toDebugString() {
/* return `
* States: 
${states.map((state,index)=>((index===currentStateIndex?" -> ":"    ")+state.toString())).join("\n")}
* Pending tasks:
    ${(tasks?tasks.waitingFor.map(task => task.toString()).join('\n    '):'')}`;*/
        return "";
    }

    return self;
}

export default GameDirector;