import Scene from './Scene';

function LocalPlayerTurn(spec){

    let { actions,  players, pawns, regions, ui, economy, log,
          sfx, pawnSprites, landSprites, feedbackSymbols } = spec;

    return new Scene(spec, { 
    name: 'PLAYER_TURN',
        uiElements: {
            landSprites:true,
            regionBorders:true,
            selRegionHighlight:true,
            conquerableHexesHighlight: true,
            pawnSprites:true,
            gridOverlays:true,
            hexSelectionProxy:true,
            messages:true,
            uiRegionPanel:true,
            nextTurnButton:true,
            grabbedPawn:true,
            feedbackSymbols:true,
            optionButtons:true,
        },
        bindSignals: {
            pawns: {
                onCreated: onPawnCreated,
                onDestroyed: onPawnDestroyed,
            },
            regions: {
                onHexesChangedOwner: landSprites.refreshHexes
            },
            economy: {
                onRegionTreasuryChanged                
            },
            ui: {
                onHexSelected,
            }
        },
        setup,
        teardown
    });

    function setup() {
        pawnSprites.highlightIdle = true;
    }

    function teardown() {
        pawnSprites.highlightIdle = false;   
    }

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
                sfx.dropPawn();
                feedbackSymbols.showDefendedBy(hex, players.grabbedPawn.defense);
                ui.processActions();
            } else if (players.activePlayer.canConquerHex(hex)) {
                actions.schedule('CONQUER_HEX', hex);
                sfx.dropPawn();
                ui.processActions();
            } else {
                sfx.deny();
                if (regions.regionOf(hex) === ui.selectedRegion) {
                    log.warn(`Tile is occupied!`);
                } else if (!players.grabbedPawnRegion.hexes.neighbours().contains(hex)) {
                    log.warn(`Can't reach this tile!`);
                } else {
                    feedbackSymbols.showDefendersOf(hex, players.grabbedPawn.might);
                    log.warn('Stronger unit needed to conquer this tile!');
                }
            }
        } else {
            if (pawns.pawnAt(hex) && players.activePlayer.canGrabPawn(pawns.pawnAt(hex))) {
                actions.schedule('GRAB_UNIT', pawns.pawnAt(hex));
                sfx.grabPawn();
                ui.processActions();
            } 
            const r = regions.regionOf(hex);
            if (players.activePlayer.controls(r) && economy.capitalOf(r)) {
                ui.selectRegion(regions.regionOf(hex));
            } else {
                ui.selectRegion(null);
            }
        }
    }
    function onRegionTreasuryChanged(region) {
        if (economy.capitalOf(region)) pawnSprites.getOrCreate(economy.capitalOf(region), pawns.TOWN).refreshDecorations();
    }
}

export default LocalPlayerTurn;