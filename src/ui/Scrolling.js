const DRAG_DEADZONE = 10;

function Scrolling(spec) {

    let {game, debug, log} = spec,
        dragStartPoint = null,
        dragging = false,
        dx = 0, dy = 0,
        cooldown = null;

    const self = Object.freeze({
        update,
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
              if (dragging || ((dx + dy) > DRAG_DEADZONE)) {
                  dragging = true;
                  game.camera.x += ddx;     
                  game.camera.y += ddy; 
              }
            } 
            dragStartPoint = game.input.activePointer.position.clone();
        } else {    
            if (dragStartPoint) startCooldown();
            dragStartPoint = null;
            dx = 0;
            dy = 0;
        }
        debug.set('dragging', self.isActive);
    }

    return self;
}

export default Scrolling;