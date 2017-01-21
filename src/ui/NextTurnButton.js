import { assertDefined } from 'lib/util';

function NextTurnButton(spec) {
    let { game, ui } = spec;

    let group;

    let { nextTurnButton } = ui.build({
        name: 'nextTurnButton',
        component: 'button',
        sprite: 'nextTurnButton',
        align: Phaser.BOTTOM_CENTER,
        hOffset: 100,
        vOffset: -10,
        onClicked: ui.endTurn,
        tooltip: 'Next turn',
    });

    let { undoButton } = ui.build({
        name: 'undoButton',
        component: 'button',
        sprite: 'undoButton',
        align: Phaser.BOTTOM_CENTER,
        hOffset: -100,
        vOffset: -10,
        onClicked: ui.undo,
        tooltip: 'Undo last action',
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