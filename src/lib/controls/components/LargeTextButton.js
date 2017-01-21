import UIComponent from './UIComponent';

export default function LargeTextButton(spec, def) {
    let self = new UIComponent(spec, def);
    let {game, styles} = spec;
    const graphics = game.make.graphics(0, 0);
    graphics.beginFill(0xFFFFFF);
    //graphics.lineStyle(1, 0x202020, 1);
    graphics.fillAlpha=1;
    graphics.drawRoundedRect(0,0,400,(def.description?68:46),9);
    graphics.endFill();
    const {x,y} = graphics.getBounds();
    let btn = game.make.button(x, y, graphics.generateTexture());
    let title = game.make.text(10,6, def.title || '', styles.get("LARGE_BUTTON_TITLE"));
    if (def.description) {
        const desc = game.make.text(10,46, def.description || '', styles.get("LARGE_BUTTON_DESCRIPTION"));
        btn.addChild(desc);
    }
    btn.addChild(title);
    
    self.onInputUp = btn.onInputUp;
    self.onInputDown = btn.onInputDown;
    self.add(btn);
    if (def.onClicked) self.onInputUp.add(def.onClicked);
    return self;
}