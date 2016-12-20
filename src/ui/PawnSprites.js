const PAWN_OFFSET_TOP = -13;
const BASE_TWEEN_DURATION = 500;

import { convertToWorldCoordinates } from './Renderer';
import HexGroup from 'lib/hexgrid/HexGroup';
import Planner from 'lib/Planner';

function PawnSprites ({game, log, pawns, gameState, grid, players, economy}) {
    let spriteAtHex = {},
        group = game.add.group(),
        grabbedFrom = new HexGroup(), //list of hexes from which the currently grabbed unit was sourced
        boughtFrom = [],
        animationQueue = new Planner();

    let self = Object.freeze({ 
        group,
        toDebugString,
        flushAnimationQueue,
    });

    class PawnSprite extends Phaser.Sprite {
        constructor(hex, pawnType) {
            const [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
            super(game, x, y+Math.floor(PAWN_OFFSET_TOP/2), 'pawn');
            this.anchor.set(0.5);
            this.setType(pawnType);
        }

        setType(pawnType) {
            this.frame=pawnType.ordinal;
        }

        reposition(targetHex,animate=true) {
            return new Promise( resolve => {
            const [x,y] = convertToWorldCoordinates(targetHex.position.x, targetHex.position.y);
                if (animate) {
                    const tween = this.game.add.tween(this).to( { x: x, y: Math.floor(y+PAWN_OFFSET_TOP/2) }, BASE_TWEEN_DURATION, "Linear", true);  
                    tween.onComplete.add(resolve);
                } else {
                    this.x = x;
                    this.y = y+Math.floor(PAWN_OFFSET_TOP/2);
                    return resolve();
                }
            });
        }

        fadeAway() {
            return new Promise( resolve => {
                const tween = this.game.add.tween(this).to( { alpha: 0 } , BASE_TWEEN_DURATION, "Linear", true );  
                tween.onComplete.add(resolve);
            });
        }

        fadeIn() {
            return new Promise( resolve => {
                this.alpha = 0;
                const tween = this.game.add.tween(this).to( { alpha: 1 } , BASE_TWEEN_DURATION, "Linear", true );  
                tween.onComplete.add(resolve);
            });
        }

        toString() {
            return `[PawnSprite type #${this.frame} at (${this.x},${this.y})]`;
        }
    }

    players.onGrabbedPawn.add(pawn => {
        log.debug(`event: grabbed pawn ${pawn} from ${pawn.hex}`);
        grabbedFrom.add(pawn.hex);
    });

    players.onDroppedPawn.add((pawnType,targetHex) => {
        log.debug(`event: dropped pawn ${pawnType} at ${targetHex}`);
        animationQueue.addTask(
            grabbedFrom.toArray()
            .concat(boughtFrom.map(({hex})=>hex))
            .concat([targetHex]),
            gatherPawnsTransition(grabbedFrom, boughtFrom, targetHex));
        animationQueue.addTask([targetHex], pawnMorphTransition(targetHex, pawnType));
        grabbedFrom = new HexGroup();
        boughtFrom = [];
    });

    players.onBoughtPawn.add((pawnType, region)=>{
        if (pawnType.isTroop()) boughtFrom.push({hex:economy.capitalOf(region), pawnType:pawnType});
    });

    gameState.onReset.add(synchronize);

    function synchronize() {
        animationQueue = new Planner();
        grabbedFrom = new HexGroup();
        boughtFrom = [];
        destroyOrphanedSprites();
        pawns.forEach((pawn) => {
            getOrCreateSprite(pawn.hex, pawn.pawnType);
        });
    }

    function flushAnimationQueue() {
        return new Promise(resolve => {
            animationQueue.execute().then(()=> {
                synchronize();
                resolve();
            });
        });
    }

    function gatherPawnsTransition(moveFrom, spawnFrom, toHex) {
        return ()=>{
            log.debug(`Gathering pawns moved from ${moveFrom} and bought from ${spawnFrom.map(({hex})=>hex)} at ${toHex}`);
            let sprites = moveFrom.map(fromHex => {
                            let ret = spriteAtHex[fromHex.id];
                            if (!ret) throw Error(`Cannot start move transition from ${fromHex} - no pawn sprite present`);
                            delete spriteAtHex[fromHex.id];
                            return ret;
                          }).concat(spawnFrom.map(({hex,pawnType})=>{
                            let sprite = new PawnSprite(hex, pawnType);
                            group.add(sprite);
                            return sprite;
                          }));
            let promises = sprites.map(sprite=> {
                return sprite.reposition(toHex).then(()=>{
                    if (!spriteAtHex[toHex.id]) {
                        spriteAtHex[toHex.id] = sprite;
                    } else {
                        // another sprite already present here, discard this one
                        sprite.destroy();
                    }
                });
            });
            return Promise.all(promises);
        }        
    }

    function pawnMoveTransition(fromHex, toHex) {
        return ()=>{
            log.debug(`Runnning pawn transition from ${fromHex} to ${toHex}`);
            if (!spriteAtHex[fromHex.id]) throw Error(`Cannot start move transition from ${fromHex} - no pawn sprite present`);
            return spriteAtHex[fromHex.id].reposition(toHex).then(()=>{
                if (!spriteAtHex[toHex.id]) {
                    spriteAtHex[toHex.id] = spriteAtHex[fromHex.id];
                } else {
                    // another sprite already present here, discard this one
                    spriteAtHex[fromHex.id].destroy();
                }
                log.debug(`pawn no longer at ${fromHex}`);
                delete spriteAtHex[fromHex.id];
            });
        };
    }

    function pawnSpawnFromTransition(pawnType,fromHex, toHex) {
        return ()=>{
            log.debug(`Runnning pawn spawn transition from ${fromHex} to ${toHex}`);
            let sprite = new PawnSprite(fromHex, pawnType);
            group.add(sprite);
            return sprite.reposition(toHex).then(()=>{
                if (!spriteAtHex[toHex.id]) {
                    spriteAtHex[toHex.id] = sprite;
                } else {
                    // another sprite already present here, discard this one
                    sprite.destroy();
                }
            });
        };
    }    

    function pawnMorphTransition(hex, toPawnType) {
        return ()=>{
            log.debug(`Morphing pawn at ${hex} into ${toPawnType}`);
            let oldSprite = spriteAtHex[hex.id];
            if (oldSprite && (oldSprite.frame === toPawnType.ordinal)) return Promise.resolve();
            spriteAtHex[hex.id] = null;
            let newSprite = getOrCreateSprite(hex, toPawnType);
            if (oldSprite) oldSprite.fadeAway();
            return newSprite.fadeIn();
        };
    }

    function getOrCreateSprite(hex, pawnType) {
        if (spriteAtHex[hex.id]) {
            spriteAtHex[hex.id].setType(pawnType);
            return spriteAtHex[hex.id];
        } else {
            log.debug(`Creating pawn sprite ${pawnType} at ${hex}`);
            let sprite = new PawnSprite(hex, pawnType);
            group.add(sprite);
            spriteAtHex[hex.id] = sprite;
            return sprite;
        }
    }

    function destroyOrphanedSprites() {
        for (const key in spriteAtHex) {
            if (!grid.getHexById(key) || !pawns.pawnAt(grid.getHexById(key))) {
                log.debug("Destroyed orphaned sprite "+spriteAtHex[key].toString());
                spriteAtHex[key].destroy();
                delete spriteAtHex[key];
            }
        }        
    }

    function toDebugString() {
        let str = []; 
        let total = 0;
        for (let key in spriteAtHex) {
            ++total;
            str.push(` * ${key}: ${spriteAtHex[key]}`);
        }
        return `
grabbed from: ${grabbedFrom}
bought from: ${boughtFrom}
${total} pawn sprites:
${str.join('\n')}`;
    }

    return self;
}

export default PawnSprites;