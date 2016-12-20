import Scene from './Scene';
import HexGroup from 'lib/hexgrid/HexGroup';
import Planner from 'lib/Planner';

function FastSpectating(spec){

    let { log, economy,
          pawnSprites, landSprites } = spec;
    
    let grabbedFrom = new HexGroup(), //list of hexes from which the currently grabbed unit was sourced
        boughtFrom = [],
        animationQueue = new Planner();

    return new Scene(spec, { 
        name: 'FastSpectating',
        uiElements: { 'landSprites':true,
                      'regionBorders':true,
                      'pawnSprites':true,
                      'messages':true },
        preActionGuards: {
            'END_PLAYER_TURN': flushAnimationQueue,
        },
        bindSignals: {
            players: {
                onDroppedPawn,
                onGrabbedPawn,
                onBoughtPawn,
            }
        }
    });

    function onDroppedPawn(pawnType, targetHex) {
        log.debug(`event: dropped pawn ${pawnType} at ${targetHex}`);
        animationQueue.addTask(
            grabbedFrom.toArray()
            .concat([targetHex]),
            gatherPawnsTransition(grabbedFrom, boughtFrom, targetHex));
        animationQueue.addTask([targetHex], pawnMorphTransition(targetHex, pawnType));
        grabbedFrom = new HexGroup();
        boughtFrom = [];
    }

    function onGrabbedPawn(pawn) {
        log.debug(`event: grabbed pawn ${pawn} from ${pawn.hex}`);
        grabbedFrom.add(pawn.hex);
    }


    function onBoughtPawn(pawnType, region) {
        if (pawnType.isTroop()) boughtFrom.push({hex:economy.capitalOf(region), pawnType:pawnType});
    }

    function gatherPawnsTransition(moveFrom, spawnFrom, toHex) {
        return ()=>{
            log.debug(`Gathering pawns moved from ${moveFrom} and bought from ${spawnFrom.map(({hex})=>hex)} at ${toHex}`);
            let sprites = moveFrom.map(fromHex => {
                            let sprite = pawnSprites.atHex(fromHex);
                            if (!sprite) throw Error(`Cannot start move transition from ${fromHex} - no pawn sprite present`);
                            return sprite;
                          }).concat(spawnFrom.map(({hex,pawnType})=>{
                            let sprite = pawnSprites.create(hex, pawnType);
                            return sprite;
                          }));
            let promises = sprites.map(sprite=>sprite.reposition(toHex));
            return Promise.all(promises);
        };
    }    

    function pawnMorphTransition(hex, toPawnType) {
        return ()=>{
            log.debug(`Morphing pawn at ${hex} into ${toPawnType}`);
            return pawnSprites.morphSprite(hex,toPawnType);
        };
    }

    function flushAnimationQueue() {
        return new Promise(resolve => {
            animationQueue.execute().then(()=> {
                pawnSprites.synchronize();
                landSprites.synchronize();
                animationQueue = new Planner();
                resolve();
            });
        });
    }    
}

export default FastSpectating;