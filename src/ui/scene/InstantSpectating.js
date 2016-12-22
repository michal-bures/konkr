import Scene from './Scene';

function InstantSpectating(spec){

    let { pawnSprites, landSprites } = spec;

    return new Scene(spec, { 
        name: 'INSTANT_SPECTATING',
        uiElements: { 'landSprites':true,
                      'regionBorders':true,
                      'pawnSprites':true,
                      'messages':true },
        bindSignals: {
            pawns: {
                onCreated,
                onDestroyed,
            },
            regions: {
                onHexesChangedOwner: landSprites.refreshHexes
            }    
        }
    });

    function onCreated(pawn) {
        pawnSprites.getOrCreate(pawn.hex, pawn.pawnType);
    }
    function onDestroyed(pawn) {
        pawnSprites.destroySprite(pawn.hex);
    }
}

export default InstantSpectating;