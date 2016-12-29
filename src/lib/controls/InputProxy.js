// a full-screen invisible image, useful for capturing pointer input events

function InputProxy(game) {
    let surface = new Phaser.Image(game,0,0, null);
    surface.inputEnabled = true;
    surface.fixedToCamera = true;
    surface.width = game.width;
    surface.height = game.height;
    game.scale.onSizeChange.add(() => {
        surface.width = game.width;
        surface.height = game.height;
    });        
    return surface; 
}

export default InputProxy;