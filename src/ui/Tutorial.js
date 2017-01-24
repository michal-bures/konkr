import Popovers from 'ui/Popovers';

export default function Tutorial(spec) {
    let {players, economy, userPrefs, log, ui, regionPanel} =spec;

    let popovers = new Popovers(spec),
        group = popovers.group,
        bindings = [];

    let data = {
        SELECT_YOUR_KINGDOM: {
            show: ({disableThisTutorial}) => {
                let targetHex = economy.capitalOf(players.bestRegionOf(players.localPlayer));
                if (!targetHex) return;
                popovers.show("HEX_TOOLTIP",targetHex,"Click here to inspect your kingdom!");
                ui.onRegionSelected.addOnce((region)=> {
                    if (!region) return;
                    disableThisTutorial();
                    activate("KINGDOM_TUTORIAL");
                });
            },
            enabled: true,
        },
        KINGDOM_TUTORIAL: {
            show: ({disableThisTutorial}) => {
                const treasury = economy.treasuryOf(ui.selectedRegion);
                const netIncome = economy.netIncomeOf(ui.selectedRegion);
                setTimeout(() => popovers.show("UI_TOOLTIP",regionPanel.group,`As you can see below, your kingdom has ${treasury} gold in treasury and earns ${netIncome} gold each turn.

Use gold to hire soldiers and build defenses.`),500);
                players.onBoughtPawn.addOnce(()=> {
                    disableThisTutorial();
                });
            },
            enabled: true,
        },
        BUY_VILLAGER: {
            message: "Click here to inspect your kingdom",
            get target() {
                return economy.capitalOf(players.bestRegionOf(players.localPlayer));
            }
        }
    };


    let self = Object.freeze({
        enable,
        disable,
        get group() { return group; },
        toDebugString,
    });

    function enable() {
        bindings = [
            ui.onSceneChanged.add((sceneName) => {
                if (sceneName === "PLAYER_TURN" && !ui.selectedRegion) activate("SELECT_YOUR_KINGDOM");
            })
        ];
    }

    function disable() {
        bindings.forEach(binding=>binding.detach());
        bindings.length=0;
    }

    function activate(key) {
        if (!data[key]) {
            log.warn("Ignoring undefined tutorial message: "+key);
            return;
        }
        const disableThisTutorial = () => {
            data[key].enabled = false;
            popovers.hide();
        };

        if (data[key].enabled) data[key].show({disableThisTutorial});
    }

    function toDebugString() {
        return `
Enabled: ${bindings.length>0}
`;
    }

    return self;
}