import expect from 'expect';

const HEX_WIDTH = 32;
const HEX_HEIGHT = 38;
const HALF_HEX_HEIGHT = Math.floor(HEX_HEIGHT/2);
const HALF_HEX_WIDTH = Math.floor(HEX_WIDTH/2);

const HEX_EDGE_SIZE = Math.floor(HEX_HEIGHT/2);

const LINE_HEIGHT = 28;//Math.floor(HEX_HEIGHT * 3/4);
const HALF_LINE_HEIGHT = 14.5;//Math.floor(HEX_HEIGHT * 3/8);

const OFFSET_TOP = 20;
const OFFSET_LEFT = 20;

function convertToWorldCoordinates(x,y) {
    return [ Math.floor(OFFSET_LEFT + HEX_WIDTH + x * HEX_WIDTH), Math.floor(OFFSET_TOP + y * LINE_HEIGHT + HALF_HEX_HEIGHT)];
}

function calculateWorldBounds(grid) {
    return new Phaser.Rectangle(0,0,
        grid.width * HEX_WIDTH + OFFSET_LEFT*2 + HALF_HEX_WIDTH,
        grid.height * LINE_HEIGHT + OFFSET_TOP*2 + HEX_HEIGHT-LINE_HEIGHT);
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

function GrabbedPawn(spec) {
    const {game, players, pawnSprites, log} = spec;

    let group = game.make.group(),
        sprite = pawnSprites.create();

    sprite.fixedToCamera = true;
    group.add(sprite);
    group.visible = false;

    return Object.freeze({
        group,
        synchronize,
        update,
    });

    function synchronize() {
        const pawnType = players.grabbedPawn;
        if (pawnType) {
            sprite.setType(pawnType);
            group.visible = true;
        } else {
            group.visible = false;
        }

    }

    function update() {
        synchronize();
        if (!group.visible) return;
        sprite.cameraOffset.x = game.input.activePointer.x;
        sprite.cameraOffset.y = game.input.activePointer.y-10;
    }

}

function LandSprites(spec) {
    const {game, grid, gameState, regions} = spec;
    
    //public
    let landSprites = Object.freeze({
        render,
        refreshHexes,
        synchronize,
        get group() { return group; }
    });

    //private
    let group = game.make.group(),
        hexToSprite = {},
        requiresSorting = false; // true => need to resort group before next render

    function synchronize() {
        for (const hexId in hexToSprite) {
            if (!grid.getHexById(hexId)) {
                hexToSprite[hexId].destroy();
                delete hexToSprite[hexId];
            }
        }
        refreshHexes(grid.allHexes());
    }

    function refreshHexes(hexes) {
        hexes.forEach( hex => {
            if (hexToSprite[hex.id]) {
                hexToSprite[hex.id].refresh();
            } else {
                let sprite = new LandSprite(hex);
                group.add(sprite);
                hexToSprite[hex.id] = sprite;
                requiresSorting = true;
            }
        });
    }

    function render() {
        if (requiresSorting) {
            requiresSorting = false;
            group.sort('y', Phaser.Group.SORT_ASCENDING);
        }
    }

    class LandSprite extends Phaser.Image {
        constructor(hex) {
            const [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
            super(game, x, Math.floor(y-HEX_HEIGHT/2), 'hex');
            this.anchor.setTo(0.5,0);
            this.frame=regions.factionOf(hex) || 0;
            this.hexId = hex.id;
            //log.debug(`Hex sprite for ${hex} created at ${x}:${y}`);
            /*
            var style = { font: "12px Courier New", fill: "white", align: "center"};
            this.label = game.add.text(HEX_WIDTH/2,HEX_HEIGHT/2,hex.id, style);
            this.label.alpha=0.5;
            this.label.lineSpacing = -6;
            this.label.anchor.set(0.5,0.5);
            this.addChild(this.label);*/
        }

        refresh() {
            const hex = grid.getHexById(this.hexId);
            this.visible = !!hex;
            if (hex) {
                this.frame=regions.factionOf(hex);
                const [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
                this.x=x;
                this.y=Math.floor(y-HEX_HEIGHT/2);

            }
        }
    }

    return landSprites;
}

function FeedbackSymbols({game, tweens, warfare, log, debug, regions}) {
    //public
    let self = Object.freeze({
        showDefendersOf,
        showDefendedBy,
        add,
        get group() { return group; }
    });

    //private
    let group = game.make.group();

    function cleanup(sprite) {
        group.remove(sprite);
        sprite.destroy();
    }

    function showDefendersOf(hex, minMight=0) {
        warfare.defendersOf(hex, minMight).forEach(defender=> {
            add(defender, hex, 'shield-red', 'BOUNCE_BACK');
        });
    }

    function showDefendedBy(hex, might=99) {
        hex.neighbours()
           .filter(hex2=>regions.regionOf(hex2) === regions.regionOf(hex) &&
                         warfare.defenseOf(hex2)<might)
           .forEach(hex2=> add(hex, hex2, 'shield-blue', 'FADE'));
    }

    function add(fromHex, toHex, frame, effect) {
        const [fx,fy] = convertToWorldCoordinates(fromHex.position.x, fromHex.position.y);
        const [tx,ty] = convertToWorldCoordinates(toHex.position.x, toHex.position.y);
        const sprite = game.add.sprite(fx,fy,'core', frame);
        group.add(sprite);
        sprite.alpha = 0;
        sprite.anchor.set(0.46); // due to the icon having odd width, setting anchor to 0.5 causes bad artifact with disabled smoothing
        let t1 = tweens.add(sprite).to({x:tx, y:ty, alpha: 1}, 200, Phaser.Easing.Quadratic.Out, true);

        switch (effect) {
            case 'BOUNCE_BACK':
                t1.yoyo(200).onComplete.add(cleanup);
                break;
            case 'FADE':
                let t2 =tweens.add(sprite).to({alpha:0}, 1000);
                t1.chain(t2);
                t2.onComplete.add(cleanup);
                break;
            default: 
                t1.onComplete.add(cleanup);
        }
    }

    return self;
}

class RegionBorders {
    constructor({game, regions, gameState}) {
        this.regions = regions;
        this.game = game;
        this.needsRedraw = true;
        this.group = game.make.group();

        regions.onHexesChangedOwner.add(() => { this.needsRedraw = true; });
        gameState.onReset.add(() => { this.needsRedraw = true; });        
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
    let group = game.make.group(),
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
        sprite = game.make.sprite(x,y, graphics.generateTexture());
        group.add(sprite);
        graphics.destroy();
    }
}


function ConquerableHexesHighlight({game,ui, players, warfare}) {
    let group = game.make.group(),
        sprite = null;

    players.onGrabbedPawn.add(redraw);
    players.onBoughtPawn.add(redraw);
    players.onDroppedPawn.add(redraw);

    return Object.freeze({
        get group() { return group; },
        synchronize
    });

    function synchronize()  {
        redraw();
    }

    function redraw() {
        let region = players.grabbedPawnRegion;
        let grabbedPawnType = players.grabbedPawn;
        if (sprite) {
            sprite.destroy();
            sprite = null;
        }
        if (!region || !grabbedPawnType) return;
        const graphics = game.add.graphics(0,0);
        graphics.beginFill(0x000000);
        graphics.lineStyle(2, 0xcc0000, 1);
        graphics.fillAlpha=1;
        graphics.endFill();
        let hexes = region.hexes.neighbours().filter(hex=>warfare.defenseOf(hex) < grabbedPawnType.might);
        hexes.forEach(hex => {
            drawHexBorders(graphics, hex, i => 
                !hex.neighbour(i) || 
                (!hexes.contains(hex.neighbour(i)) &&
                !region.hexes.contains(hex.neighbour(i))));
        });
        const {x,y} = graphics.getBounds();
        sprite = game.make.sprite(x,y, graphics.generateTexture());
        group.add(sprite);
        graphics.destroy();
    }
}

export { 
    calculateWorldBounds,
    convertToWorldCoordinates,
    drawOnHex,
    drawInnerHex,
    FeedbackSymbols,
    GrabbedPawn,
    LandSprites, 
    RegionBorders,
    SelectedRegionHighlight,
    ConquerableHexesHighlight,
    HEX_WIDTH,
    HEX_HEIGHT,
    LINE_HEIGHT,
    HALF_LINE_HEIGHT,
    OFFSET_TOP,
    OFFSET_LEFT,
    HEX_EDGE_SIZE 
};