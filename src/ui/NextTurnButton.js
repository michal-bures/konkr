import UI from 'lib/controls/UI';
import { assertDefined } from 'lib/util';

function NextTurnButton(spec) {
    let { game, ui } = spec;

    let group = game.make.group();

    let { button } = new UI(spec,{
            name: 'button',
            component: 'button',
            sprite: 'nextTurnButton',
            hAlign: 'right',
            vAlign: 'bottom',
            hOffset: 10,
            vOffset: 10,
        });

    assertDefined(button);
    button.addToGroup(group);

    button.onInputUp.add(() => {
        ui.endTurn();
    });

    return Object.freeze({
        group
    });
}

export default NextTurnButton;