import IterableOn from 'lib/decorators/IterableOn';

function SimpleAI(spec) {
    return {
        name:"SimpleAI"
    };
}


function Players(spec) {
    const _players = [new SimpleAI(spec)];
    
    let self = {
        _players
    };
    IterableOn(self, _players);

    return Object.freeze(self);
}

export default Players;