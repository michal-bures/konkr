import { HEX_WIDTH, LINE_HEIGHT, OFFSET_TOP, OFFSET_LEFT } from 'ui/Renderer';

function HexSelectionProxy(spec) {
    let {game,grid,debug,landSprites,log,regions,pawns,uiRegionPanel, warfare} = spec;

    let active = false,
        image = initImage(),
        group = game.add.group(null);

    group.add(image);

    //public
    return Object.freeze({
        update,
        getHexUnderCursor,
        get group() { return group; }
    });

    function initImage() {
        let surface = new Phaser.Image(game,0,0, null);
        surface.inputEnabled = true;
        surface.fixedToCamera = true;
        surface.width = game.width;
        surface.height = game.height;
        surface.events.onInputOver.add(() => active = true);
        surface.events.onInputOut.add(() => active = false);
        surface.events.onInputDown.add(() => {
            const hex = getHexUnderCursor();
            uiRegionPanel.setRegion(regions.regionOf(hex));
            log.info(`${hex}
Faction: ${regions.factionOf(hex)}
Region:  ${regions.regionOf(hex)}
Pawn: ${pawns.pawnAt(hex)}
Defense: ${warfare.defenseOf(hex)}`);
        });
        return surface;
    }

    function update() {
        if (active) {
            landSprites.highlightTiles([getHexUnderCursor()]);
        }
    }

    function getHexUnderCursor() {
        let x = (game.input.activePointer.worldX - OFFSET_LEFT) / HEX_WIDTH;
        let y = (game.input.activePointer.worldY - OFFSET_TOP) / LINE_HEIGHT;

        let dx = x % 1;
        let dy = y % 1;

        let centerX, centerY;

        //debug.set("pointer-at",x.toFixed(2) + "," +y.toFixed(2));

        if (Math.floor(y) % 2) {
            //A
            if (dx < 0.5) {
                if (dy < (1-(2*dx))/3) {
                    //debug.set("section","top-left");
                    centerX = Math.floor(x);
                    centerY = Math.floor(y) - 1/3;
                } else {
                    //debug.set("section","bottom");
                    centerX = Math.floor(x) + 0.5;
                    centerY = Math.floor(y) + 2/3;
                }
            } else {
                if (dy < 1/3-(2*(1-dx)/3)) {
                    //debug.set("section","top-right");
                    centerX = Math.floor(x) + 1;
                    centerY = Math.floor(y) - 1/3;
                } else {
                    //debug.set("section","bottom");
                    centerX = Math.floor(x) + 0.5;
                    centerY = Math.floor(y) + 2/3;
                }
            }
        } else {
            //B
            if (dx < 0.5) {
                if (dy < (2*dx)/3) {
                    //debug.set("section","top");
                    centerX = Math.floor(x) + 1/2;
                    centerY = Math.floor(y) - 1/3;
                } else {
                    //debug.set("section","bottom-left");
                    centerX = Math.floor(x);
                    centerY = Math.floor(y) + 2/3;
                }
            } else {
                if (dy < 2/3-(2*(dx)/3)) {
                    //debug.set("section","top");
                    centerX = Math.floor(x) + 1/2;
                    centerY = Math.floor(y) - 1/3;
                } else {
                    //debug.set("section","bottom-right");
                    centerX = Math.floor(x) + 1;
                    centerY = Math.floor(y) + 2/3;
                }
            }                
        }

        centerX = centerX - 1;
        centerY = centerY - 2/3;
        let r = Math.round(centerY);
        let c = Math.round(centerX + (centerY / 2)); 

        return grid.getHexByAxial(r,c);
    }

}


export default HexSelectionProxy;