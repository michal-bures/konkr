function OptionButtons(spec) {
    let { game, ui, sfx } = spec;

    let group;

    let controls = ui.build({
        name: 'optionButtons',
        component: 'horizontalGroup',
        align:Phaser.BOTTOM_CENTER,
        hOffset: -200,
        vOffset: -10,
        spacing: 5,
        contains: [
            {
                name: 'mute',
                component: 'button',
                sprite: 'optionButtons',
                tooltip: 'toggle sound',
                frame:1,
            },
            {
                name: 'restart',
                component: 'button',
                sprite: 'optionButtons',
                tooltip: 'start a new game',
                frame:2,
            },
            {
                name: 'fullscreen',
                component: 'button',
                sprite: 'optionButtons',
                tooltip: 'toggle fullscreen mode',
                frame:3,
            },
        ]
    });

    let {
        optionButtons,
        mute,
        restart,
        fullscreen,
    } = controls;

    group = game.make.group();
    group.add(optionButtons);

    mute.onInputUp.add(() => {
        game.sound.mute = !game.sound.mute;
        mute.setFrame(game.sound.mute?0:1);
    });

    restart.onInputUp.add(()=> {
        ui.showRestartMenu();
    });

    fullscreen.onInputUp.add(()=> {
        if (game.scale.isFullScreen)
        {
            game.scale.stopFullScreen();
        }
        else if (game.scale.compatibility.supportsFullScreen) {
            game.scale.startFullScreen(false);
        }


    });

    return Object.freeze({
        get group() { return group }
    });
}

export default OptionButtons;