function AssetManager(spec, data) {
    let { game, log } = spec;
    let { images, spritesheets, sounds } = data;

    let load = (id) => {
        if (images[id]) {
            loadImg(id);
        } else if (spritesheets[id]) {
            loadSpritesheet(id);
        } else if (sounds[id]) {
            loadSound(id);
        } else {
            log.error("Unknown asset requested:",id);
        }
    };

    function loadImg(id) {
        const args = [id].concat(images[id]);
        game.load.image.apply(game.load,args);
    }

    function loadSpritesheet(id) {
        const args = [id].concat(spritesheets[id]);
        game.load.spritesheet.apply(game.load,args);
    }

    function loadSound(id) {
        game.load.audio(id, sounds[id]);
    }

    return Object.freeze({
        load,
        loadAll
    });

    function loadAll() {
        for (const img in images) {
            loadImg(img);
        }
        for (const spr in spritesheets) {
            loadSpritesheet(spr);
        }
        for (const sfx in sounds) {
            loadSound(sfx);
        }
    }
}

export default AssetManager;