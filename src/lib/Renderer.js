import log from 'loglevel';
import expect from 'expect';
import { OrderedHashMap } from 'lib/util';

const HEX_WIDTH = 128;
const HEX_HEIGHT = 148;
const HEX_SIZE = HEX_HEIGHT/2;
const OFFSET_TOP = 10;
const OFFSET_LEFT = 10 + HEX_WIDTH/2;

const LINE_HEIGHT = HEX_HEIGHT * 3/4;




class Ground {
    constructor(env) {
        const {game, grid} = env;
        expect(game).toExist();
        expect(grid).toExist();
        this.grid = grid;
        this.game = game;
        this.group = game.add.group();
        this.tileToSprite = {};
        this.grid.map((hex) => {
            if (hex) {
                var sprite = new GroundTileSprite(env,hex);
                this.group.add(sprite);
                this.tileToSprite[hex.id] = sprite;
            }
        });

        this.highlightedTiles = [];
    }

    getGroup() {
        return this.group;
    }

    highlightTiles(tiles) {
        var self = this;
        log.debug("tiles", tiles);
        this.highlightedTiles.forEach((tileSprite) => {
            if (tileSprite) tileSprite.frame = 0;
        });
        this.highlightedTiles = tiles.map((tile) => tile && self.tileToSprite[tile.id]);
        this.highlightedTiles.forEach((tileSprite) => {
            if (tileSprite) tileSprite.frame = 1;
        });
    }
}

class GroundTileSprite extends Phaser.Sprite {
    constructor({game, log},tile) {
        const x = OFFSET_LEFT + tile.position.x * HEX_WIDTH;
        const y = OFFSET_TOP + tile.position.y * LINE_HEIGHT;
        super(game, x, y, 'hex');
        log.debug(`Hex sprite for ${tile} created at ${x}:${y}`);
    
        //add letter to my sprite
        var style = { font: "10px Arial", fill: "#666666", align: "center"};
        this.label = game.add.text(HEX_WIDTH/2,HEX_HEIGHT/2,tile.id + "\n" + tile.position.r + "," + tile.position.c, style);
        this.label.lineSpacing = -6;
        this.label.anchor.set(0.5,0.5);
        this.addChild(this.label);

    }
}

class DebugInfo {
    constructor({game}) {
        this.game = game;
        this.items = new OrderedHashMap();
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

class TileSelectionProxy extends Phaser.Image {
    constructor({game,grid,debug,ground}) {
        super(game,10,10);

        this.debug = debug;
        this.game = game;
        this.grid = grid;
        this.ground = ground;
        this.active = false;
        this.fixedToCamera = true;
        this.width = game.width - 2 * 10;
        this.height = game.height - 2 * 10;
        this.inputEnabled = true;
        
        this.events.onInputOver.add(() => this.active = true);
        this.events.onInputOut.add(() => this.active = false);
        this.events.onInputDown.add(() => console.log("INPUT DOWN ",a,b,c));
    }

    update() {
        super.update(...arguments);
        if (this.active) {
            let x = this.game.input.mousePointer.worldX - 10 - HEX_WIDTH;
            x/=HEX_WIDTH;
            let y = this.game.input.mousePointer.worldY - 10 - HEX_HEIGHT / 2;
            y/=LINE_HEIGHT;
            let r = y;
            let c = x + (y / 2);

            let candidates = [[Math.floor(r), Math.floor(c)],
                          [Math.floor(r), Math.ceil(c)],
                          [Math.ceil(r), Math.floor(c)],
                          [Math.ceil(r), Math.ceil(c)]];
            console.log(candidates);
            let max = 1;
            let rr;
            let rc;
            candidates.forEach((coord) => {
                var cr = coord[0];
                var cc = coord[1];
                var dr = Math.abs(cr - r);
                var dc = Math.abs(cc - c);
                const d = Math.sqrt(dr*dr + dc*dc);
                console.log(`dist from ${cr},${cc} to ${r.toFixed(1)},${c.toFixed(1)} is ${d}` );
                if (d < max) {
                    max = d;
                    rr = coord[0];
                    rc = coord[1];
                }
            });

            //let q = Math.round((x * Math.sqrt(3)/3 - y / 3) / HEX_SIZE);
            this.debug.set("pointer-at",x.toFixed(2) + "," +y.toFixed(2));
            this.debug.set("axial",r.toFixed(2) + ',' + c.toFixed(2));
            this.ground.highlightTiles([this.grid.getHexByAxial(rr,rc)]);
        } else {
            this.debug.set("pointer-at","N/A");
        }
    }
}



export { Ground, TileSelectionProxy, DebugInfo, HEX_WIDTH, HEX_HEIGHT };