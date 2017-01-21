import UIComponent from './UIComponent';
import { debounce, extend } from 'lib/util';

export default function DecoratorPanel(spec, def) {
    let self = new UIComponent(spec, def);
    let { game, debug, ui } = spec;
    let { padding=UIComponent.DEFAULT_PADDING } = def;

    let bgSprite = spec.game.add.image(0,0,'paneBackground');
    self.add(bgSprite);

    if (def.onClicked) {
        self.inputEnabled=true;
        self.onInputUp.add(debounce(def.onClicked,UIComponent.INPUTEVENT_DEBOUNCE_INTERVAL,true));
    }

    extend(self, {
        reflowChildren() {
            let target = self.childComponents[0];
            if (target) target.reflow(getChildRect());
        },
    });

    function updateSize() {
        let target = self.childComponents[0];
        if (!target) return;

        if (def.stretchHorizontally) {
            bgSprite.width = (self.fixedToCamera ? game.width : self.parentGroup.width);
        } else {
            bgSprite.width = target.width + 2*padding;
        }

        if (def.stretchVertically) {
            bgSprite.height = (self.fixedToCamera ? game.height : self.parentGroup.height);
        } else {
            bgSprite.height = target.height + 2*padding;
        }            
        self.onResized.dispatch();
    }

    function getChildRect() {
        return new Phaser.Rectangle(padding,
                                    padding,
                                    self.width-2*padding,
                                    self.height-2*padding);
    }

    if (def.stretchHorizontally || def.stretchVertically) {
        ui.onResize.add(()=>updateSize());
    }


    self.onChildResized.add(()=> {
        self.reflowChildren();
        updateSize();
    });

    return self;
}