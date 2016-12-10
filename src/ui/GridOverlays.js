import { assertDefined } from 'lib/util';
import { drawInnerHex } from 'ui/Renderer';

function GridOverlays({game, grid, log, regions}) {
    
    let overlays = {},
        group = game.add.group(),
        currentOverlay = null,
        dirty = true;

    const self = Object.freeze({
        configureOverlay,
        show,
        refresh,
        hide,
        render,
        get group() { return group; }
    });

    regions.onHexesChangedOwner.add(() => dirty=true);

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
        dirty = false;
        if (currentOverlay) {
            currentOverlay.refresh();
        }
    }

    function hide() {
        group.removeChildren();
    }

    function render() {
        if (dirty) refresh();
    }

    class Overlay {
        constructor({name, func, color, min, max}) {
            this.sprite = null;
            this.func = func;
        }

        refresh() {
            //  Create a nice and complex graphics object
            const graphics = game.add.graphics(0, 0);

            graphics.beginFill(0x000000);
            graphics.fillAlpha=0;
            graphics.drawRect(0,0,1,1);
            graphics.fillAlpha=0.7;

            grid.forEach(hex=>{
                drawInnerHex(graphics,hex, this.func(hex));
            });

            if (this.sprite) {
                this.sprite.loadTexture(graphics.generateTexture());
            } else {
                this.sprite = game.add.sprite(0, 0, graphics.generateTexture());
            }
            graphics.destroy();
        }
    }

    return self;
}

export default GridOverlays;