import UIComponent from './UIComponent';
import { debounce } from 'lib/util';

export default function Button(spec, def) {
    let self = new UIComponent(spec, def);
    let {sprite} = def;
    let btn = spec.game.add.sprite(0, 0, 'core', sprite);
    btn.inputEnabled = true;
    self.add(btn);
    self.onInputUp = btn.events.onInputUp;
    self.onInputDown = btn.events.onInputDown;

    UIComponent.bindInputEvents(def,btn);

    if (def.onClicked) self.onInputUp.add(debounce(def.onClicked,UIComponent.INPUTEVENT_DEBOUNCE_INTERVAL,true));

    if (def.tooltip) {
        let {uiTooltips} = spec;
        btn.events.onInputOver.add(()=>{
            uiTooltips.showDelayed('UI_TOOLTIP', btn, def.tooltip);
        });
        btn.events.onInputOut.add(()=>{
            uiTooltips.hide();
        });    
    }

    self.setFrameName =(frame) => {
        btn.frameName = frame;
    };

    return self;
}