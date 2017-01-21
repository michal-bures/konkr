import UIComponent from './UIComponent';
import { extend } from 'lib/util';

export default function PawnShop (spec, def) {
    let self = new UIComponent(spec, def);
    extend(self, {
        setStock(pawnTypeArray) {
            self.removeAll(true);
            self.addMultiple(pawnTypeArray.map(pawnType=>{
                const sprite = spec.pawnSprites.create(pawnType);
                sprite.inputEnabled = true;
                sprite.events.onInputDown.add(()=>{
                    spec.ui.buyPawn(pawnType);
                });
                return sprite;
            }));
            self.align(-1,1,32,32,Phaser.BOTTOM_CENTER);
            self.onResized.dispatch();
        }
    });
    return self;
}

