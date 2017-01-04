import { HEX_WIDTH, HEX_HEIGHT, LINE_HEIGHT, HALF_LINE_HEIGHT, OFFSET_TOP, OFFSET_LEFT, convertToWorldCoordinates } from 'ui/Renderer';

import InputProxy from 'lib/controls/InputProxy';

function HexSelectionProxy(spec) {
    let {game,grid,debug,log,regions,pawns,ui, warfare, players, scrolling} = spec;

    let active = false,
        proxy = new InputProxy(game),
        group = game.make.group(null);

    group.add(proxy);

    proxy.events.onInputOver.add(() => active = true);
    proxy.events.onInputOut.add(() => active = false);
    proxy.events.onInputUp.add((target, pointer) => {
        if (!pointer.rightButton.isDown && !scrolling.isActive) {
            const hex = getHexUnderCursor();
            if (hex) ui.selectHex(hex);
        }
    });

    //public
    return Object.freeze({
        update,
        getHexUnderCursor,
        toDebugString,
        get group() { return group; }
    });

    function toDebugString() {
        const hex = getHexUnderCursor();
        if (!hex) return `Under cursor: (nothing)`;

        let ret = [];
        for (let key in debug.valuations) {
            ret.push(`${key}: ${debug.valuations[key].get(hex)}`);
        }
        const [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);

        return `
Cursor world coords: ${game.input.activePointer.worldX},${game.input.activePointer.worldY}
Under cursor: ${hex} (${x}, ${y})
Player: ${players.ownerOf(regions.regionOf(hex))}
Faction: ${regions && regions.factionOf(hex)}
Region:  ${regions && regions.regionOf(hex)}
Pawn: ${pawns.pawnAt(hex)}

${ret.join('\n')}`;
    }

    function update() {
        if (active) {
            const hex = getHexUnderCursor();
            const pawn = hex && pawns.pawnAt(hex);
            const region = hex && regions.regionOf(hex);
            const str = [
                `${game.input.activePointer.x},${game.input.activePointer.y} ->`,
                `${game.input.activePointer.worldX},${game.input.activePointer.worldY}`,
                (pawn?'♙'+pawn.id:null),
                (region?'♔'+region.id:null),
                (hex?hex.toString():null),
            ];
            if (spec.inDebugMode) debug.set('ptr',str.filter(x=>x).join(' '));
        }
    }

    function getHexUnderCursor() {
        let x = (game.input.activePointer.worldX - OFFSET_LEFT) / HEX_WIDTH;
        let y = (game.input.activePointer.worldY - OFFSET_TOP) / LINE_HEIGHT;

        let dx = x % 1;
        let dy = y % 1;

        let centerX, centerY;

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