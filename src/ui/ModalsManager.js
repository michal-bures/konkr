import Injector from 'lib/Injector';
import Menu from './modals/Menu';

function ModalsManager(spec) {
    let { game, ui } = spec;

    let group = game.make.group();

    let library = new Injector(null, {
        RESTART_GAME: () => new Menu(spec, {
            title: 'Do you want to start on a new world?',
            choices: [
                {
                    id: 'restart',
                    title: 'Try this one again',
                    description: 'Discard current progress and restart the current map',
                    handler() { ui.restartGame(); }
                },
                {
                    id: 'new_map',
                    title: 'Generate new map',
                    description: 'Discard current progress and start on a new, randomly generated world',
                    handler() { ui.generateNewMap(); }
                }
            ],
            canCancel: true,
        })
    });

    return Object.freeze({
        get group() { return group; },
        show
    });


    function show(key) {
        const modal = library[key];
        if (!modal) {
            throw Error(`Unkonwn modal type: ${key}`);
        }
        group.removeAll();
        group.add(modal.group);
        modal.show();
    }

}

export default ModalsManager;