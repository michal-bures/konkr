function AssetManager(spec, data) {
    let { game, log } = spec;
    let { images, spritesheets } = data;

    let load = (id) => {
        var args;
        if (images[id]) {
            args = [id].concat(images[id]);
            game.load.image.apply(game.load,args);
        } else if (spritesheets[id]) {
            args = [id].concat(spritesheets[id]);
            game.load.spritesheet.apply(game.load,args);
        } else {
            log.error("Unknown asset requested:",id);
        }
    };

    return Object.freeze({
        load,
        loadAll
    });

    function loadAll() {
        for (const img in images) {
            load(img);
        }
        for (const spr in spritesheets) {
            load(spr);
        }
    }
}

export default AssetManager;