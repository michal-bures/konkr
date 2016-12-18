const PAWN_OFFSET_TOP = -13;
import { convertToWorldCoordinates } from './Renderer';

function PawnSprites ({game, log, pawns, gameState, grid}) {
    let spriteAtHex = {},
        group = game.add.group();

    let self = Object.freeze({ 
        group,
        toDebugString
    });

    class PawnSprite extends Phaser.Sprite {
        constructor(pawn) {
            const [x,y] = convertToWorldCoordinates(pawn.hex.position.x, pawn.hex.position.y);
            super(game, x, y+Math.floor(PAWN_OFFSET_TOP/2), 'pawn');
            this.anchor.set(0.5);
            this.frame=pawn.pawnType.ordinal;
            this.pawnId=pawn.id;
            this.game=game;
        }

        updatePosition(animate=true) {
            const pos = pawns.byId(this.pawnId).hex.position;
            const [x,y] = convertToWorldCoordinates(pos.x, pos.y);
            if (animate) {
                this.game.add.tween(this).to( { x: x, y: Math.floor(y+PAWN_OFFSET_TOP/2) }, 500, "Linear", true);  
            } else {
                this.x = x;
                this.y = y+Math.floor(PAWN_OFFSET_TOP/2);
            }
        }

        refresh() {
            this.frame=pawns.byId(this.pawnId).pawnType.ordinal;
            this.updatePosition(false);
        }

        toString() {
            return `[PawnSprite ${pawns.byId(this.pawnId).pawnType} at (${this.x},${this.y})]`;
        }
    }

    pawns.onCreated.add(ensureSpriteExists);

    pawns.onDestroyed.add(pawn => {
        const sprite = spriteAtHex[pawn.hex.id];
        if (!sprite) return;
        delete spriteAtHex[pawn.hex.id];
        sprite.destroy();
    });

/*    pawns.onMoved.add(pawn => {
        const sprite = pawnToSprite[pawn.id];
        if (!sprite) throw Error(`${pawn} should have had a sprite assigned by now, but does not!`);
        sprite.updatePosition();
    });*/

    gameState.onReset.add(()=>{
        destroyOrphanedSprites();
        pawns.forEach(ensureSpriteExists);
    });


    function ensureSpriteExists(pawn) {
        if (spriteAtHex[pawn.hex.id]) return;
        var sprite = new PawnSprite(pawn);
        group.add(sprite);
        spriteAtHex[pawn.hex.id] = sprite;
    }

    function destroyOrphanedSprites() {
        for (const key in spriteAtHex) {
            if (!pawns.pawnAt(grid.getHexById(key))) {
                spriteAtHex[key].destroy();
                delete spriteAtHex[key];
            } else {
                spriteAtHex[key].refresh();
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
        return `${total} pawn sprites:
${str.join('\n')}`;
    }

    return self;
}

export default PawnSprites;