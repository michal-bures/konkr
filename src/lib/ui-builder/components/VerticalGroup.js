import UIComponent from './UIComponent';
import { extend } from 'lib/util';

export default function VerticalGroup (spec, def) {
    let self = new UIComponent(spec, def);
    let spacing = def.spacing || 0;

    extend(self, {
        reflowChildren() {
            let y = 0;
            self.childComponents.forEach(member => {
                const clientRect = new Phaser.Rectangle(0,y,self.width, member.height);
                member.reflow(clientRect);
                y+=spacing + member.height;
            });            
        }
    });
    self.onChildResized.add(()=> {
        self.reflowChildren();
        self.onResized.dispatch();
    });

    return self;
}
