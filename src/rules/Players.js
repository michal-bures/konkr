import IterableOn from 'lib/decorators/IterableOn';
import { PawnType } from 'rules/Pawns';
import async from 'async';

function Players(spec) {

    let { actions, log, economy, pawns } = spec;

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
            async.eachSeries(getRegionsControlledBy(this), (region, nextRegion) => {
                log.debug(`Evaluating region ${region}`);
                async.whilst(()=>economy.treasuryOf(region) > 10 && economy.netIncomeOf(region) > 2, (next) => {
                    log.debug(`Buying new unit on ${region} (${economy.treasuryOf(region)} gold left)`);
                    const targetHex = region.hexes.filter(hex => !pawns.pawnAt(hex)).getRandomHex();
                    if (!targetHex) return next();
                    actions.execute('BUY_UNIT', PawnType.TROOP_1, targetHex).then(next);
                },nextRegion);
            }, callback);
        }
    }

    let { regions } = spec;
    const _players = [new GlobalRegionAI()];
    
    // public API
    let self = {};
    IterableOn(self, _players);

    actions.addHandler('PLAYER_ACT', (callback, player) => {
        player.play(callback);
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