import UI from 'lib/controls/UI';

function OptionButtons(spec) {
    let { game, ui } = spec;

    let group;

    let controls = new UI(spec,{
        name: 'mainContainer',
        component: 'horizontalGroup',
        align:Phaser.TOP_RIGHT,
        hOffset: -10,
        vOffset: -10,
        spacing: 5,
        contains: [
            {
                name: 'mute',
                component: 'button',
                sprite: 'optionButtons',
                frame:1,
            },
            {
                name: 'restart',
                component: 'button',
                sprite: 'optionButtons',
                frame:2,
            },
            {
                name: 'fullscreen',
                component: 'button',
                sprite: 'optionButtons',
                frame:3,
            },
        ]
    });

    let {
        mainContainer,
        mute,
        restart,
        fullscreen,
    } = controls;

    group = game.make.group();
    group.add(mainContainer);

    mute.onInputUp.add(() => {
        game.sound.mute = !game.sound.mute;
        mute.setFrame(game.sound.mute?0:1);
    });

    restart.onInputUp.add(()=> {
        ui.showModal('RESTART_GAME');
    });

    return Object.freeze({
        get group() { return group }
    });
}

export default OptionButtons;