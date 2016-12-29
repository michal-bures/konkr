import UI from 'lib/controls/UI';
import { assertDefined } from 'lib/util';

function Menu(spec, cfg) {
    let { log, debug, game, economy, ui, regions, players } = spec;

    let group = null;
    
    assertDefined(game);

    let controls = new UI(spec,{
        name: 'mainContainer',
        component: 'pane',
        align:Phaser.CENTER,
        //stretchHorizontally: true,
        spacing: 5,
        contains: [{
            name: 'layout',
            component: 'verticalGroup',
            align: Phaser.CENTER,
            spacing: 5,
            contains: [
                {
                    name: 'option1',
                    title: 'option 1',
                    align: Phaser.CENTER,
                    description: 'option description',
                    component: 'largeTextButton',
                },
                {
                    name: 'option2',
                    title: 'option 2',
                    align: Phaser.CENTER,
                    description: 'option description',
                    component: 'largeTextButton',
                },
                {
                    name: 'option3',
                    title: 'option 3',
                    align: Phaser.CENTER,
                    description: 'option description',
                    component: 'largeTextButton',
                },
            ]
        }]
    });

    let { 
        mainContainer,
        layout,
        option1
    } = controls;

    assertDefined(mainContainer);

    debug.sprite(layout);
    debug.sprite(mainContainer);

    group = mainContainer;

    return Object.freeze({
        get group() { return group; },
        show() { mainContainer.show(); }
    });
}

export default Menu;