import UI from 'lib/controls/UI';
import { assertDefined } from 'lib/util';

function Menu(spec, cfg) {
    let { log, debug, game, economy, ui, regions, players } = spec;

    let group = null;
    
    assertDefined(game);

    let content = [];

    let {callback, canCancel} = cfg;

    let self = Object.freeze({
        get group() { return group; },
        get canCancel() { return canCancel; },
        show,
        hide
    });

    if (cfg.title) {
        content.push({
            name: 'title',
            component: 'label',
            text: cfg.title,
            align: Phaser.CENTER,
        });
    }
    if (cfg.choices) cfg.choices.forEach((choice,i)=> {
        content.push({
            name: 'choice'+i,
            component: 'largeTextButton',
            title: choice.title,
            description: choice.description,
            align: Phaser.CENTER,
            onClicked() { callback(choice.id); }
        });
    });

    if (cfg.canCancel) {
        content.push({
            name: 'cancel',
            component: 'largeTextButton',
            title: "Cancel",
            align: Phaser.CENTER,
            onClicked() { callback(null); }
        });
    }

    let controls = new UI(spec,{
        name: 'mainContainer',
        component: 'decoratorPane',
        align:Phaser.CENTER,
        stretchHorizontally: true,
        padding: 15,
        contains: [{
            name: 'layout',
            component: 'verticalGroup',
            align: Phaser.CENTER,
            spacing: 5,
            contains: content
        }]
    });

    let { 
        mainContainer,
    } = controls;

    assertDefined(mainContainer);

    group = mainContainer;

    function show() {
        mainContainer.show(); 
    }
    function hide() {
        mainContainer.hide(); 
    }


    return self;
}

export default Menu;