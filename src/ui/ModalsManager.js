import Injector from 'lib/Injector';
import Menu from './modals/Menu';
import InputProxy from 'lib/controls/InputProxy';

function ModalsManager(spec) {
    let { game, ui } = spec;

    let group = game.make.group(),
        inputProxy = new InputProxy(game),
        currentModal = null,
        currentModalCallback = null;

    let library = new Injector(null, {
        RESTART_GAME: () => new Menu(spec, {
            title: 'Start a new game?',
            choices: [
                {
                    id: 'RESTART',
                    title: 'Restart',
                    description: 'Discard current progress and start again on this island',
                },
                {
                    id: 'NEW_ISLAND',
                    title: 'New island',
                    description: 'Discard current progress and start on a new island',
                }
            ],
            canCancel: true,
            callback: resolveModal
        })
    });

    inputProxy.events.onInputUp.add(()=> {
        if (currentModal && currentModal.canCancel) resolveModal(null);
    });

    return Object.freeze({
        get group() { return group; },
        show
    });

    function show(key, callback) {
        if (currentModal) resolveModal();
        currentModal = library[key];
        if (!currentModal) {
            throw Error(`Unkonwn modal type: ${key}`);
        }
        group.removeAll();
        group.add(inputProxy);
        group.add(currentModal.group);
        if (callback) currentModalCallback = callback;
        currentModal.show();
    }

    function resolveModal(result) {
        currentModal.hide();
        group.remove(inputProxy);
        currentModal = null;
        if (currentModalCallback) {
            currentModalCallback(result);
            currentModalCallback = null;
        }
    }

}

export default ModalsManager;