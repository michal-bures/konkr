import Scene from './Scene';

function Debug(spec){

    let { pawnSprites, landSprites, hexSelectionProxy } = spec;

    return new Scene(spec, { 
        name: 'DEBUG',
        uiElements: {
            landSprites:true,
            regionBorders:true,
            selRegionHighlight:true,
            pawnSprites:true,
            gridOverlays:true,
            hexSelectionProxy:true,
            messages:true,
            uiRegionPanel:true,
        },
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

    function setup() {
        hexSelectionProxy.setFilter((region) => {

        });
    }

    function onCreated(pawn) {
        let p = pawnSprites.getOrCreate(pawn.hex, pawn.pawnType);
        p.fadeIn();
    }
    function onDestroyed(pawn) {
        pawnSprites.destroySprite(pawn.hex);
    }

}

export default Debug;