import * as Renderer from './Renderer';
import HexSelectionProxy from './HexSelectionProxy';
import Scrolling from './Scrolling';
import RegionPanel from './RegionPanel';
import GridOverlays from './GridOverlays';
import Messages from './Messages';
import PawnSprites from './PawnSprites';
import NextTurnButton from './NextTurnButton';
import { extend } from 'lib/util';

function UIManager(spec) {
    
    let {game, regions, log, gameState, actions} = spec,
        selectedRegion,
        selectedHex,
        scene,
        scenes = {},
        resumeActions, // stored callback for pending AWAIT_PLAYER_INPUT action
        hoveredRegion,
        hoveredHex;

    let uiElements = spec.extend({
        landSprites: spec => new Renderer.LandSprites(spec),
        regionBorders: spec => new Renderer.RegionBorders(spec),
        selRegionHighlight: spec => new Renderer.SelectedRegionHighlight(spec),
        pawnSprites: spec => new PawnSprites(spec),
        hexSelectionProxy: spec => new HexSelectionProxy(spec),
        scrolling: spec => new Scrolling(spec),
        uiRegionPanel: spec => new RegionPanel(spec),
        gridOverlays: spec => new GridOverlays(spec),
        messages: spec => new Messages(spec),
        nextTurnButton: spec => new NextTurnButton(spec),
        ui: () => self
    });

    let self = Object.freeze({
        onHexHovered: new Phaser.Signal(/* hex */),
        onHexSelected: new Phaser.Signal(/* hex */),
        onRegionSelected: new Phaser.Signal(/* region */),
        onRegionHovered: new Phaser.Signal(/* region */),
        onSelectedRegionChanged: new Phaser.Signal(/* region */),
        get uiSpec() { return uiElements; },
        selectHex,
        selectRegion,
        endTurn,
        render,
        update,
        selectedRegion() { return selectedRegion; },
        selectedHex() { return selectedHex; },
        toDebugString
    });

    //display layers z-order
    const Z_ORDER = [
        'landSprites',
        'regionBorders',
        'selRegionHighlight',
        'pawnSprites',
        'gridOverlays',
        'hexSelectionProxy',
        'messages',
        'uiRegionPanel',
        'nextTurnButton',
    ];
    Z_ORDER.forEach(e => game.world.add(uiElements[e].group));

    game.stage.backgroundColor='#d5dfef';
    game.world.setBounds(0, 0, 3000, 3000);

    regions.onChanged.add((region) => {
        if (!selectedRegion) return;
        if (region === selectedRegion) {
            self.onSelectedRegionChanged.dispatch(selectedRegion);
        }
    });

    regions.onDestroyed.add(region=> {
        if (!selectedRegion) return;
        if (region === selectedRegion) {
            selectRegion(null);
        }
    });


    function createScene(parent, name, elements) {
        if (scenes[name]) throw Error(`Scene with name ${name} already exists`);
        parent = parent || {elements:[]};
        let obj = Object.create(parent);
        extend(obj, {
            name: name,
            elements: Object.create(parent.elements),
        });
        elements.forEach(e=>obj.elements[e]=true);
        scenes[name] = obj;
        return obj;
    }

    let rootScene = createScene(null, 'root', []),
        gamePlayScene = createScene(rootScene,'SPECTATING',[
            'landSprites',
            'regionBorders',
            'pawnSprites',
            'gridOverlays',
            'hexSelectionProxy',
            'messages',
        ]),
        playerTurn = createScene(gamePlayScene,'PLAYER_TURN', [
            'selRegionHighlight',
            'uiRegionPanel',
            'nextTurnButton'
        ]);

    //default scene
    changeScene('SPECTATING');

    actions.attachGuard((prevAction, nextAction)=> new Promise(resolve => {
        switch (nextAction && nextAction.name) {
            case 'START_PLAYER_TURN':
                return uiElements.pawnSprites.flushAnimationQueue().then(resolve);
            default:
                resolve();
        }
    }));

    actions.setHandler('AWAIT_PLAYER_INPUT', (action) => {
        if (scene!=playerTurn) changeScene('PLAYER_TURN');
        resumeActions = action.resolve;
    });

    gameState.onReset.add(()=> {
        changeScene('SPECTATING');
        selectRegion(null);
    });

    function changeScene(nextSceneName) {
        return new Promise(resolve=> {
            if (!scenes[nextSceneName]) throw Error(`Invalid scene name ${nextSceneName}`);
            scene = scenes[nextSceneName];
            Z_ORDER.forEach(
                elementId=>uiElements[elementId].group.visible=scene.elements[elementId]
            );
            resolve();
        });
    }

    function selectHex(hex) {
        selectedHex = hex;
        self.onHexSelected.dispatch(hex);
    }

    function selectRegion(region) {
        if (selectedRegion === region) return;
        selectedRegion = region;
        self.onRegionSelected.dispatch(selectedRegion);
    }

    function endTurn() {
        if (!resumeActions) throw Error(`End turn called out of order`);
        changeScene('SPECTATING').then(()=>{
            resumeActions();
            resumeActions = null;
        });
    }

    function processActions() {
        if (!resumeActions) throw Error(`processActions called out of order`);
        actions.schedule('AWAIT_PLAYER_INPUT');
        resumeActions();
        resumeActions = null;
    }

    function render() {

    }

    function update() {

    }

    function toDebugString() {
        let elems = [];
        for (let key in scene.elements) {
            elems.push(key);
        }

        return `
${resumeActions?'<b>Waiting for player input...</b>':'Spectator mode'}

scene: ${scene.name}
uiElements: ${elems.join(', ')}`;
    }

    return self;
}

export default UIManager;