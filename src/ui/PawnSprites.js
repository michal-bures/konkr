const PAWN_OFFSET_TOP = -13;
const BASE_TWEEN_DURATION = 1000;

import { convertToWorldCoordinates } from './Renderer';
import HexGroup from 'lib/hexgrid/HexGroup';
import Planner from 'lib/Planner';

function PawnSprites ({game, log, pawns, gameState, grid, players, economy}) {
    let spriteAtHex = {},
        group = game.add.group(),
        grabbedFrom = new HexGroup(), //list of hexes from which the currently grabbed unit was sourced
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


/*    pawns.onCreated.add(pawn=>{
        getOrCreateSprite(pawn.hex, pawn.pawnType);
    });*/

    /*pawns.onDestroyed.add(pawn => {
        const sprite = spriteAtHex[pawn.hex.id];
        if (!sprite) return;
        delete spriteAtHex[pawn.hex.id];
        sprite.destroy();
    });*/

    players.onGrabbedPawn.add(pawn => {
        grabbedFrom.add(pawn.hex);
    });

    players.onDroppedPawn.add((pawnType,targetHex) => {
        grabbedFrom.forEach(srcHex=>{
            animationQueue.addTask([srcHex, targetHex], pawnMoveTransition(srcHex, targetHex));
        });
        animationQueue.addTask([targetHex], pawnMorphTransition(targetHex, pawnType));
        grabbedFrom.clear();
    });

    players.onBoughtPawn.add((pawnType, region)=>{
        //grabbedFrom.add(economy.capitalOf(region));
    });

    gameState.onReset.add(()=>{
        animationQueue = new Planner();
        destroyOrphanedSprites();
        pawns.forEach((pawn) => {
            getOrCreateSprite(pawn.hex, pawn.pawnType);
        });
    });


    function flushAnimationQueue() {
        return new Promise(resolve => {
            animationQueue.execute().then(resolve);
            animationQueue = new Planner();
        });
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

    function pawnMorphTransition(hex, toPawnType) {
        return ()=>{
            log.debug(`Morphing pawn at ${hex} into ${toPawnType}`)
            let oldSprite = spriteAtHex[hex.id];
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
currently grabbed: ${grabbedFrom}
${total} pawn sprites:
${str.join('\n')}`;
    }

    return self;
}

export default PawnSprites;