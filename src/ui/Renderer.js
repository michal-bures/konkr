import log from 'loglevel';
import expect from 'expect';
import { OrderedMap } from 'lib/util';

const HEX_WIDTH = 32;
const HEX_HEIGHT = 37;
const HEX_EDGE_SIZE = Math.floor(HEX_HEIGHT/2);
const OFFSET_TOP = 10;
const OFFSET_LEFT = 10;

const LINE_HEIGHT = Math.floor(HEX_HEIGHT * 3/4);

function convertToWorldCoordinates(x,y) {
    return {
        x: OFFSET_LEFT + Math.floor(HEX_WIDTH/2) + x * HEX_WIDTH,
        y: OFFSET_TOP + y * LINE_HEIGHT
    };
}


function drawInnerHex(graphics, hex, scale=1) {
    drawOnHex(graphics, hex, scale, 
        [[-1,-0.5], [0,-1], [1,-0.5], [1,0.5], [0,1], [-1,0.5]]);
}

function drawOnHex(graphics, hex, scale, path) {
    const {x,y} = convertToWorldCoordinates(hex.position.x, hex.position.y);
    const H = HEX_HEIGHT/2;
    const W = HEX_WIDTH/2;
    graphics.drawPolygon(path.map(p=>[(x + W *(1+ p[0]*scale)), (y + H*(1+p[1]*scale))]));
}

function LandSprites(spec) {
    const {game, grid, regions} = spec;
    
    //public
    let landSprites = Object.freeze({
        highlightTiles,
        get group() { return group; }
    });

    //private
    let group = game.add.group(),
        tileToSprite = {},
        highlightedTiles = [];

    regions.onHexesChangedOwner.add((hexes) => {
        hexes.forEach( hex => {
            if (tileToSprite[hex]) {
                tileToSprite[hex].refresh();
            } else {
                let sprite = new LandSprite(hex);
                group.add(sprite);
                tileToSprite[hex.id] = sprite;
            }
        });
        group.sort('y', Phaser.Group.SORT_ASCENDING);
    });

    class LandSprite extends Phaser.Image {
        constructor(tile) {
            const {x,y} = convertToWorldCoordinates(tile.position.x, tile.position.y);
            super(game, x, y, 'hex');
            this.frame=regions.factionOf(tile) || 0;
            this.hex = tile;
            //log.debug(`Hex sprite for ${tile} created at ${x}:${y}`);
            /*
            var style = { font: "12px Courier New", fill: "white", align: "center"};
            this.label = game.add.text(HEX_WIDTH/2,HEX_HEIGHT/2,tile.id, style);
            this.label.alpha=0.5;
            this.label.lineSpacing = -6;
            this.label.anchor.set(0.5,0.5);
            this.addChild(this.label);*/
        }

        refresh() {
            this.frame=regions.factionOf(this.hex);
        }
    }

    //implementation

    function highlightTiles(tiles) {
        return;
        highlightedTiles.forEach((tileSprite) => {
            if (tileSprite) tileSprite.frame = 0;
        });
        highlightedTiles = tiles.map((tile) => tile && tileToSprite[tile.id]);
        highlightedTiles.forEach((tileSprite) => {
            if (tileSprite) tileSprite.frame = 1;
        });
    }



    return landSprites;
}



const PAWN_OFFSET_TOP = -13;

class Pawns {
    constructor({game, log, pawns, actions}) {
        expect(game).toExist();
        expect(pawns).toExist();    

        this.game = game;
        this.group = game.add.group();
        this.pawns = pawns;
        this.pawnToSprite = {};
        this.pawns.forEach((pawn) => {
            var sprite = new PawnSprite({game},pawn);
            this.group.add(sprite);
            this.pawnToSprite[pawn.id] = sprite;
        });        

        pawns.onCreated.add((pawn) => {
            var sprite = new PawnSprite({game},pawn);
            this.group.add(sprite);
            this.pawnToSprite[pawn.id] = sprite;
        });

        pawns.onDestroyed.add(pawn => {
            const sprite = this.pawnToSprite[pawn.id];
            if (!sprite) return;
            this.pawnToSprite[pawn.id] = undefined;
            sprite.destroy();
        });
    }
}

class PawnSprite extends Phaser.Sprite {
    constructor({game},pawn) {
        const {x,y} = convertToWorldCoordinates(pawn.hex.position.x, pawn.hex.position.y);
        super(game, x, y+PAWN_OFFSET_TOP, 'pawn');
        this.frame=pawn.pawnType.ordinal;
        this.pawn=pawn;

/*        var style = { font: "10px Courier New", fill: "white", align: "center"};
        this.label = game.add.text(HEX_WIDTH/2,HEX_HEIGHT/2,tile.id, style);
        this.label.lineSpacing = -6;
        this.label.anchor.set(0.5,0.5);
        this.addChild(this.label);*/
        
    }
}


class DebugInfo {
    constructor({game}) {
        this.game = game;
        this.items = new OrderedMap();
    }

    set(key,value) {
        this.items.push(key,value);
    }

    render() {
        let y = 32;
        this.items.forEach((key, value) => {
            this.game.debug.text(key + ": " + value,32,y);
            y +=32;
        });
    }
}

export { 
    convertToWorldCoordinates,
    drawOnHex,
    drawInnerHex,
    LandSprites, 
    Pawns, 
    DebugInfo,
    HEX_WIDTH,
    HEX_HEIGHT,
    LINE_HEIGHT,
    OFFSET_TOP,
    OFFSET_LEFT,
    HEX_EDGE_SIZE 
};