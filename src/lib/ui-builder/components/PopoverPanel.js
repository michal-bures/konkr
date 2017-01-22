import UIComponent from './UIComponent';
import UIAnimator from '../UIAnimator';

export default function PopoverPanel(spec, def) {
    const {game,log} = spec;
    let self = new UIComponent(spec, def);
    let pointerSprite = spec.game.add.image(0,0,'core','popoverPointer');
    pointerSprite.anchor.set(0.5,1);
    let bgSprite = null;
    self.add(pointerSprite);
    self.animator = UIAnimator.popup(spec, self, def.x,def.y);

    self.reflowSelf=() => {
    };
    self.reflowChildren=()=> {
        if (!self.childComponents.length) return;
        const comp = self.childComponents[0];
        const padding = def.padding || UIComponent.DEFAULT_PADDING;
        const inverted = def.y-comp.height-Math.abs(pointerSprite.height)-padding*2 < game.camera.view.y + UIComponent.SCREEN_PADDING;
        pointerSprite.scale.y = (inverted?-1:1);
        pointerSprite.x = def.x;
        pointerSprite.y = def.y+(def.vOffset||0)*(inverted?1:-1);
        const rect = getPanelRect(inverted);
        redrawRect(rect);
        bgSprite.x = rect.x;
        bgSprite.y = rect.y;
        bgSprite.width = rect.width;
        bgSprite.height = rect.height;
        rect.inflate(-2*padding, -2*padding);
        comp.reflow(rect);
        if (self.fixedToCamera) {
            self.cameraOffset.x = def.x;
            self.cameraOffset.y = def.y;
        }
    };

    function redrawRect(rect) {
        const graphics = game.add.graphics(rect.x, rect.y);
        graphics.beginFill(0xFFFFFF);
        graphics.lineStyle(2, 0x000000, 1);
        graphics.fillAlpha=0.8;
        graphics.drawRoundedRect(0, 0, rect.width-2, rect.height-2, 8);
        if (bgSprite) bgSprite.destroy();
        bgSprite = game.make.image(rect.x,rect.y,graphics.generateTexture());
        graphics.destroy();
        self.add(bgSprite, false, 0);
    }

    function getPanelRect(inverted) {
        const comp = self.childComponents[0];
        const padding = def.padding || UIComponent.DEFAULT_PADDING;
        const panelHeight = comp.height+2*padding;
        // Math.abs needed since height can be negative when scale is negative
        let y = def.y + ((def.vOffset||0)+Math.abs(pointerSprite.height))*(inverted?1:-1);
        if (!inverted) y -= panelHeight;
        const clientRect = new Phaser.Rectangle(
            def.x-comp.width/2-padding,
            y,
            comp.width+2*padding,
            panelHeight);

        if (!self.fixedToCamera) {
            if ((clientRect.right) > game.camera.view.right-UIComponent.SCREEN_PADDING) 
                clientRect.x -= clientRect.right - game.camera.view.right + UIComponent.SCREEN_PADDING;
            if ((clientRect.x) < game.camera.view.x+UIComponent.SCREEN_PADDING) 
                clientRect.x = game.camera.view.x+UIComponent.SCREEN_PADDING;
        }
        return clientRect;
    }

    return self;
}