import UI from 'lib/controls/UI';
import { assertDefined } from 'lib/util';

function NextTurnButton(spec) {
    let { game, ui } = spec;

    let group;

    let { button } = new UI(spec,{
            name: 'button',
            component: 'button',
            sprite: 'nextTurnButton',
            align: Phaser.BOTTOM_RIGHT,
            hOffset: -10,
            vOffset: -10,
        });

    assertDefined(button);
    group = button;

    button.onInputUp.add(() => {
        ui.endTurn();
    });

    return Object.freeze({
        get group() { return group }
    });
}

export default NextTurnButton;