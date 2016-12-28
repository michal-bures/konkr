function Scrolling(spec) {

    let {game} = spec,
        dragStartPoint = null;

    return Object.freeze({
        update        
    });

    function update() {
        if (game.input.activePointer.isDown) { 
            if (dragStartPoint) {
              game.camera.x += dragStartPoint.x - game.input.activePointer.position.x;     
              game.camera.y += dragStartPoint.y - game.input.activePointer.position.y; 
            }
            dragStartPoint = game.input.activePointer.position.clone();
        } else {    
            dragStartPoint = null;
        }
    }

}

export default Scrolling;