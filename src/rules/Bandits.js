import HexGroup from 'lib/hexgrid/HexGroup';

function Bandits(spec) {
    
    let {actions, pawns, log, random} = spec;

    let self = Object.freeze({
    });


    actions.setHandler('MOVE_BANDITS', (action)=> {
        let bandits = new Set(pawns.select({
            type: pawns.BANDIT,
        }));
        if (!bandits.size) return action.resolve();

        //Find clusters
        //TODO

        //Move pawns
        let vacatedHexes = new HexGroup();
        let claimedHexes = new HexGroup();

        function canMoveBanditIntoThisHex(hex) {
            if (claimedHexes.contains(hex)) return false;
            if (vacatedHexes.contains(hex)) return true;
            return !pawns.pawnAt(hex);
        }

        function canPotentiallyFreeUpHex(hex) {
            return (pawns.pawnAt(hex).pawnType == pawns.BANDIT && bandits.has(pawns.pawnAt(hex)));
        }        


        while (bandits.size) {
            let pivot = bandits[Symbol.iterator]().next().value;
            moveBandit(pivot);
        }

        function moveBandit(pivot) {
            log.debug(`Trying to move ${pivot}`);
            bandits.delete(pivot);
            let candidateHexes = pivot.hex.neighbours().filter(canMoveBanditIntoThisHex);
            if (!candidateHexes.length) {
                candidateHexes = pivot.hex.neighbours().filter(canPotentiallyFreeUpHex);
                if (!candidateHexes.length) {
                    log.debug(`Bandit ${pivot} has nowhere to move`);
                } else {
                    let targetHex = random.hex(candidateHexes);
                    log.debug(`Bandit ${pivot} has nowhere to move yet, waiting for ${pawns.pawnAt(targetHex)} to free up ${targetHex}`);
                    moveBandit(pawns.pawnAt(targetHex));
                    moveBandit(pivot);
                }
            } else {
                let targetHex = random.hex(candidateHexes);
                vacatedHexes.add(pivot.hex);
                claimedHexes.add(targetHex);
                action.schedule("MOVE_PAWN", pivot, targetHex);
            }
        }

        //Respawn clusters


        action.resolve();
    }, { undo() {}});

    return self;
}


export default Bandits;