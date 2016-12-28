function SFX({game}) {
    let lib = {
        deny: game.add.audio('deny'),
        grabPawn: game.add.audio('grabPawn'),
        dropPawn: game.add.audio('dropPawn'),
    };

    let self = {};
    Object.keys(lib).forEach(key=> self[key] = () => {lib[key].play();});
    return self;
}

export default SFX;