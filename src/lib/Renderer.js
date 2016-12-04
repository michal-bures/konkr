import log from 'loglevel';
import expect from 'expect';
import { OrderedHashMap } from 'lib/util';

const HEX_WIDTH = 32;
const HEX_HEIGHT = 37;
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
    
        /*
        var style = { font: "10px Courier New", fill: "white", align: "center"};
        this.label = game.add.text(HEX_WIDTH/2,HEX_HEIGHT/2,tile.id + "\n" + tile.position.r + "," + tile.position.c, style);
        this.label.lineSpacing = -6;
        this.label.anchor.set(0.5,0.5);
        this.addChild(this.label);
        */
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

export { Ground, DebugInfo, HEX_WIDTH, HEX_HEIGHT, LINE_HEIGHT };