import UI from 'lib/controls/UI';
import { convertToWorldCoordinates, HEX_HEIGHT } from 'ui/Renderer';

function Popovers(spec) {
    
    let {game, players, economy, debug, styles} =spec;
    let group = game.make.group();

    let self = Object.freeze({
        show,
        hide,
        get group() { return group; }
    });

    let currentPopover = null;

    let uiFactory = {
        HEX_TOOLTIP(hex, {title, attributes, text}) {
           let [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
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

           return popoverUI(x,y, {
               component: 'verticalGroup',
               spacing: 0,
               contains: items,
           });
        } 
    };

    function popoverUI(x,y,...contents) {
        let ui = new UI(spec, {
            name: 'popover',
            component: 'popoverPanel',
            contains: contents,
            useWorldCoords: true,
            vOffset: 10,
            x:x,
            y:y,
        });

        //debug.sprite(ui.label);
        return ui.popover;

    }

    function show(type, ...args) {
        if (currentPopover) hide();

        let cfg = uiFactory[type];
        if (!cfg) throw `Unknown popover type: ${type}`;

        currentPopover = cfg(...args);

        group.add(currentPopover);
        currentPopover.hide();
        currentPopover.show();
    }

    function hide() {
        if (!currentPopover) return;
        group.remove(currentPopover);
        currentPopover.destroy();
    }

    return self;

}

export default Popovers;