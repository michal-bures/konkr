import UI from 'lib/controls/UI';
import { convertToWorldCoordinates, HEX_HEIGHT } from 'ui/Renderer';

function Popovers(spec) {
    
    let {game, players, economy, debug} =spec;
    let group = game.make.group();

    let self = Object.freeze({
        show,
        hide,
        get group() { return group; }
    });

    let currentPopover = null;

    let uiFactory = {
        HEX_TOOLTIP(hex, text) {
           let [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);
           return popoverUI(x,y, {
               name: 'label',
               component: 'label',
               text: text,
           });
        } 
    };

    function popoverUI(x,y,...contents) {
        let ui = new UI(spec, {
            name: 'main',
            component: 'popoverPanel',
            contains: contents,
            useWorldCoords: true,
            vOffset: 10,
            x:x,
            y:y,
        });

        //debug.sprite(ui.label);
        return ui.main;

    }

    function show(type, ...args) {
        if (currentPopover) hide();

        let cfg = uiFactory[type];
        if (!cfg) throw `Unknown popover type: ${type}`;

        currentPopover = cfg(...args);

        group.add(currentPopover);
//        currentPopover.show();
    }

    function hide() {
        if (!currentPopover) return;
        group.remove(currentPopover);
        currentPopover.destroy();
    }

    return self;

}

export default Popovers;