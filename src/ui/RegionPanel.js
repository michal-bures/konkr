import UI from 'lib/controls/UI';
import { assertDefined } from 'lib/util';

function RegionPanel(spec) {
    let { game, log, economy } = spec;
    assertDefined(game, log, economy);

    let group = game.add.group();

    let ui = new UI(spec,{
        name: 'mainContainer',
        component: 'pane',
        hAlign: 'center',
        vAlign: 'bottom',
        width: 500,
        height: 30,
        padding: 5,
        contains: [
            {
                name: 'regionNameLabel',
                component: 'label',
                vAlign: 'center',
                hAlign: 'left'
            },
            {
                name: 'economyLabel',
                component: 'label',
                hAlign: 'center',
                vAlign: 'center',
            }
        ]
    });

    let { 
        mainContainer, 
        regionNameLabel,
        economyLabel
    } = ui;

    assertDefined(mainContainer, regionNameLabel, economyLabel);

    mainContainer.addToGroup(group);

    return Object.freeze({
        setRegion,
        get group() { return group; }
    });

    function accountingColor(number) {
        if (number > 0) return "#00aa00";
        if (number < 0) return "#aa0000";
        return "#000000";
    }

    function setRegion(region) {
        if (!region) {
            regionNameLabel.text = '';
        } else {
            regionNameLabel.text = `Region #${region.id}`;
            const treasury = region.treasury;
            let netIncome = economy.netIncomeOf(region);
            const incomeColor = accountingColor(netIncome);
            const projectedTreasury = treasury + netIncome;
            netIncome = (netIncome>=0?'+':'')+netIncome;

            economyLabel.text = `${treasury} ${netIncome} = ${projectedTreasury}`;
            const offsetNetIncome = String(treasury).length+1;
            const offsetProjected = offsetNetIncome+String(netIncome).length+1;
            economyLabel.resetColors();
            economyLabel.addColor(incomeColor, offsetNetIncome);
            economyLabel.addColor('#888888', offsetProjected);            
        }
    }
}

export default RegionPanel;