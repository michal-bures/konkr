import Scene from './Scene';

function LocalPlayerTurn(spec){

    let { actions, pawnSprites, landSprites, players, pawns, regions, ui, economy } = spec;

    return new Scene(spec, { 
        name: 'PLAYER_TURN',
        uiElements: {
            landSprites:true,
            regionBorders:true,
            selRegionHighlight:true,
            pawnSprites:true,
            gridOverlays:true,
            hexSelectionProxy:true,
            messages:true,
            uiRegionPanel:true,
            nextTurnButton:true,
            grabbedPawn:true,
        },
        bindSignals: {
            pawns: {
                onCreated: onPawnCreated,
                onDestroyed: onPawnDestroyed,
            },
            regions: {
                onHexesChangedOwner: landSprites.refreshHexes
            },
            ui: {
                onHexSelected
            }
        },
        regionSelectFilter: (region) => {
            return players.activePlayer.controls(region);
        }

    });

    function onPawnCreated(pawn) {
        let p = pawnSprites.getOrCreate(pawn.hex, pawn.pawnType);
        p.fadeIn();
    }
    function onPawnDestroyed(pawn) {
        pawnSprites.destroySprite(pawn.hex);
    }
    function onHexSelected(hex) {
        if (players.grabbedPawn) {
            if (players.activePlayer.canDropPawnAt(hex)) {
                actions.schedule('DROP_UNIT', hex);
                ui.processActions();
            } else if (players.activePlayer.canConquerHex(hex)) {
                actions.schedule('CONQUER_HEX', hex);
                ui.processActions();
            }
        } else if (pawns.pawnAt(hex) && players.activePlayer.canGrabPawn(pawns.pawnAt(hex))) {
            actions.schedule('GRAB_UNIT', pawns.pawnAt(hex));
            ui.processActions();
        } else {
            const r = regions.regionOf(hex);
            if (players.activePlayer.controls(r) && economy.capitalOf(r)) {
                ui.selectRegion(regions.regionOf(hex));
            } else {
                ui.selectRegion(null);
            }
        }
    }
}

export default LocalPlayerTurn;