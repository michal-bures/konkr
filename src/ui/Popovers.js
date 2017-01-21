import { convertToWorldCoordinates, HEX_HEIGHT } from 'ui/Renderer';

const DEFAULT_TOOLTIP_DELAY = 750;
const NO_DELAYS_EXPIRATION_INTERVAL = 1000;

function Popovers(spec) {
    
    let {game, players, economy, debug, styles, ui} =spec;
    let group = game.make.group();
    let delayedShowTimer = null,
        noDelaysExpirationTimer = null,
        noDelays = false;


    let self = Object.freeze({
        show,
        showDelayed,
        hide,
        tooltipDelay: DEFAULT_TOOLTIP_DELAY,
        get group() { return group; },
        toDebugString
    });

    let currentPopover = null;

    function buildTooltipContent({title, attributes, text}) {
           let items = [];
           if (title) items.push({
                component: 'label',
                align: Phaser.LEFT_CENTER,
                text: title,
                style: styles.get("TOOLTIP_TITLE")
           });
           if (attributes) items.push({
                component: 'label',
                align: Phaser.LEFT_CENTER,
                text: attributes,
                style: styles.get("TOOLTIP_ATTRIBUTES")
           });
           if (text) items.push({
                align: Phaser.LEFT_CENTER,
                component: 'label',
                text: text,
                style: styles.get("TOOLTIP_TEXT")
           });
           return items;      
    }

    let uiFactory = {
        HEX_TOOLTIP(hex, opts) {
           let [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);

           return popoverUI({x,y}, {
                component: 'verticalGroup',
                spacing: 3,
                contains: buildTooltipContent(opts),
           });
        },
        BUY_PAWN_TOOLTIP(sprite, opts) {
            let x = sprite.world.x - game.camera.view.x;
            let y = sprite.world.y - game.camera.view.y;
            return popoverUI({x,y, fixedToCamera:true}, {
                component: 'verticalGroup',
                spacing: 3,
                contains: buildTooltipContent(opts),
            });
        },
        UI_TOOLTIP(sprite, text) {
            let x = sprite.world.x + sprite.width/2 - game.camera.view.x;
            let y = sprite.world.y - game.camera.view.y;
            return popoverUI({x,y, fixedToCamera:true,vOffset:0}, {
                component: 'verticalGroup',
                spacing: 3,
                contains: [{
                    align: Phaser.LEFT_CENTER,
                    component: 'label',
                    text: text,
                    style: styles.get("TOOLTIP_TEXT")
                }],
            });
        }
    };

    function popoverUI({x,y,fixedToCamera,vOffset=10},...contents) {
        const components = ui.build( {
            name: 'popover',
            component: 'popoverPanel',
            contains: contents,
            useWorldCoords: !fixedToCamera,
            padding: 5,
            vOffset,
            x:x,
            y:y,
        });

        //debug.sprite(ui.label);
        return components.popover;

    }

    function show(type, ...args) {
        if (currentPopover) hide();

        let cfg = uiFactory[type];
        if (!cfg) throw `Unknown popover type: ${type}`;

        currentPopover = cfg(...args);

        group.add(currentPopover);
        currentPopover.show();
    }

    function showDelayed(type, ...args) {
        delayedShowTimer = setTimeout(()=> {
            show(type, ...args);
            temporarilySkipDelays();
            delayedShowTimer = null;
        }, (noDelays?0:self.tooltipDelay));
    }

    function hide() {
        if (delayedShowTimer) {
            clearTimeout(delayedShowTimer);
            delayedShowTimer = null;
        }
        if (!currentPopover) return;
        group.remove(currentPopover);
        currentPopover.destroy();
    }

    function toDebugString() {
        return `current popover: ${currentPopover}`;
    }

    function temporarilySkipDelays() {
        noDelays = true;
        if (noDelaysExpirationTimer) clearTimeout(noDelaysExpirationTimer);
        noDelaysExpirationTimer = setTimeout(()=> {
            noDelays = false;
        }, NO_DELAYS_EXPIRATION_INTERVAL);
    }

    return self;

}

export default Popovers;