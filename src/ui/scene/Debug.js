import Scene from './Scene';

function Debug(spec){

    let { pawnSprites, landSprites, hexSelectionProxy, ui, regions, popovers, pawns } = spec;

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
            optionButtons:true,
            popovers: true,
        },
        bindSignals: {
            pawns: {
                onCreated,
                onDestroyed,
            },
            regions: {
                onHexesChangedOwner: landSprites.refreshHexes
            },
            ui: {
                onHexSelected
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

    function onHexSelected(hex) {
        ui.selectRegion(regions.regionOf(hex));
        const pawn = hex && pawns.pawnAt(hex);
        const region = hex && regions.regionOf(hex);        
        const str = [
            (hex?hex.toString():null),
            (pawn?'♙'+pawn.id:null),
            (region?'♔'+region.id:null),
        ];
        popovers.show('HEX_TOOLTIP', hex, str.filter(x=>x).join('\n'));
    }

}

export default Debug;