const PAWN_OFFSET_TOP = -13;
const BASE_TWEEN_DURATION = 200;

import { convertToWorldCoordinates } from './Renderer';
import HexGroup from 'lib/hexgrid/HexGroup';
import Planner from 'lib/Planner';

function PawnSprites ({tweens, game, log, pawns, gameState, grid, players, economy}) {
    let spriteAtHex = {},
        group = game.make.group();

    let self = Object.freeze({ 
        group,
        create,
        destroySprite,
        getOrCreate,
        morphSprite,
        atHex,
        synchronize,
        toDebugString,
    });

    class PawnSprite extends Phaser.Sprite {
        constructor(hex, pawnType) {
            const [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
            super(game, x, y+Math.floor(PAWN_OFFSET_TOP/2), 'pawn');
            this.anchor.set(0.5);
            this.setType(pawnType);
            this.hex = hex;
            group.add(this);
        }

        setType(pawnType) {
            this.frame=pawnType.ordinal;
        }

        reposition(targetHex,animate=true) {
            if (this.hex) delete spriteAtHex[this.hex];
            return new Promise( resolve => {
            const [x,y] = convertToWorldCoordinates(targetHex.position.x, targetHex.position.y);
                if (animate) {
                    const tween = tweens.add(this).to( { x: x, y: Math.floor(y+PAWN_OFFSET_TOP/2) }, BASE_TWEEN_DURATION, Phaser.Easing.Sinusoidal.InOut, true);  
                    tween.onComplete.add(()=> {
                        if (spriteAtHex[targetHex]) spriteAtHex[targetHex].destroy();
                        spriteAtHex[targetHex] = this;
                        resolve();
                    });
                } else {
                    //TODO update spriteAtHex
                    this.x = x;
                    this.y = y+Math.floor(PAWN_OFFSET_TOP/2);
                    return resolve();
                }
            });
        }

        fadeAway() {
            return new Promise( resolve => {
                const tween = tweens.add(this).to( { alpha: 0 } , BASE_TWEEN_DURATION, "Linear", true );  
                tween.onComplete.add(resolve);
            });
        }

        fadeIn() {
            return new Promise( resolve => {
                this.alpha = 0;
                const tween = tweens.add(this).to( { alpha: 1 } , BASE_TWEEN_DURATION, "Linear", true );  
                tween.onComplete.add(resolve);
            });
        }

        toString() {
            return `[PawnSprite type #${this.frame} at (${this.x},${this.y})]`;
        }
    }

    function synchronize() {
        destroyOrphanedSprites();
        pawns.forEach((pawn) => {
            getOrCreateSprite(pawn.hex, pawn.pawnType);
        });
    }

    function atHex(hex) {
        return spriteAtHex[hex.id];
    }

    function destroySprite(hex) {
        if (!spriteAtHex[hex.id]) return false;
        spriteAtHex[hex.id].destroy();
        delete spriteAtHex[hex.id];
        return true;
    }

    function getOrCreate(hex, pawnType) {
        return getOrCreateSprite(hex, pawnType);
    }
    function create(hex, pawnType) {
        return new PawnSprite(hex, pawnType);
    }

    function morphSprite(hex, toPawnType, animate=true) {
        log.debug(`Morphing pawn at ${hex} into ${toPawnType}`);
        let oldSprite = spriteAtHex[hex.id];
        if (oldSprite && (oldSprite.frame === toPawnType.ordinal)) return Promise.resolve();
        spriteAtHex[hex.id] = null;
        let newSprite = getOrCreateSprite(hex, toPawnType);
        if (oldSprite) oldSprite.fadeAway();
        return newSprite.fadeIn();
    }

    function getOrCreateSprite(hex, pawnType) {
        if (spriteAtHex[hex.id]) {
            spriteAtHex[hex.id].setType(pawnType);
            return spriteAtHex[hex.id];
        } else {
            log.debug(`Creating pawn sprite ${pawnType} at ${hex}`);
            let sprite = new PawnSprite(hex, pawnType);
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
${total} pawn sprites:
${str.join('\n')}`;
    }

    return self;
}

export default PawnSprites;