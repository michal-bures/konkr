import { assertDefined, debounce } from 'lib/util';


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

class UIComponent extends Phaser.Group {
    constructor({game, log, debug, tweens}, def, parent) {
        super(game);
        assertDefined(game, def);
        this.config = def;
        this.debug=debug;
        this.name = def.name || def.component + '#'+ generateComponentId();
        this.parentGroup = parent || game.camera.view;
        this.initGroup(def);
        this.game = game;
        this.childComponents = [];
        this.reflow();
        if (parent) {
            this.parentGroup.add(this);
            parent.childComponents.push(this);
        } else {
            this.fixedToCamera = true;
        }
    }

    initGroup(def) {}

    reflow() {
        let {width, height, align, x=0, y=0, hOffset=0, vOffset=0} = this.config;
        // percentual size
        if (String(width).endsWith('%')) {
            this.width = (parseInt(width) / 100)*this.parentContainer.width;
        }
        if (String(height).endsWith('%')) {
            this.height = (parseInt(height) / 100)*this.parentContainer.height;
        }

        // position/alignment
        if (align) {
            this.alignIn(this.parentGroup,align,hOffset-this.parentGroup.x,vOffset-this.parentGroup.y);
        }  else {
            this.x = x;
            this.y = y;
        }

        this.cameraOffset.x = this.x;
        this.cameraOffset.y = this.y;

        console.debug(`Reflow children of ${this.name}`);
        this.childComponents.forEach(child=>{
            console.debug(`Reflow child ${child.name}`);
            child.reflow();
        });
    }
}

class Pane extends UIComponent {
    initGroup({width, height, bgImage='paneBackground'}) {
        this.add(this.game.add.sprite(0, 0, bgImage));
    }

    getContainer() {
        return this._container;
    }
}

class Label extends UIComponent {
    initGroup({text, style={ font: "12pt Bookman Old Style", fill: "black"}}) {
        this._text= this.game.make.text(0, 0, text || '',style);
        this.add(this._text);
    }

    get text() {
        return this._text.text;
    }

    set text(val) {
        this._text.text = val;
    }

    addColor(...args) {
        return this._text.addColor(...args);
    }

    resetColors() {
        this._text.colors=[];
    }
}

class PawnShop extends UIComponent {

    setStock(pawnTypeArray) {
        this.removeAll(true);
        this.addMultiple(pawnTypeArray.map(pawnType=>{
            const sprite = new Phaser.Sprite(this.game,0,0,'pawn');
            sprite.frame = pawnType.ordinal;
            return sprite;
        }));
        this.align(-1,1,32,32,Phaser.BOTTOM_CENTER);
        // has to be called twice to properly take effect, don't ask me why :/
        this.reflow();
        this.reflow();
    }
}


class Button extends UIComponent {
    initGroup({sprite}) {
        let btn = this.game.add.button(0, 0, sprite);
        this.onInputUp = btn.onInputUp;
        this.onInputDown = btn.onInputDown;
        this.add(btn);
        return btn;
    }
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