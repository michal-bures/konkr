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
    pawnShop : (...args) => new PawnShop(...args)
};

function UIComponent({game, log, debug, tweens}, def, parent) {
    let self = game.add.group(),
        config = def,
        name = def.name || def.component + '#'+ generateComponentId(),
        parentGroup = parent || game.camera.view,
        childComponents = [],
        hidden = false;

    extend(self, {
        get name() { return name; },
        initGroup,
        reflow,
        show,
        hide,
        config,
        childComponents,
        parentGroup
    });
    
    reflow();
    if (parent) {
        parentGroup.add(self);
        parent.childComponents.push(self);
    } else {
        self.fixedToCamera = true;
    }

    function initGroup() {}

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
//            onComplete.add(reflow);
        }
    }

    function reflow() {
        let { align, x=0, y=0, hOffset=0, vOffset=0} = def;

        if (hidden) return;
        // position/alignment
        if (align) {
            self.alignIn(self.parentGroup,align,hOffset-self.parentGroup.x,vOffset-self.parentGroup.y);
        }  else {
            self.x = x;
            self.y = y;
        }

        self.cameraOffset.x = self.x;
        self.cameraOffset.y = self.y;

        console.debug(`Reflow children of ${self.name}`);
        self.childComponents.forEach(child=>{
            console.debug(`Reflow child ${child.name}`);
            child.reflow();
        });
    }
    return self;
}

function Pane(spec, def, parent) {
    let self = new UIComponent(spec, def, parent);
    let {bgImage='paneBackground'} = def;
    self.add(spec.game.add.sprite(0, 0, bgImage));

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
        set(val) { self._text.text = val; }
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
            // has to be called twice to properly take effect, don't ask me why :/
            self.reflow();
            self.reflow();
        }
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

    const resizeHandler = debounce(()=> {
        components[0].reflow();
    }, 100);

    game.scale.onSizeChange.add(resizeHandler);

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
        log.debug("Creating UI component", def);
        let constructorFunc = componentConstructors[def.component];
        if (!constructorFunc) throw Error(`Unknown component type '${def.component}'`);
        return constructorFunc(spec,def,parent);
    }

   return self; 
}

export default UI;