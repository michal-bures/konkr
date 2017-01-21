import { extend } from 'lib/util';
import UIAnimator from '../UIAnimator';

let lastComponentId = 0;
function generateComponentId() {
    return ++lastComponentId;
}

function cameraRect(game) {
    return new Phaser.Rectangle(0,0, game.width, game.height);
}

export default function UIComponent(spec, def) {
    const {game, log, debug, tweens, ui, styles} = spec;
    let self = game.add.group(),
        config = def,
        name = def.name || def.component + '#'+ generateComponentId(),
        parentGroup = game.world.bounds, // game.camera.view),
        childComponents = [],
        // if anchorObject is specified, it's used as bounding box when positioning this component and laying 
        // out its children (instead of using the actual bounding box of the group itself); that way, even if the group
        // bounding box unexpectedly expands due to badly positioned (out-of-bounds) children, layout and 
        // positioning of other children within the group and the group itself will not be affected
        anchorObject = null;

    self.animator = (def.animator ? UIAnimator[def.animator](spec, self) : null);
    self.fixedToCamera = !def.useWorldCoords;

    let base_update = self.update.bind(self);
    let base_destroy = self.destroy.bind(self);
    self.destroy = ()=> {
        base_destroy(true);
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
        onChildResized: new Phaser.Signal(),
        addComponent,
        toString
    });
 
    function childResized(child) {
        self.dirty = true;
        self.onChildResized.dispatch(child);        
    }

    function addComponent(component) {
        component.parentGroup = self;
        component.fixedToCamera = false;
        component.hasParent = true;
        childComponents.push(component);
        component.onResized.add(()=>self.childResized(component));
        self.add(component);
        self.childResized(component);
    }

    function hide() {
        if (self.animator) self.animator.animateHide();
        else self.visible = false;
    }

    function show() {
        if (self.animator) self.animator.animateShow();
        else {
            // NOTE: order is important, reflow will not work correctly unless group is visible
            self.visible = true;
            self.reflow();
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
        log.debug(`${self} before reflow: ${self.x}:${self.y}`);
        if (self.fixedToCamera) clientRect = cameraRect(game);
        log.debug(`-> reflow ${self} in ${clientRect}:`);
        self.reflowChildren();
        self.reflowSelf(clientRect);
        log.debug(`<- reflow ${self} (${self.x}:${self.y}, ${self.width}x${self.height})`);
    }

    function reflowSelf(clientRect) {
        let { align=Phaser.CENTER, x, y, hOffset=0, vOffset=0} = def;
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
            self.cameraOffset.x = self.x;
            self.cameraOffset.y = self.y;
            log.debug(`FIXED TO CAMERA ${self} ${self.cameraOffset.x}:${self.cameraOffset.y} <- ${self.x}:${self.y} ${self.width}x${self.height}`);
        }
    }

    function reflowChildren() {
        self.childComponents.forEach(child=>{
            child.reflow();
        });
    }

    function toString() {
        let x = (self.fixedToCamera? self.cameraOffset.x:self.x);
        let y = (self.fixedToCamera? self.cameraOffset.y:self.y);
        return `[UIComponent '${name}' at ${x}:${y} ${self.width}x${self.height}${self.visible?'':' (hidden)'}${self.fixedToCamera?' (fixedToCamera)':''}]`;
    }

    return self;
}
// Debounce interval (ms) for input events
UIComponent.INPUTEVENT_DEBOUNCE_INTERVAL = 100;
// Default padding between layout component outer border and its child components
UIComponent.DEFAULT_PADDING = 5;
// Recommended minimal offset of world-bound UI components from screen edge
UIComponent.SCREEN_PADDING = 20;