const DRAG_DEADZONE = 10;

function Scrolling(spec) {

    let {game, debug, log} = spec,
        dragStartPoint = null,
        dragging = false,
        dx = 0, dy = 0,
        cooldown = null,
        mode = null;

    const self = Object.freeze({
        update,
        toDebugString,
        get mode() { return mode; },
        set mode(val) { mode = val; },
        get isActive() { return dragging; }
    });

    function startCooldown() {
        if (cooldown) clearTimeout(cooldown);
        cooldown = setTimeout(()=>{ cooldown = null; dragging = false; }, 10);
    }

    function update() {
        if (game.input.activePointer.isDown) { 
            if (dragStartPoint) {
              const ddx = dragStartPoint.x - game.input.activePointer.position.x;
              const ddy = dragStartPoint.y - game.input.activePointer.position.y;
              dx += ddx;
              dy += ddy;
              if (dragging || (Math.abs(dx)+Math.abs(dy) > DRAG_DEADZONE)) {
                  dragging = true;
                  switch (mode) {
                        case 'CAMERA':
                            game.camera.x += ddx;     
                            game.camera.y += ddy;
                            break;
                        default:
                  }
              }
            } 
            dragStartPoint = game.input.activePointer.position.clone();
        } else {    
            if (dragging) {
                startCooldown();                
                switch (mode) {
                    case 'PAWN':
                        spec.hexSelectionProxy.trigger();
                        break;
                    default:
                }
            }
            dragStartPoint = null;
            dx = 0;
            dy = 0;
        }
    }

    function toDebugString() {
        return `mode: ${mode}
active: ${self.isActive}
from: ${dragStartPoint}`;
    }

    return self;
}

export default Scrolling;