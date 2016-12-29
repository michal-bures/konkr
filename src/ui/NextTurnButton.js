import UI from 'lib/controls/UI';
import { assertDefined } from 'lib/util';

function NextTurnButton(spec) {
    let { game, ui } = spec;

    let group;

    let { nextTurnButton } = new UI(spec,{
            name: 'nextTurnButton',
            component: 'button',
            sprite: 'nextTurnButton',
            align: Phaser.BOTTOM_CENTER,
            hOffset: 100,
            vOffset: -10,
            onClicked: ui.endTurn,
        });

    let { undoButton } = new UI(spec,{
            name: 'undoButton',
            component: 'button',
            sprite: 'undoButton',
            align: Phaser.BOTTOM_CENTER,
            hOffset: -100,
            vOffset: -10,
            onClicked: ui.undo,
        });

    assertDefined(nextTurnButton);
    group = game.make.group();
    group.add(nextTurnButton);
    group.add(undoButton);

    return Object.freeze({
        get group() { return group }
    });
}

export default NextTurnButton;