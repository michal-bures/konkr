import UIComponent from './UIComponent';
import { extend } from 'lib/util';

export default function HorizontalGroup (spec, def) {
    let self = new UIComponent(spec, def);
    let spacing = def.spacing || 0;

    extend(self, {
        reflowChildren() {
            let x = 0;
            self.childComponents.forEach(member => {
                const clientRect = new Phaser.Rectangle(x,0,member.width,self.height);
                member.reflow(clientRect);
                x+=spacing + member.width;
            });            
        }
    });
    self.onChildResized.add(()=> {
        self.reflowChildren();
        self.onResized.dispatch();
    });    

    return self;
}
