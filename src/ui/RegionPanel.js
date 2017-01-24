import { assertDefined } from 'lib/util';

function RegionPanel(spec) {
    let { log, debug, game, economy, ui, styles, regions, players, pawns, uiTooltips } = spec;

    let group = game.make.group(),
        currentRegion = null;

    let controls = ui.build({
        name: 'regionsPanel',
        component: 'image',
        src: 'regionPanel',
        align:Phaser.BOTTOM_CENTER,
        onClicked: onPanelClick,
        animator: 'slideUp',
        contains: [
            {
                name: 'pawnShop',
                component: 'pawnShop',
                align: Phaser.BOTTOM_CENTER,
                vOffset: -32,
            },
            {
                name: 'stats',
                component: 'horizontalGroup',
                align: Phaser.BOTTOM_CENTER,
                spacing: 3,
                vOffset: -2,
                contains: [
                    {
                        name: 'goldIcon',
                        component: 'image',
                        src: 'goldCoins',
                        align: Phaser.BOTTOM_CENTER,
                        vOffset: -2,
                    },
                    {
                        name: 'treasuryLabel',
                        style: styles.get('TREASURY_LABEL'),
                        component: 'label',
                        onClicked: showTreasuryTooltip,
                        onInputOver: showTreasuryTooltipDelayed,
                        onInputOut: ()=>uiTooltips.hide(),
                        align: Phaser.BOTTOM_CENTER,
                    },
                    {
                        name: 'incomeLabel',
                        style: styles.get('INCOME_LABEL'),
                        component: 'label',
                        align: Phaser.BOTTOM_CENTER,
                        vOffset: -4,
                    },

                ]
            }
        ]
    });

    let { 
        regionsPanel, 
        treasuryLabel,
        incomeLabel,
        pawnShop,
    } = controls;

    assertDefined(regionsPanel, treasuryLabel, incomeLabel);
    //group.add(regionsPanel);
    group = regionsPanel;

    ui.onRegionSelected.add(region => {
        setRegion(region);
    });

    regions.onChanged.add(refreshIfMatchingCurrentRegion);
    economy.onRegionTreasuryChanged.add(refreshIfMatchingCurrentRegion);
    /*players.onDroppedPawn.add((pawnType, hex)=>{
        if (regions.regionOf(hex) === currentRegion) synchronize();
    });*/
    /*players.onGrabbedPawn.add(()=> {
       if (players.grabbedPawnRegion === currentRegion) synchronize();
    });*/
    players.onBoughtPawn.add((pawnType, region)=> {
        refreshIfMatchingCurrentRegion(region);
    });
    pawns.onCreated.add(pawn=> {
        refreshIfMatchingCurrentRegion(regions.regionOf(pawn.hex));
    });
    pawns.onDestroyed.add(pawn=> {
        refreshIfMatchingCurrentRegion(regions.regionOf(pawn.hex));
    });

    return Object.freeze({
        get group() { return group; },
        synchronize        
    });

    function showTreasuryTooltip() {
        uiTooltips.show('KINGDOM_TREASURY',treasuryLabel,currentRegion);
    }

    function showTreasuryTooltipDelayed() {
        uiTooltips.showDelayed('KINGDOM_TREASURY',treasuryLabel,currentRegion);
    }



    function refreshIfMatchingCurrentRegion(region) {
        if(region === currentRegion) synchronize();
    }


    function accountingColor(number) {
        if (number > 0) return "#00aa00";
        if (number < 0) return "#aa0000";
        return "#000000";
    }

    function synchronize() {
        setRegion(ui.selectedRegion);
    }

    function setRegion(region) {
        currentRegion = region;
        if (!region) {
            regionsPanel.hide();
        } else {
            //regionNameLabel.text = `#${region.id}`;
            const treasury = economy.treasuryOf(region);
            let netIncome = economy.netIncomeOf(region);
            if (players.grabbedPawn) netIncome -= (players.grabbedPawn.upkeep || 0);
            const incomeColor = accountingColor(netIncome);
            netIncome = (netIncome>=0?'+':'')+netIncome;

            treasuryLabel.text = treasury;
            incomeLabel.text = netIncome;
            incomeLabel.addColor(incomeColor, 0);
            pawnShop.setStock(economy.buyablePawns(region));
            regionsPanel.show();
        }
    }

    function onPanelClick() {
        ui.undoBuy();
    }

}

export default RegionPanel;