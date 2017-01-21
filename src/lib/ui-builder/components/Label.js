import UIComponent from './UIComponent';
import { extend } from 'lib/util';

export default function Label(spec, def) {
    let self = new UIComponent(spec, def);
    let {text, style=spec.styles.get('LABEL')} = def;
    self._text= spec.game.add.text(0, 0, text || '',style);
    self._text.lineSpacing = -0.25;
    self._text.padding.y = -5;
    self.add(self._text);
    
    extend(self,{
        addColor(...args) {
            return self._text.addColor(...args);
        },
        resetColors() {
            self._text.colors=[];
        }
    });
    Object.defineProperty(self, 'text', {
        get() { return self._text.text; },
        set(val) { 
            if (self._text.text === val) return;
            self._text.text = val; 
            self.onResized.dispatch();
        }
    });
    return self;
}
