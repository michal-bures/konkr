import { assertDefined, debounce, extend } from 'lib/util';

const SHOWHIDE_DURATION = 200;


let lastComponentId = 0;
function generateComponentId() {
    return ++lastComponentId;
}


const componentConstructors = {
    pane : (...args) => new Pane(...args),
    label : (...args) => new Label(...args),
    button : (...args) => new Button(...args),
    pawnShop : (...args) => new PawnShop(...args),
    horizontalGroup : (...args) => new HorizontalGroup(...args)
};

function UIComponent({game, log, debug, tweens, ui}, def, parent) {
    let self = game.add.group(),
        config = def,
        name = def.name || def.component + '#'+ generateComponentId(),
        parentGroup = parent || game.camera.view,
        childComponents = [],
        // if anchorObject is specified, it's used as bounding box when positioning this component and laying 
        // out its children (instead of using the actual bounding box of the group itself); that way, even if the group
        // bounding box unexpectedly expands due to badly positioned (out-of-bounds) children, layout and 
        // positioning of other children within the group and the group itself will not be affected
        anchorObject = null,
        hidden = false;

    extend(self, {
        get name() { return name; },
        get anchorObject() { return anchorObject; },
        set anchorObject(val) { anchorObject = val; },
        // update the position of this component within parent container and call recursively 
        // on child components;
        // WARNING: component width/height changes should NOT occur inside reflow to avoid inifinite 
        // loops of parent.reflow->child.resize->parent.reflow->child.resize->...
        // instead, only resize component based on an independent trigger and trigger onResize
        reflow, 
        show,
        hide,
        config,
        childComponents,
        childResized,
        parentGroup,
        reflowChildren: true,
        onResized: new Phaser.Signal(),
        addComponent,
        toString
    });

    reflow();
    if (parent) {
        parent.addComponent(self);
    } else {
        self.fixedToCamera = true;
    }

    function childResized(child) {
        self.onResized.dispatch();
        if (!parent) reflow();
    }

    function addComponent(component) {
        childComponents.push(component);
        component.onResized.add(()=>self.childResized(component));
        self.add(component);
    }

    function hide() {
        if (hidden) return;
        hidden = true;
        if (def.align == Phaser.BOTTOM_CENTER) {
            let t = tweens.add(self.cameraOffset).to({y:game.height}, SHOWHIDE_DURATION, Phaser.Easing.Quadratic.InOut, true);
            t.onComplete.add(()=>{
                self.visible = false;
            });
        } else {
            self.visible = true;
        }
    }

    function show() {
        if (!hidden) return;
        hidden = false;
        self.visible = true;
        reflow();
        if (def.align == Phaser.BOTTOM_CENTER) {
            let targetY = self.cameraOffset.y;
            self.y = game.height;
            self.cameraOffset.y=self.y;
            tweens.add(self.cameraOffset).to({y:targetY}, SHOWHIDE_DURATION, Phaser.Easing.Quadratic.InOut, true);
        }
    }

    function reflow() {
        let { align, x=0, y=0, hOffset=0, vOffset=0} = def;

        if (hidden) return;
        // position/alignment
        if (align) {
            self.alignIn(self.parentGroup.anchorObject || self.parentGroup,align,hOffset,vOffset);
        }  else {
            self.x = x;
            self.y = y;
        }

        self.cameraOffset.x = self.x - game.camera.view.x;
        self.cameraOffset.y = self.y - game.camera.view.y;

        if (self.reflowChildren) self.childComponents.forEach(child=>{
            child.reflow();
        });
    }

    function toString() {
        return `[UIComponent ${name}]`;
    }

    return self;
}

function Pane(spec, def, parent) {
    let self = new UIComponent(spec, def, parent);
    let {bgImage='paneBackground'} = def;
    self.anchorObject=self.add(spec.game.add.sprite(0, 0, bgImage));

    return self;
}

function Label(spec, def, parent) {
    let self = new UIComponent(spec, def, parent);
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

function PawnShop (spec,def, parent) {
    let self = new UIComponent(spec, def, parent);
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

function HorizontalGroup (spec, def, parent) {
    let self = new UIComponent(spec, def, parent);
    let spacing = def.spacing || 0;

    function refreshLayout() {
        let x = 0;
        self.childComponents.forEach(member => {
            member.x = x;
            member.y = member.config.hOffset || 0; // TODO: replace with a nicer impl
            x+=spacing + member.width;
        });
    }

    let addComponentBase = self.addComponent;
    let childResizedBase = self.childResized;
    extend(self, {
        reflowChildren:false,
        addComponent(component) {
            addComponentBase(component);
            refreshLayout();
        },
        childResized(child) {
            refreshLayout();
            childResizedBase(child);
        },
    });

    return self;
}


function Button(spec, def, parent) {
    let self = new UIComponent(spec, def, parent);
    let {sprite} = def;

    let btn = spec.game.add.button(0, 0, sprite);
    self.onInputUp = btn.onInputUp;
    self.onInputDown = btn.onInputDown;
    self.add(btn);

    return self;
}

function UI (spec, def) {
    let {log, game} = spec;
    
    let components =[];
    let self = {
        addComponent
    };
    addComponent(def);
    components[0].reflow();

    spec.ui.onResize.add(()=>components[0].reflow());

    function addComponent(def, parent) {
        if (self[def.name]) throw new Error(`Duplicate component name '${def.name}'`);
        let newComp = createComponent(def, parent);
        self[def.name] = newComp;
        components.push(newComp);
        if (def.contains) def.contains.forEach(childDef => {
            addComponent(childDef, self[def.name]);
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