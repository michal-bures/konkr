import IterableOn from 'lib/decorators/IterableOn';

function Players(spec) {

    let { actions, log } = spec;

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
            log.debug("WHAT TO DO, WHAT TO DO");
            setTimeout(callback, 10000);
//            callback();
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
        return regions.map(r=>r);
    }

    return Object.freeze(self);
}

export default Players;