import { HEX_WIDTH, HEX_HEIGHT, LINE_HEIGHT } from 'ui/Renderer';

class TileSelectionProxy extends Phaser.Image {
    constructor({game,grid,debug,ground,log,regions}) {
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
        this.events.onInputDown.add(() => {
            const hex = this.getHexUnderCursor();
            log.info(`${hex}
Faction: ${regions.factionOf(hex)}
Region:  ${regions.regionOf(hex)}`);
        });
    }

    update() {
        super.update(...arguments);
        if (this.active) {
            this.ground.highlightTiles([this.getHexUnderCursor()]);
        }
    }

    getHexUnderCursor() {
        let x = (this.game.input.mousePointer.worldX - 10) / HEX_WIDTH;
        let y = (this.game.input.mousePointer.worldY - 10) / LINE_HEIGHT;

        let dx = x % 1;
        let dy = y % 1;

        let centerX, centerY;

        //this.debug.set("pointer-at",x.toFixed(2) + "," +y.toFixed(2));

        if (Math.floor(y) % 2) {
            //A
            if (dx < 0.5) {
                if (dy < (1-(2*dx))/3) {
                    //this.debug.set("section","top-left");
                    centerX = Math.floor(x);
                    centerY = Math.floor(y) - 1/3;
                } else {
                    //this.debug.set("section","bottom");
                    centerX = Math.floor(x) + 0.5;
                    centerY = Math.floor(y) + 2/3;
                }
            } else {
                if (dy < 1/3-(2*(1-dx)/3)) {
                    //this.debug.set("section","top-right");
                    centerX = Math.floor(x) + 1;
                    centerY = Math.floor(y) - 1/3;
                } else {
                    //this.debug.set("section","bottom");
                    centerX = Math.floor(x) + 0.5;
                    centerY = Math.floor(y) + 2/3;
                }
            }
        } else {
            //B
            if (dx < 0.5) {
                if (dy < (2*dx)/3) {
                    //this.debug.set("section","top");
                    centerX = Math.floor(x) + 1/2;
                    centerY = Math.floor(y) - 1/3;
                } else {
                    //this.debug.set("section","bottom-left");
                    centerX = Math.floor(x);
                    centerY = Math.floor(y) + 2/3;
                }
            } else {
                if (dy < 2/3-(2*(dx)/3)) {
                    //this.debug.set("section","top");
                    centerX = Math.floor(x) + 1/2;
                    centerY = Math.floor(y) - 1/3;
                } else {
                    //this.debug.set("section","bottom-right");
                    centerX = Math.floor(x) + 1;
                    centerY = Math.floor(y) + 2/3;
                }
            }                
        }

        centerX = centerX - 1;
        centerY = centerY - 2/3;
        let r = Math.round(centerY);
        let c = Math.round(centerX + (centerY / 2)); 

        return this.grid.getHexByAxial(r,c);
    }

}


export default TileSelectionProxy;