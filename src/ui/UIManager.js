import * as Renderer from './Renderer';
import HexSelectionProxy from './HexSelectionProxy';
import Scrolling from './Scrolling';
import RegionPanel from './RegionPanel';
import GridOverlays from './GridOverlays';
import Messages from './Messages';
import PawnSprites from './PawnSprites';
import Injector from 'lib/Injector';

function UIManager(spec) {
    
    let {game, regions, log, gameState} = spec,
        selectedRegion,
        selectedHex,
        scene,
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
        render,
        update,
        selectedRegion() { return selectedRegion; },
        selectedHex() { return selectedHex; }
    });

    //display layers z-order
    game.world.add(uiElements.landSprites.group);          
    game.world.add(uiElements.regionBorders.group);  
    game.world.add(uiElements.selRegionHighlight.group);
    game.world.add(uiElements.pawnSprites.group);          
    game.world.add(uiElements.gridOverlays.group);  
    game.world.add(uiElements.hexSelectionProxy.group);
    game.world.add(uiElements.messages.group);  
    game.world.add(uiElements.uiRegionPanel.group);  
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

    //scene = new ScenePlay();

    gameState.onReset.add(()=>selectRegion(null));

    function selectHex(hex) {
        selectedHex = hex;
        self.onHexSelected.dispatch(hex);
    }

    function selectRegion(region) {
        if (selectedRegion === region) return;
        selectedRegion = region;
        self.onRegionSelected.dispatch(selectedRegion);
    }

    function render() {

    }

    function update() {

    }

    return self;
}

export default UIManager;