import Scene from './Scene';

function InstantSpectating(spec){

    let { pawnSprites } = spec;

    return new Scene(spec, { 
        name: 'FastSpectating',
        uiElements: { 'landSprites':true,
                      'regionBorders':true,
                      'pawnSprites':true,
                      'messages':true },
        bindSignals: {
            pawns: {
                onCreated,
                onDestroyed,
            },
            gameState: {
                onReset
            }
        }
    });

    function onCreated(pawn) {
        pawnSprites.getOrCreate(pawn.hex, pawn.pawnType);
    }
    function onDestroyed(pawn) {
        pawnSprites.destroySprite(pawn.hex);
    }

    function onReset() {
        pawnSprites.synchronize();
    }
}

export default InstantSpectating;