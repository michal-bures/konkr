import { assertDefined } from 'lib/util';
import async from 'async';

function GameDirector({players, log, actions}) {
    
    let states = [];

    const self = Object.freeze({
        begin,
        toString,
        toDebugString
    });

    function begin({worldWidth, worldHeight, numFactions}) {
        if (states.length) throw Error("Director already running!");
        actions.execute('RESET_WORLD',worldWidth,worldHeight)
               .then(actions.create('GENERATE_LANDMASS'))
               .then(actions.create('RANDOMIZE_REGIONS', numFactions))
               .then(actions.create('SET_INITIAL_TREASURY'))
               .then(normalGameLoop);
    }

    function normalGameLoop() {
        states = [];
        players.forEach(player => {
            states.push(actions.create('UPDATE_ECONOMY', player));
            states.push(actions.create('PLAYER_ACT', player));
        });

        states.reduce((previous, next) => previous().then(next)).then(normalGameLoop);
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