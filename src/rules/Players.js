import IterableOn from 'lib/decorators/IterableOn';
import { PawnType } from 'rules/Pawns';
import async from 'async';

function Players(spec) {

    let { actions, log, economy, pawns, regions, warfare } = spec;

    class Player {
        constructor(name) {
            this.name = name;
        }

        get controlledRegions() {
            return getRegionsControlledBy(this);
        }

        play(callback) {
            callback();
        }

        toString() {
            return `[Player ${this.name}]`;
        }
    }

    class GlobalRegionAI extends Player {
        constructor() {
            super("GlobalRegionAI");
        }

        play(callback) {
            getRegionsControlledBy(this).reduce((prevPromise, region) => {
                return prevPromise.then(this.RegionAI(region).play);
            },Promise.resolve())
            .then(callback);
        }

        RegionAI(region) {
            let availableUnits = [];
            let availableHexes = [];

            return Object.freeze({
                play
            });

            function play() {
                log.debug(`Evaluating region ${region}`);
                return buyUnits().then(refreshAvailUnits).then(attack);
            }            

            function refreshAvailUnits() {
                return new Promise(resolve => {
                    availableUnits = pawns.select({
                        hexes:region.hexes,
                        type:PawnType.TROOP_1
                    });
                    resolve();
                });
            }

            function attack() {
                return new Promise(resolve=>{
                    if (!availableUnits.length) return resolve();
                    //TODO dont recalculate on every call
                    availableHexes = region.hexes.neighbours().filter(hex => warfare.defenseOf(hex) === 0);
                    if (!availableHexes.length) return resolve();
                    actions.schedule('CONQUER_HEX', availableHexes.getRandomHex(), region, availableUnits.shift());
                           //.then(attack) //nice, now try to attack some more
                           //.then(resolve);
                });
            }

            function buyUnits() {
                return new Promise(resolve=>{
                    if (economy.treasuryOf(region) > 10 && economy.netIncomeOf(region)+economy.treasuryOf(region)/10 > 2) {
                        log.debug(`Buying new unit on ${region} (${economy.treasuryOf(region)} gold left)`);
                        const targetHex = region.hexes.filter(hex => !pawns.pawnAt(hex)).getRandomHex();
                        if (!targetHex) return resolve();
                        actions.schedule('BUY_UNIT', PawnType.TROOP_1, targetHex);
                            //.then(buyUnits) //try to buy another unit
                            //.then(resolve);
                    } else {
                        resolve();
                    }
                });
            }

        }


    }

    const _players = [new GlobalRegionAI()];
    
    // public API
    let self = {};
    IterableOn(self, _players);

    actions.setHandler('PLAYER_ACT', (action, player) => {
        player.play(action.resolve);
    });

    function getRegionsControlledBy(player) {
        //TODO less bullshit, more actual implementation
        let list = [];
        regions.forEach(r=>{if(r.hasCapital()) list.push(r); });
        return list;
    }

    return Object.freeze(self);
}

export default Players;