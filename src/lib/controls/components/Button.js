import UIComponent from './UIComponent';
import { debounce } from 'lib/util';

export default function Button(spec, def) {
    let self = new UIComponent(spec, def);
    let {sprite} = def;
    let btn = spec.game.add.button(0, 0, sprite);
    btn.frame = def.frame || 0;
    self.onInputUp = btn.onInputUp;
    self.onInputDown = btn.onInputDown;
    self.add(btn);
    if (def.onClicked) self.onInputUp.add(debounce(def.onClicked,UIComponent.INPUTEVENT_DEBOUNCE_INTERVAL,true));

    if (def.tooltip) {
   }

    self.setFrame =(frame) => {
        btn.frame = frame;
    };

    return self;
}