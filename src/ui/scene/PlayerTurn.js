import Scene from './Scene';

function PlayerTurn(spec){

    let { pawnSprites } = spec;

    return new Scene(spec, { 
        name: 'FastSpectating',
        uiElements: {
            landSprites:true,
            regionBorders:true,
            selRegionHighlight:true,
            pawnSprites:true,
            gridOverlays:true,
            hexSelectionProxy:true,
            messages:true,
            uiRegionPanel:true,
            nextTurnButton:true
        },
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
        let p = pawnSprites.getOrCreate(pawn.hex, pawn.pawnType);
        p.fadeIn();
    }
    function onDestroyed(pawn) {
        pawnSprites.destroySprite(pawn.hex);
    }

    function onReset() {
        pawnSprites.synchronize();
    }
}

export default PlayerTurn;