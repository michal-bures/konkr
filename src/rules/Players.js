import IterableOn from 'lib/decorators/IterableOn';

function Players(spec) {

    class Player {
        constructor(name) {
            this.name = name;
        }

        get controlledRegions() {
            return getRegionsControlledBy(this);
        }
    }

    class GlobalRegionAI extends Player {
        constructor() {
            super("GlobalRegionAI");
        }
    }

    let { regions } = spec;
    const _players = [new GlobalRegionAI()];
    
    // public API
    let self = {};
    IterableOn(self, _players);

    return Object.freeze(self);

    function getRegionsControlledBy(player) {
        //TODO less bullshit, more actual implementation
        return regions.map(r=>r);
    }
}

export default Players;