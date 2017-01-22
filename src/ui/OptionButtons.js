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
                sprite: 'btn-sound-on',
                tooltip: 'toggle sound',
            },
            {
                name: 'restart',
                component: 'button',
                sprite: 'btn-restart',
                tooltip: 'start a new game',
            },
            {
                name: 'fullscreen',
                component: 'button',
                sprite: 'btn-fullscreen',
                tooltip: 'toggle fullscreen mode',
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
        mute.setFrameName(game.sound.mute?'btn-sound-off':'btn-sound-on');
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