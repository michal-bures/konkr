const PAWN_OFFSET_TOP = -13;
const BASE_TWEEN_DURATION = 200;

import { convertToWorldCoordinates } from './Renderer';
import HexGroup from 'lib/hexgrid/HexGroup';
import Planner from 'lib/Planner';

function PawnSprites ({tweens, game, log, pawns, regions, gameState, grid, players, economy}) {
    let spriteAtHex = {},
        group = game.make.group(),
        idleHighlighting=false;

    let self = Object.freeze({ 
        group,
        create,
        destroySprite,
        getOrCreate,
        morphSprite,
        atHex,
        synchronize,
        toDebugString,
        set highlightIdle(val) { setHighlightIdle(val); },
        get highlightIdle() { return idleHighlighting; }
    });

    class PawnSprite extends Phaser.Sprite {
        constructor(pawnType, hex) {
            if (hex) {
                const [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
                super(game, x, y+Math.floor(PAWN_OFFSET_TOP/2), 'pawn');
            } else {
                super(game, 0, 0, 'pawn');
            }
            this.anchor.set(0.5);
            this.setType(pawnType);
            this.hex = hex;
            this.flagSprite = null;
            group.add(this);
        }

        destroy() {
            super.destroy();
            this.stopJumping();
        }

        setType(pawnType) {
            this.frame=(pawnType?pawnType.ordinal:0);
            this.pawnType = pawnType;
        }

        setFlag() {
            if (!this.flagSprite) {
                this.flagSprite=game.make.sprite(0,0,'flag');
                this.flagSprite.anchor.set(0.5);
                this.addChild(this.flagSprite);
            }
        }

        removeFlag() {
            if (!this.flagSprite) return;
            this.removeChild(this.flagSprite);
            this.flagSprite.destroy();
            this.flagSprite = null;
        }

        startJumping() {
            if (this.jumpTween) return;
            this.jumpTween = game.add.tween(this).to({y:this.y-3},200,Phaser.Easing.Quadratic.In,true);
            this.jumpTween.yoyo(200);
            this.jumpTween.repeat(-1);
        }

        stopJumping() {
            if (!this.jumpTween) return;
            this.jumpTween.stop();
            this.jumpTween=null;
        }

        refreshDecorations() {
            if (!idleHighlighting && !this.hex) {
                this.topJumping();
                this.removeFlag();
            } else {
                if (this.pawnType === pawns.TOWN) {
                    if (economy.treasuryOf(regions.regionOf(this.hex)) >= economy.priceOf(pawns.TROOP_1)) {
                        this.setFlag();
                    } else {
                        this.removeFlag();
                    }
                } else if (this.pawnType.isTroop()) {
                    if (players.activePlayer.canGrabPawn(pawns.pawnAt(this.hex))) {
                        this.startJumping();
                    } else {
                        this.stopJumping();
                    }
                }
            }
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
    function create(pawnType, hex) {
        return new PawnSprite(pawnType, hex);
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
            let sprite = new PawnSprite(pawnType,hex);
            spriteAtHex[hex.id] = sprite;
            if (idleHighlighting && players.activePlayer.canGrabPawn(pawns.pawnAt(hex))) sprite.startJumping();

            return sprite;
        }
    }

    function setHighlightIdle(val) {
        if (idleHighlighting===val) return;
        idleHighlighting = val;
        players.activePlayer.getAvailableUnits().forEach(pawn=>{
            getOrCreateSprite(pawn.hex, pawn.pawnType).refreshDecorations();
        });
        players.activePlayer.regions.forEach(region=> {
            if (economy.capitalOf(region)) {
                getOrCreateSprite(economy.capitalOf(region), pawns.TOWN).refreshDecorations();
            }
        });
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