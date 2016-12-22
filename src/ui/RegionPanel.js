import UI from 'lib/controls/UI';
import { assertDefined } from 'lib/util';

function RegionPanel(spec) {
    let { log, game, economy, ui, regions } = spec;

    let group = null,
        currentRegion = null;

    let controls = new UI(spec,{
        name: 'mainContainer',
        bgImage: 'regionPanel',
        component: 'pane',
        align:Phaser.BOTTOM_CENTER,
        contains: [
            {
                name: 'regionNameLabel',
                component: 'label',
            },
            {
                name: 'economyLabel',
                style: { font: "20pt Bookman Old Style", fill: "black"},
                component: 'label',
                x:112,
                y:48,
            },
            {
                name: 'pawnShop',
                component: 'pawnShop',
                align: Phaser.BOTTOM_CENTER,
                vOffset: -32,
            }
        ]
    });

    let { 
        mainContainer, 
        regionNameLabel,
        economyLabel,
        pawnShop
    } = controls;

    assertDefined(mainContainer, regionNameLabel, economyLabel);
    group = mainContainer;

    ui.onRegionSelected.add(region => {
        setRegion(region);
    });

    regions.onChanged.add(refreshIfMatchingCurrentRegion);
    economy.onRegionTreasuryChanged.add(refreshIfMatchingCurrentRegion);

    function refreshIfMatchingCurrentRegion(region) {
        if(region === currentRegion) setRegion(region);
    }


    return Object.freeze({
        get group() { return group; }
    });

    function accountingColor(number) {
        if (number > 0) return "#00aa00";
        if (number < 0) return "#aa0000";
        return "#000000";
    }

    function setRegion(region) {
        currentRegion = region;
        if (!region) {
            regionNameLabel.text = '';
            economyLabel.text = '';
            pawnShop.setStock([]);
        } else {
            regionNameLabel.text = `#${region.id}`;
            const treasury = economy.treasuryOf(region);
            let netIncome = economy.netIncomeOf(region);
            const incomeColor = accountingColor(netIncome);
            netIncome = (netIncome>=0?'+':'')+netIncome;

            economyLabel.text = `${treasury} ${netIncome}`;
            const offsetNetIncome = String(treasury).length+1;
            economyLabel.resetColors();
            economyLabel.addColor(incomeColor, offsetNetIncome);
            pawnShop.setStock(economy.buyablePawns(region));
        }
    }
}

export default RegionPanel;