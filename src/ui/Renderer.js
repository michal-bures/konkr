import log from 'loglevel';
import expect from 'expect';
import { OrderedMap, assertDefined } from 'lib/util';



const HEX_WIDTH = 64;
const HEX_HEIGHT = 74;
const HALF_HEX_HEIGHT = Math.floor(HEX_HEIGHT/2);
const HALF_HEX_WIDTH = Math.floor(HEX_WIDTH/2);

const HEX_EDGE_SIZE = Math.floor(HEX_HEIGHT/2);

const LINE_HEIGHT = Math.floor(HEX_HEIGHT * 3/4);
const HALF_LINE_HEIGHT = Math.floor(HEX_HEIGHT * 3/8);

const OFFSET_TOP = 10 + Math.floor((HEX_HEIGHT-LINE_HEIGHT)/2);
const OFFSET_LEFT = 10;

//draws an invisible shape for the sole purpose of setting the top-left boundary of the resulting graphics to the specified coords
function fixateTopLeftBoundary(graphics,x=0,y=0) {
    let prevAlpha = graphics.fillAlpha;
    let prevLW = graphics.lineWidth;
    graphics.fillAlpha = 0;
    graphics.lineWidth =  0;
    graphics.moveTo(x,y);
    graphics.lineTo(x,y);
    graphics.fillAlpha = prevAlpha;
    graphics.lineWidth =  prevLW;
}

function convertToWorldCoordinates(x,y) {
    return [ OFFSET_LEFT + HEX_WIDTH + x * HEX_WIDTH, OFFSET_TOP + y * LINE_HEIGHT + HALF_LINE_HEIGHT];
}

function drawBorderBetween(graphics, hex1, hex2) {
    assertDefined(graphics,hex1, hex2);

    graphics.lineStyle(1,0xff0000,0.5);
    drawInnerHex(graphics,hex1);

    const [x1,y1] = [hex1.position.x, hex1.position.y];
    const [x2,y2] = [hex2.position.x, hex2.position.y];

    const cx = x1 + (x2 - x1)/2;
    const cy = y1 + (y2 - y1)/2;

    const conv = HEX_WIDTH/HEX_HEIGHT;

    let dx = x2 - cx;
    let dy = y2 - cy;

    log.debug(`DIFF ${dx},${dx} CONV ${conv}`);


    //dx=0;
    //dy=0;
    dx=dx*2;
    dy=dy*2;


    const [wx1,wy1] = convertToWorldCoordinates(cx,cy);
    const [wx2,wy2] = convertToWorldCoordinates(cx-dy*conv,cy+dx*(1/conv));

    const [a1x,a1y] = convertToWorldCoordinates(x1,y1);
    const [a2x,a2y] = convertToWorldCoordinates(x2,y2);
    graphics.lineStyle(1, 0x0000ff, 1);
    graphics.moveTo(a1x, a1y);
    graphics.lineTo(a2x, a2y);
    graphics.endFill();

    graphics.lineStyle(2, 0xffd900, 1);
    graphics.moveTo(wx1, wy1);
    graphics.lineTo(wx2, wy2);
    graphics.endFill();
}

function drawInnerHex(graphics, hex, scale=1) {
    drawOnHex(graphics, hex, scale, 
        [[-1,-0.5], [0,-1], [1,-0.5], [1,0.5], [0,1], [-1,0.5]]);
}

function drawOnHex(graphics, hex, scale, path) {
    const [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
    const H = HEX_HEIGHT/2;
    const W = HEX_WIDTH/2;
    graphics.drawPolygon(path.map(p=>[(x + W*(p[0]*scale)), (y + H*(p[1]*scale))]));
}

function LandSprites(spec) {
    const {game, grid, regions} = spec;
    
    //public
    let landSprites = Object.freeze({
        render,
        highlightTiles,
        get group() { return group; }
    });

    //private
    let group = game.add.group(),
        tileToSprite = {},
        highlightedTiles = [],
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
        this.game.add.tween(this).to( { x: x, y: y+PAWN_OFFSET_TOP }, 500, "Linear", true);
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
        fixateTopLeftBoundary(graphics, 0,0);

        graphics.beginFill(0x000000);
        graphics.lineStyle(2, 0xffd900, 1);
        graphics.fillAlpha=1;
        graphics.endFill();
        this.regions.forEach(region=>{
            region.hexes.border().forEach(hex => {
                hex.neighbours().forEach(hex2 => {
                    if (hex2.exists() && (hex.position.y % 4 === 2) && (hex.position.x % 4 === 3) && this.regions.regionOf(hex2) !== region) drawBorderBetween(graphics, hex, hex2);
                });
            });
        });

        this.sprite = this.game.add.sprite(0, 0, graphics.generateTexture());
        this.group.add(this.sprite);
        graphics.destroy();
    }

    render() {
        if (this.needsRedraw) {
            this.redraw();
        }
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
    RegionBorders,
    DebugInfo,
    HEX_WIDTH,
    HEX_HEIGHT,
    LINE_HEIGHT,
    OFFSET_TOP,
    OFFSET_LEFT,
    HEX_EDGE_SIZE 
};