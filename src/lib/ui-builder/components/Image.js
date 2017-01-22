import UIComponent from './UIComponent';
import { debounce } from 'lib/util';

export default function Image(spec, def) {
    
    let self = new UIComponent(spec, def);
    let {src='imageBackground'} = def;
    self.anchorObject=self.add(spec.game.add.image(0, 0, 'core', src));

    if (def.onClicked) {
        self.anchorObject.inputEnabled=true;
        self.anchorObject.events.onInputUp.add(debounce(def.onClicked,UIComponent.INPUTEVENT_DEBOUNCE_INTERVAL,true));
    }

    return self;
}