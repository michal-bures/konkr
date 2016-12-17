import { assertDefined, OrderedMap } from 'lib/util';
import { drawInnerHex } from 'ui/Renderer';

function GridOverlays({game, grid, log, debug, regions, gameState}) {
    
    let overlays = new OrderedMap(),
        group = game.add.group(),
        currentOverlay = null,
        dirty = true,
        enabled = false;

    const self = Object.freeze({
        configureOverlay,
        show,
        refresh,
        hide,
        render,
        toDebugString,
        get group() { return group; }
    });

    regions.onHexesChangedOwner.add(() => dirty=true);
    gameState.onReset.add(()=>dirty=true);

    function configureOverlay(overlayDefinition) {
        assertDefined(overlayDefinition, overlayDefinition.name);
        const newOverlay = new Overlay(overlayDefinition);
        overlays.push(overlayDefinition.name,newOverlay);
        if (!currentOverlay || currentOverlay.name === newOverlay.name) {
            currentOverlay = newOverlay;
            dirty = true;
        }
    }

    function toDebugString() {
        let ret = [];
        overlays.forEach((name,overlay)=> {
            ret.push(`${overlay === currentOverlay?(group.children.length?'(👁)':'( )'): '   '}  ${name} `);
        });
        return ret.join('\n');
    }
    debug.addCommand('gridOverlays','toggle', () => {
        if (group.children.length) {
            hide();
        } else {
            if (!overlays.length) return;
            if (!currentOverlay) currentOverlay = overlays[0];
            show(currentOverlay.name);
        }
    });
    debug.addCommand('gridOverlays','next', () => {
        if (!overlays.length) return;
        if (!currentOverlay) return show(overlays[0].name);
        let i = (overlays.indexOfKey(currentOverlay.name)+1) % overlays.length;
        show(overlays.at(i).name);
    });

    function show(name) {
        enabled = true;
        const overlay = overlays.get(name);
        if (!overlay) throw Error("No such overlay: "+name);
        currentOverlay = overlay;
        overlay.refresh();
        assertDefined(overlay.sprite);
        log.info("Overlay: " + name);
    }

    function refresh() {
        dirty = false;
        if (currentOverlay) {
            currentOverlay.refresh();
        }
    }

    function hide() {
        enabled = false;
        group.removeChildren();
    }

    function render() {
        if (dirty && enabled) refresh();
    }

    class Overlay {
        constructor({name, valuation, color, min, max}) {
            assertDefined(name, valuation);
            this.sprite = null;
            this.valuation = valuation;
            this.name = name;
        }

        refresh() {
            //  Create a nice and complex graphics object
            const graphics = game.make.graphics(0, 0);

            graphics.beginFill(0x000000);
            graphics.fillAlpha=0;
            graphics.drawRect(0,0,1,1);
            graphics.fillAlpha=0.7;

            grid.forEach(hex=>{
                drawInnerHex(graphics,hex, this.valuation.get(hex) || 0);
            });

            if (this.sprite) {
                this.sprite.loadTexture(graphics.generateTexture());
            } else {
                this.sprite = game.make.sprite(0, 0, graphics.generateTexture());
            }
            group.removeChildren();
            group.add(this.sprite);
            graphics.destroy();
        }
    }

    return self;
}

export default GridOverlays;