function UIManager(spec) {
    
    let {regions,log, gameState} = spec,
        selectedRegion,
        selectedHex,
        hoveredRegion,
        hoveredHex;

    let ui = Object.freeze({
        onHexHovered: new Phaser.Signal(/* hex */),
        onHexSelected: new Phaser.Signal(/* hex */),
        onRegionSelected: new Phaser.Signal(/* region */),
        onRegionHovered: new Phaser.Signal(/* region */),
        onSelectedRegionChanged: new Phaser.Signal(/* region */),
        selectHex,
        selectRegion,
        selectedRegion() { return selectedRegion; },
        selectedHex() { return selectedHex; }
    });

    regions.onChanged.add((region) => {
        if (!selectedRegion) return;
        if (region === selectedRegion) {
            ui.onSelectedRegionChanged.dispatch(selectedRegion);
        }
    });

    regions.onDestroyed.add(region=> {
        if (!selectedRegion) return;
        if (region === selectedRegion) {
            selectRegion(null);
        }
    });

    gameState.onReset.add(()=>selectRegion(null));

    function selectHex(hex) {
        selectedHex = hex;
        ui.onHexSelected.dispatch(hex);
    }

    function selectRegion(region) {
        if (selectedRegion === region) return;
        selectedRegion = region;
        ui.onRegionSelected.dispatch(selectedRegion);
    }

    return ui;
}

export default UIManager;