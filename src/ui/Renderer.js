import log from 'loglevel';
import expect from 'expect';
import { OrderedMap, assertDefined } from 'lib/util';

const HEX_WIDTH = 32;
const HEX_HEIGHT = 38;
const HALF_HEX_HEIGHT = Math.floor(HEX_HEIGHT/2);
const HALF_HEX_WIDTH = Math.floor(HEX_WIDTH/2);

const HEX_EDGE_SIZE = Math.floor(HEX_HEIGHT/2);

const LINE_HEIGHT = 28;//Math.floor(HEX_HEIGHT * 3/4);
const HALF_LINE_HEIGHT = 14.5;//Math.floor(HEX_HEIGHT * 3/8);

const OFFSET_TOP = 10 + Math.floor((HEX_HEIGHT-LINE_HEIGHT)/2);
const OFFSET_LEFT = 10;

function convertToWorldCoordinates(x,y) {
    return [ Math.floor(OFFSET_LEFT + HEX_WIDTH + x * HEX_WIDTH), Math.floor(OFFSET_TOP + y * LINE_HEIGHT + HALF_LINE_HEIGHT)];
}

let HEX_POLYGON = [[-0.5,-0.25], [0,-0.5], [0.5,-0.25], [0.5,0.25], [0,0.5], [-0.5,0.25], [-0.5,-0.25]];
HEX_POLYGON = HEX_POLYGON.map(([x,y])=>[Math.floor(x*HEX_WIDTH),Math.floor(y*HEX_HEIGHT)]);

function drawHexBorders(graphics, hex, func=()=> true) {
    const [baseX,baseY] = convertToWorldCoordinates(hex.position.x, hex.position.y);
    graphics.moveTo(baseX+HEX_POLYGON[0][0],baseY+HEX_POLYGON[0][1]);
    HEX_POLYGON.forEach((vertex, index) => {
        if (index === 0) return;
        if (func(index-1)) {
            graphics.lineTo(baseX+vertex[0],baseY+vertex[1]);
        } else {
            graphics.moveTo(baseX+vertex[0],baseY+vertex[1]);
        }
    });
    graphics.endFill();
}

function drawInnerHex(graphics, hex, scale=1) {
    drawOnHex(graphics, hex, scale, HEX_POLYGON);
}

function drawOnHex(graphics, hex, scale, path) {
    const [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
    graphics.drawPolygon(path.map(p=>[(x + (p[0]*scale)), (y + (p[1]*scale))]));
}

function LandSprites(spec) {
    const {game, grid, regions} = spec;
    
    //public
    let landSprites = Object.freeze({
        render,
        get group() { return group; }
    });

    //private
    let group = game.add.group(),
        tileToSprite = {},
        requiresSorting = false; // true => need to resort group before next render

    regions.onHexesChangedOwner.add((hexes) => {
        hexes.forEach( hex => {
            if (tileToSprite[hex.id]) {
                tileToSprite[hex.id].refresh();
            } else {
                let sprite = new LandSprite(hex);
                group.add(sprite);
                tileToSprite[hex.id] = sprite;
                requiresSorting = true;
            }
        });
    });

    function render() {
        if (requiresSorting) {
            requiresSorting = false;
            group.sort('y', Phaser.Group.SORT_ASCENDING);
        }
    }

    class LandSprite extends Phaser.Image {
        constructor(tile) {
            const [x,y] = convertToWorldCoordinates(tile.position.x, tile.position.y);
            super(game, x, y-HEX_HEIGHT/2, 'hex');
            this.anchor.setTo(0.5,0);
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

        pawns.onMoved.add(pawn => {
            const sprite = this.pawnToSprite[pawn.id];
            if (!sprite) throw Error(`${pawn} should have had a sprite assigned by now, but does not!`);
            sprite.updatePosition();
        });
    }
}

class PawnSprite extends Phaser.Sprite {
    constructor({game},pawn) {
        const [x,y] = convertToWorldCoordinates(pawn.hex.position.x, pawn.hex.position.y);
        super(game, x, y+Math.floor(PAWN_OFFSET_TOP/2), 'pawn');
        this.anchor.set(0.5);
        this.frame=pawn.pawnType.ordinal;
        this.pawn=pawn;
        this.game=game;

/*        var style = { font: "10px Courier New", fill: "white", align: "center"};
        this.label = game.add.text(HEX_WIDTH/2,HEX_HEIGHT/2,tile.id, style);
        this.label.lineSpacing = -6;
        this.label.anchor.set(0.5,0.5);
        this.addChild(this.label);*/
    }

    updatePosition() {
        const [x,y] = convertToWorldCoordinates(this.pawn.hex.position.x, this.pawn.hex.position.y);
        this.game.add.tween(this).to( { x: x, y: Math.floor(y+PAWN_OFFSET_TOP/2) }, 500, "Linear", true);
    }
}

class RegionBorders {
    constructor({game, regions}) {
        this.regions = regions;
        this.game = game;
        this.needsRedraw = true;
        this.group = game.add.group();

        regions.onHexesChangedOwner.add(() => { this.needsRedraw = true; });
    }

    redraw() {
        this.needsRedraw = false;        
        if (this.sprite) this.sprite.destroy();
        const graphics = this.game.add.graphics(0, 0);
        graphics.beginFill(0x000000);
        graphics.lineStyle(1, 0x202020, 1);
        graphics.fillAlpha=1;
        graphics.endFill();
        this.regions.forEach(region=>{
            region.hexes.border().forEach(hex => {
                drawHexBorders(graphics, hex, i=> i<3 && hex.neighbour(i) && !region.hexes.contains(hex.neighbour(i)));
            });
        });
        const {x,y} = graphics.getBounds();
        this.sprite = this.game.add.sprite(x, y, graphics.generateTexture());
        this.group.add(this.sprite);
        graphics.destroy();
    }

    render() {
        if (this.needsRedraw) {
            this.redraw();
        }
    }
}

function SelectedRegionHighlight({game,ui}) {
    let group = game.add.group(),
        sprite = null;

    ui.onSelectedRegionChanged.add(redraw);
    ui.onRegionSelected.add(redraw);

    return Object.freeze({
        get group() { return group; }
    });

    function redraw(region) {
        if (sprite) {
            sprite.destroy();
            sprite = null;
        }
        if (!region) return;
        const graphics = game.add.graphics(0,0);
        graphics.beginFill(0x000000);
        graphics.lineStyle(2, 0xffff00, 1);
        graphics.fillAlpha=1;
        graphics.endFill();
        region.hexes.borderIncludingShoreline().forEach(hex => {
            drawHexBorders(graphics, hex, i => !hex.neighbour(i) || !region.hexes.contains(hex.neighbour(i)));
        });
        const {x,y} = graphics.getBounds();
        sprite = game.add.sprite(x,y, graphics.generateTexture());
        graphics.destroy();
    }

}


class DebugInfo {
    constructor({game}) {
        this.game = game;
        this.items = new OrderedMap();
        this.sprites = [];
    }

    set(key,value) {
        this.items.push(key,value);
    }

    sprite(sprite) {
        this.sprites.push(sprite);
    }

    render() {
        let y = 32;
        this.items.forEach((key, value) => {
            if (value!==null && value!==undefined) {
                this.game.debug.text(key + ": " + value,32,y);
            }
            y +=32;
        });
        this.sprites.forEach(sprite=>this.game.debug.spriteBounds(sprite));
    }
}

export { 
    convertToWorldCoordinates,
    drawOnHex,
    drawInnerHex,
    LandSprites, 
    Pawns,
    RegionBorders,
    SelectedRegionHighlight,
    DebugInfo,
    HEX_WIDTH,
    HEX_HEIGHT,
    LINE_HEIGHT,
    OFFSET_TOP,
    OFFSET_LEFT,
    HEX_EDGE_SIZE 
};