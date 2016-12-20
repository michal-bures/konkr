import UI from 'lib/controls/UI';
import { assertDefined } from 'lib/util';

function RegionPanel(spec) {
    let { log, game, economy, ui, regions } = spec;

    let group = game.make.group(),
        currentRegion = null;

    let controls = new UI(spec,{
        name: 'mainContainer',
        component: 'pane',
        hAlign: 'center',
        vAlign: 'bottom',
        width: '100%',
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
    } = controls;

    assertDefined(mainContainer, regionNameLabel, economyLabel);
    mainContainer.addToGroup(group);

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
        } else {
            regionNameLabel.text = `Region #${region.id}`;
            const treasury = economy.treasuryOf(region);
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