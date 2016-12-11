import { assertDefined, debounce } from 'lib/util';


let lastComponentId = 0;
function generateComponentId() {
    return ++lastComponentId;
}


const componentConstructors = {
    'pane' : (...args) => new Pane(...args),
    'label' : (...args) => new Label(...args),
    'button' : (...args) => new Button(...args),
};

class UIComponent {
    constructor({game, log}, def, parent) {
        assertDefined(game, def);
        this.config = def;
        this.name = def.name || def.component + '#'+ generateComponentId();
        this.parentContainer = (parent && parent.getContainer()) || game;
        this.game = game;
        this.image = this.createDisplayObject(def, def.width, def.height);
        assertDefined(this.image);
        this.image.inputEnabled = true;
        this.reflow();
        if (parent) {
            this.parentContainer.addChild(this.image);
        } else {
            this.image.fixedToCamera = true;
        }
    }

    addToGroup(group) {
        group.add(this.image);
    }

    createDisplayObject(def) {
        return this.game.add.image();
    }

    getContainer() {
        return null;
    }

    reflow() {
        let {width, height, hAlign, vAlign, x=0, y=0, hOffset=0, vOffset=0} = this.config;
        // percentual size
        if (String(width).endsWith('%')) {
            this.image.width = (parseInt(width) / 100)*this.parentContainer.width;
        }
        if (String(height).endsWith('%')) {
            this.image.height = (parseInt(height) / 100)*this.parentContainer.height;
        }

        // position/alignment
        if (hAlign) {
            this.setHAlign(hAlign, hOffset);  
        }  else {
            this.image.x = x;
        }
        if (vAlign) {
            this.setVAlign(vAlign, vOffset);
        } else {
            this.image.y = y;
        }

        this.image.cameraOffset.x = this.image.x;
        this.image.cameraOffset.y = this.image.y;
    }

    setHAlign(hAlign, hOffset) {
        const img = this.image;
        switch (hAlign) {
            case 'left':
                img.x = hOffset;
                img.anchor.x = 0;
                break;
            case 'right':
                img.x = this.parentContainer.width - hOffset;
                img.anchor.x = 1;
                break;
            case 'center':
                img.x = Math.floor(this.parentContainer.width/2);
                img.anchor.x = 0.5;
                break;
            default:
                throw Error('Illegal value for hAlign: '+hAlign);
        }
    }

    setVAlign(vAlign, vOffset) {
        const img = this.image;
        switch (vAlign) {
            case 'top':
                img.y = vOffset;
                img.anchor.y = 0;
                break;
            case 'bottom':
                img.y = this.parentContainer.height - vOffset;
                img.anchor.y = 1;
                break;
            case 'center':
                img.y = Math.floor(this.parentContainer.height/2);
                img.anchor.y = 0.5;
                break;
            default:
                throw Error('Illegal value for vAlign: '+vAlign);
        }      
    }
}

class Pane extends UIComponent {
    constructor(spec, def, parent) {
        super(spec, def, parent);
        this.padding = def.padding || 0;
        this._container = this.game.add.tileSprite(
                                Math.floor(this.padding - this.image.width * this.image.anchor.x),
                                Math.floor(this.padding - this.image.height * this.image.anchor.y),
                                this.image.width-this.padding*2,
                                this.image.height-this.padding*2,
                                new Phaser.BitmapData(spec.game, 'blank', 1, 1));
        this.image.addChild(this._container);
    }

    createDisplayObject({width, height}) {
        return this.game.add.tileSprite(0, 0, width || 1, height || 1, 'paneBackground');
    }

    reflow() {
        super.reflow();
        if (!this._container) return;
        this._container.x = Math.floor(this.padding - this.image.width * this.image.anchor.x);
        this._container.y = Math.floor(this.padding - this.image.height * this.image.anchor.y);
        this._container.width = this.image.width - this.padding*2;
        this._container.height = this.image.height - this.padding*2;
    }

    getContainer() {
        return this._container;
    }
}

class Label extends UIComponent {
    createDisplayObject({text}) {
        var style = { font: "12pt Arial", fill: "black"};
        return this.game.add.text(0, 0, text || '',style);
    }

    get text() {
        return this.image.text;
    }

    set text(val) {
        this.image.text = val;
    }

    addColor(...args) {
        return this.image.addColor(...args);
    }

    resetColors() {
        this.image.colors=[];
    }
}

class Button extends UIComponent {
    createDisplayObject({sprite}) {
        let btn = this.game.add.button(0, 0, sprite);
        this.onInputUp = btn.onInputUp;
        this.onInputDown = btn.onInputDown;
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

    const resizeHandler = debounce(()=> {
        components.forEach(comp=>comp.reflow());
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