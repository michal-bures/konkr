import { assertDefined, debounce, extend } from 'lib/util';
import Phasetips from 'lib/vendor/Phasetips';

const SHOWHIDE_DURATION = 200;
const INPUTEVENT_DEBOUNCE_INTERVAL = 100;
const DEFAULT_PADDING = 5;
// Recommended minimal offset of world-bound UI components from screen edge
const SCREEN_PADDING = 20;


let lastComponentId = 0;
function generateComponentId() {
    return ++lastComponentId;
}


const componentConstructors = {
    image : (...args) => new Image(...args),
    label : (...args) => new Label(...args),
    button : (...args) => new Button(...args),
    decoratorPane: (...args) => new DecoratorPane(...args),
    largeTextButton: (...args) => new LargeTextButton(...args),
    pawnShop : (...args) => new PawnShop(...args),
    horizontalGroup : (...args) => new HorizontalGroup(...args),
    verticalGroup : (...args) => new VerticalGroup(...args),
    popoverPanel : (...args) => new PopoverPanel(...args)
};

function UIComponent({game, log, debug, tweens, ui}, def) {

    let self = game.add.group(),
        config = def,
        name = def.name || def.component + '#'+ generateComponentId(),
        parentGroup = (def.useWorldCoords ? game.world.bounds : game.camera.view),
        childComponents = [],
        // if anchorObject is specified, it's used as bounding box when positioning this component and laying 
        // out its children (instead of using the actual bounding box of the group itself); that way, even if the group
        // bounding box unexpectedly expands due to badly positioned (out-of-bounds) children, layout and 
        // positioning of other children within the group and the group itself will not be affected
        anchorObject = null,
        hidden = false,
        visibilityTransitionTween = null;

    self.fixedToCamera = !def.useWorldCoords;

    let base_update = self.update.bind(self);
    let base_destroy = self.destroy.bind(self);
    self.destroy = ()=> {
        log.debug(`DESTROY ${self}, ${self.children}`);
        base_destroy(true);
        log.debug(`DONE ${self}, ${self.children}`);
    };

    extend(self, {
        get name() { return name; },
        get anchorObject() { return anchorObject; },
        set anchorObject(val) { anchorObject = val; },
        // update the position of this component within parent container and call recursively 
        // on child components;
        // WARNING: component width/height changes should NOT occur inside reflow to avoid inifinite 
        // loops of parent.reflow->child.resize->parent.reflow->child.resize->...
        // instead, only resize component based on an independent trigger and dispatch onResize
        reflow,
        reflowSelf, 
        reflowChildren,
        update,
        show,
        hide,
        config,
        childComponents,
        childResized,
        parentGroup,
        hasParent: false,
        dirty: true, // needs reflow after changes to this component or it's children ?
        onResized: new Phaser.Signal(),
        addComponent,
        toString
    });
 
    function childResized(child) {
        self.dirty = true;
        self.onResized.dispatch();        
    }

    function addComponent(component) {
        component.parentGroup = self;
        component.fixedToCamera = false;
        component.hasParent = true;
        childComponents.push(component);
        component.onResized.add(()=>self.childResized(component));
        self.add(component);
    }

    function hide() {
        if (hidden) return;
        if (visibilityTransitionTween) {
            visibilityTransitionTween.stop();
            visibilityTransitionTween = null;
        }
        hidden = true;
        if (def.align == Phaser.BOTTOM_CENTER) {
            visibilityTransitionTween = tweens.add(self.cameraOffset).to({y:game.height}, SHOWHIDE_DURATION, Phaser.Easing.Quadratic.InOut, true);
            visibilityTransitionTween.onComplete.add(()=>{
                self.visible = false;
            });
        } else {
            self.visible = false;
        }
    }

    function show() {
        if (!hidden && self.visible) return;
        if (visibilityTransitionTween) {
            visibilityTransitionTween.stop();
            visibilityTransitionTween = null;
        }
        hidden = false;
        self.visible = true;
        reflow();
        if (def.align == Phaser.BOTTOM_CENTER) {
            let targetY = self.cameraOffset.y;
            self.y = game.height;
            self.cameraOffset.y=self.y;
            visibilityTransitionTween = tweens.add(self.cameraOffset).to({y:targetY}, SHOWHIDE_DURATION, Phaser.Easing.Quadratic.InOut, true);
        }
    }

    function update() {
        base_update();
        if (self.dirty) {
            reflow();
        }
    }

    function reflow(clientRect = self.parentGroup.anchorObject || self.parentGroup) {
        self.dirty = false; 
        log.debug(`-> reflow ${self} in ${clientRect}:`);
        self.reflowChildren();
        log.debug(`<- reflow ${self}`);
        self.reflowSelf(clientRect);
    }

    function reflowSelf(clientRect) {
        let { align=Phaser.CENTER, x, y, hOffset=0, vOffset=0} = def;
        if (hidden) return;
        // position/alignment
        if (x !== undefined || y !== undefined) {
            x = x || 0;
            y = y || 0;
            self.x = x;
            self.y = y;
        } else {
            self.alignIn(clientRect,align,hOffset,vOffset);
            self.x=Math.floor(self.x);
            self.y=Math.floor(self.y);
        }

        if (self.fixedToCamera) {
            self.cameraOffset.x = self.x - game.camera.view.x;
            self.cameraOffset.y = self.y - game.camera.view.y;
        }
    }

    function reflowChildren() {
        self.childComponents.forEach(child=>{
            child.reflow();
        });
    }

    function toString() {
        return `[UIComponent ${name}]`;
    }

    return self;
}

function Image(spec, def) {
    let self = new UIComponent(spec, def);
    let {src='imageBackground'} = def;
    self.anchorObject=self.add(spec.game.add.image(0, 0, src));

    if (def.onClicked) {
        self.anchorObject.inputEnabled=true;
        self.anchorObject.events.onInputUp.add(debounce(def.onClicked,INPUTEVENT_DEBOUNCE_INTERVAL,true));
    }

    return self;
}

function Label(spec, def) {
    let self = new UIComponent(spec, def);
    let {text, style={ font: "12pt Bookman Old Style", fill: "black"}} = def;
    self._text= spec.game.add.text(0, 0, text || '',style);
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

function PawnShop (spec, def) {
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

function HorizontalGroup (spec, def) {
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

    return self;
}

function VerticalGroup (spec, def) {
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
    return self;
}

function DecoratorPane(spec, def) {
    let self = new UIComponent(spec, def);
    let { padding=5 } = def;
    let reflowBase = self.reflowSelf;
    self.anchorObject = self.parentGroup;

    let bgSprite = spec.game.add.image(0,0,'paneBackground');
    self.add(bgSprite);

    if (def.onClicked) {
        self.inputEnabled=true;
        self.onInputUp.add(debounce(def.onClicked,INPUTEVENT_DEBOUNCE_INTERVAL,true));
    }

    extend(self, {
        reflowSelf(clientRect) {
            self.refreshChrome();
            reflowBase(clientRect);
        },
        refreshChrome() {
            let target = self.childComponents[0];
            if (!target) return;
            if (def.stretchHorizontally) {
                bgSprite.x=(self.fixedToCamera?spec.game.camera.view.x:0);
                bgSprite.width = self.parentGroup.width;
            } else {
                bgSprite.x = target.x - padding;
                bgSprite.width = target.width + 2*padding;
            }
            bgSprite.y = target.y - padding;
            bgSprite.height = target.height + 2*padding;
        }
    });
    return self;

}

function PopoverPanel(spec, def) {
    let self = new UIComponent(spec, def);
    const {game} = spec;
    let pointerSprite = spec.game.add.image(0,0,'popoverPointer');
    pointerSprite.anchor.set(0.5,1);
    let bgSprite = game.add.image(0,0,'paneBackground');
    // WARNING: pointerSprite has to be added after bgSprite, or it will cause
    // alpha flicker for some reason
    self.add(bgSprite);
    self.add(pointerSprite);

    self.reflowSelf=(clientRect) => {
    };
    self.reflowChildren=()=> {
        if (!self.childComponents.length) return;
        const comp = self.childComponents[0];
        const padding = def.padding || DEFAULT_PADDING;
        const inverted = def.y-comp.height-pointerSprite.height-padding*2 < game.camera.view.y + SCREEN_PADDING;
        const rect = getPanelRect(inverted);
        pointerSprite.scale.y = (inverted?-1:1);
        pointerSprite.x = def.x;
        pointerSprite.y = def.y+(def.vOffset||0)*(inverted?1:-1);
        bgSprite.x = rect.x;
        bgSprite.y = rect.y;
        bgSprite.width = rect.width;
        bgSprite.height = rect.height;
        rect.inflate(-2*padding, -2*padding);
        comp.reflow(rect);
    };

    function getPanelRect(inverted) {
        const comp = self.childComponents[0];
        const padding = def.padding || DEFAULT_PADDING;
        let y = def.y + ((def.vOffset||0)+pointerSprite.height)*(inverted?1:-1);
        if (!inverted) y -= comp.height+2*padding;
        const clientRect = new Phaser.Rectangle(
            def.x-comp.width/2-padding,
            y,
            comp.width+2*padding,
            comp.height+2*padding);

        if ((clientRect.right) > game.camera.view.right-SCREEN_PADDING) 
            clientRect.x -= clientRect.right - game.camera.view.right + SCREEN_PADDING;
        if ((clientRect.x) < game.camera.view.x+SCREEN_PADDING) 
            clientRect.x = game.camera.view.x+SCREEN_PADDING;
        return clientRect;
    }

    return self;
}

function Button(spec, def) {
    let self = new UIComponent(spec, def);
    let {sprite} = def;
    let btn = spec.game.add.button(0, 0, sprite);
    btn.frame = def.frame || 0;
    self.onInputUp = btn.onInputUp;
    self.onInputDown = btn.onInputDown;
    self.add(btn);
    if (def.onClicked) self.onInputUp.add(debounce(def.onClicked,INPUTEVENT_DEBOUNCE_INTERVAL,true));

    if (def.tooltip) {
        var tip1 = new Phasetips(spec.game, {
            targetObject: btn,
            //fixedToCamera : true,
            context: def.tooltip,
            strokeColor: "white",
            position: "top",
            textStyle: { fontSize: 12, fill: "#ffffff", stroke: "#1e1e1e", strokeThickness: 1, wordWrap: true, wordWrapWidth: 200, lineSpacing: -2 },
            animationDelay: 500,
            padding: 4
        });
    }

    self.setFrame =(frame) => {
        btn.frame = frame;
    };

    return self;
}

function LargeTextButton(spec, def) {
    let self = new UIComponent(spec, def);
    let {game} = spec;
    const graphics = game.make.graphics(0, 0);
    graphics.beginFill(0xFFFFFF);
    //graphics.lineStyle(1, 0x202020, 1);
    graphics.fillAlpha=1;
    graphics.drawRoundedRect(0,0,400,(def.description?68:46),9);
    graphics.endFill();
    const {x,y} = graphics.getBounds();
    let btn = game.make.button(x, y, graphics.generateTexture());
    let title = game.make.text(10,6, def.title || '', { font: "24pt Bookman Old Style", fill: "black"});
    if (def.description) {
        const desc = game.make.text(10,46, def.description || '', { font: "10pt Bookman Old Style", fill: "black"});
        btn.addChild(desc);
    }
    btn.addChild(title);
    
    self.onInputUp = btn.onInputUp;
    self.onInputDown = btn.onInputDown;
    self.add(btn);
    if (def.onClicked) self.onInputUp.add(def.onClicked);
    return self;
}


function UI (spec, def) {
    let {log, game} = spec;

    let components =[];
    let self = {
        addComponent,
        update() { components[0].update(); }
    };
    addComponent(def);
    components[0].reflow();

    spec.ui.onResize.add(()=>components[0].reflow());

    function addComponent(def, parent) {
        if (self[def.name]) throw new Error(`Duplicate component name '${def.name}'`);
        let newComp = createComponent(def);
        if (parent) {
            parent.addComponent(newComp);
        }

        self[def.name] = newComp;
        components.push(newComp);
        if (def.contains) def.contains.forEach(childDef => {
            addComponent(childDef, newComp);
        });
    }

    function createComponent(def, parent) {
        let constructorFunc = componentConstructors[def.component];
        if (!constructorFunc) throw Error(`Unknown component type '${def.component}'`);
        return constructorFunc(spec,def,parent);
    }

   return self; 
}

export default UI;