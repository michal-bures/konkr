import { assertDefined } from 'lib/util';
import { drawInnerHex } from 'ui/Renderer';

function GridOverlays({game, grid, log}) {
    
    let overlays = {},
        group = game.add.group(),
        currentOverlay = null;

    const self = Object.freeze({
        configureOverlay,
        show,
        refresh,
        hide,
        get group() { return group; }
    });

    function configureOverlay(overlayDefinition) {
        assertDefined(overlayDefinition, overlayDefinition.name);
        overlays[overlayDefinition.name] = new Overlay(overlayDefinition);
    }

    function show(name) {
        const overlay = overlays[name];
        if (!overlay) throw Error("No such overlay: "+name);
        currentOverlay = overlay;
        overlay.refresh();
        assertDefined(overlay.sprite);
        hide();
        group.add(overlay.sprite);
    }

    function refresh() {
        if (currentOverlay) {
            currentOverlay.refresh();
        }
    }

    function hide() {
        group.removeChildren();
    }

    class Overlay {
        constructor({name, func, color, min, max}) {
            this.sprite = null;
            this.func = func;
            refresh();
        }

        refresh() {
            //  Create a nice and complex graphics object
            const graphics = game.add.graphics(0, 0);

            graphics.beginFill(0x000000);
            graphics.fillAlpha=1;
            graphics.drawRect(0, 0, 10, 10);

            grid.forEach(hex=>{
                drawInnerHex(graphics,hex, this.func(hex));
            });

            this.sprite = game.add.sprite(0, 0, graphics.generateTexture());
            graphics.destroy();
        }

    }

    return self;
}

export default GridOverlays;