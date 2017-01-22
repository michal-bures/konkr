import { convertToWorldCoordinates, HEX_HEIGHT } from 'ui/Renderer';
import { numberWithSign } from 'lib/util';

const DEFAULT_TOOLTIP_DELAY = 750;
const NO_DELAYS_EXPIRATION_INTERVAL = 500;

function Popovers(spec, {
    tooltipDelay = DEFAULT_TOOLTIP_DELAY,
    noDelaysExpiration = NO_DELAYS_EXPIRATION_INTERVAL
}) {
    
    let {game, styles, ui, help, players, regions, economy, debug} =spec;
    let group = game.make.group(null,"popovers");
    let delayedShowTimer = null,
        noDelaysExpirationTimer = null,
        noDelays = false,
        currentPopoverCfg = null;


    let self = Object.freeze({
        show,
        showDelayed,
        hide,
        get tooltipDelay() {return tooltipDelay; },
        get group() { return group; },
        toDebugString
    });

    let currentPopover = null;

    function tooltipTitle(text) {
        return {
            component: 'label',
            align: Phaser.LEFT_CENTER,
            text: text,
            style: styles.get("TOOLTIP_TITLE")
        };
    }

    function tooltipText(text) {
        return {
            component: 'label',
            align: Phaser.LEFT_CENTER,
            text: text,
            style: styles.get("TOOLTIP_TEXT")
        };
    }

    function tooltipFlavourText(text) {
        return {
            component: 'label',
            align: Phaser.LEFT_CENTER,
            text: text,
            style: styles.get("TOOLTIP_FLAVOUR_TEXT")
        };
    }

    function horizontalLayout(items) {
        return {
            component: 'horizontalGroup',
            align: Phaser.LEFT_CENTER,
            spacing: 5,
            contains: items
        };
    }

    function pawnTitle(pawn) {
        const items = [];
        
        items.push(tooltipTitle(help.getPawnTitle(pawn)+" "));

        let image, value;
        if (pawn.might) {
            image = 'might';
            value = pawn.might;
        } else if (pawn.defense) {
            image = 'shield-blue';
            value = pawn.defense;
        }

        if (image) {
            items.push({
                component: 'image',
                align: Phaser.LEFT_CENTER,
                src: image,
            });
        }
        if (value) items.push(tooltipText(value));

        return horizontalLayout(items);
    }

    function pawnUpkeep(pawn) {
        if (!pawn.upkeep) return null;
        return {
            component: 'label',
            align: Phaser.LEFT_CENTER,
            text: `Costs ${pawn.upkeep}g every turn`,
            style: styles.get("TOOLTIP_ATTRIBUTES")
        };
    }

    function pawnPrice(pawn) {
        if (!pawn.price) return null;
        const verb = (pawn.isTroop()?'Hire':'Build');
        return {
            component: 'label',
            align: Phaser.LEFT_CENTER,
            text: `${verb} for ${pawn.price}g`,
            style: styles.get("TOOLTIP_ATTRIBUTES")
        };
    }    

    function pawnDescription(pawn, isOwn=false) {
        return tooltipFlavourText((isOwn ? help.getOwnPawnDescription(pawn) : help.getHostilePawnDescription(pawn)));
    }

    let uiFactory = {
        HEX_PAWN_TOOLTIP(pawn) {
           let [x,y] = convertToWorldCoordinates(pawn.hex.position.x, pawn.hex.position.y);
           const isOwn = players.activePlayer.controls(regions.regionOf(pawn.hex));

           return popoverUI({x,y}, {
                component: 'verticalGroup',
                spacing: 3,
                contains: [
                    pawnTitle(pawn),
                    pawnUpkeep(pawn),
                    pawnDescription(pawn, isOwn),
                ].filter(x=>x)
           });
        },
        HEX_TOOLTIP(hex, text) {
           let [x,y] = convertToWorldCoordinates(hex.position.x, hex.position.y);

           return popoverUI({x,y}, tooltipText(text));
        },    
        KINGDOM_TREASURY(sprite, region) {
            let x = sprite.world.x + sprite.width/2 - game.camera.view.x;
            let y = sprite.world.y - game.camera.view.y;

            let breakdown = {};
            let str = [];
            const netIncome = economy.netIncomeOf(region,breakdown);
            const treasury = economy.treasuryOf(region);
            for (const key in breakdown) {
                str.push(help.getIncomeBreakdownItem(key)+": "+numberWithSign(breakdown[key])+"g");
            }
            const boldStyle = styles.get('TOOLTIP_TEXT');
            boldStyle.fontWeight = "bold";

            return popoverUI({x,y,fixedToCamera:true,vOffset:0}, {
                component: 'verticalGroup',
                spacing: 3,
                contains: [
                    tooltipTitle("Kingdom treasury"),
                    { component: 'label', style: boldStyle, align: Phaser.LEFT_CENTER, text: "Current: "+treasury+"g" },
                    tooltipText(str.join('\n')),
                    { component: 'label', style: boldStyle, align: Phaser.LEFT_CENTER, text: "Net income: "+numberWithSign(netIncome)+"g" },
                    { component: 'label', style: boldStyle, align: Phaser.LEFT_CENTER, text: "Next turn: "+(treasury+netIncome)+"g" }
                ].filter(x=>x)
            });
        },              
        BUY_PAWN_TOOLTIP(sprite, pawnType) {
            let x = sprite.world.x - game.camera.view.x;
            let y = sprite.world.y - game.camera.view.y;
            return popoverUI({x,y, fixedToCamera:true}, {
                component: 'verticalGroup',
                spacing: 3,
                contains: [
                    pawnTitle(pawnType),
                    pawnPrice(pawnType),
                    pawnUpkeep(pawnType),
                    pawnDescription(pawnType, true)
                ].filter(x=>x)
            });
        },
        UI_TOOLTIP(sprite, text) {
            let x = sprite.world.x + sprite.width/2 - game.camera.view.x;
            let y = sprite.world.y - game.camera.view.y;
            return popoverUI({x,y, fixedToCamera:true,vOffset:0}, {
                component: 'verticalGroup',
                spacing: 3,
                contains: [{
                    align: Phaser.LEFT_CENTER,
                    component: 'label',
                    text: text,
                    style: styles.get("TOOLTIP_TEXT")
                }],
            });
        }
    };

    function popoverUI({x,y,fixedToCamera,vOffset=10},...contents) {
        return {
            name: 'popover',
            component: 'popoverPanel',
            contains: contents,
            useWorldCoords: !fixedToCamera,
            padding: 10,
            vOffset,
            x:x,
            y:y,
        };
    }

    function show(type, ...args) {

        let cfg = uiFactory[type];
        if (!cfg) throw `Unknown popover type: ${type}`;
        let newPopoverCfg = cfg(...args);

        let fast = (currentPopoverCfg && currentPopoverCfg.x == newPopoverCfg.x && currentPopoverCfg.y == newPopoverCfg.y);
        if (currentPopover) hide();
        currentPopoverCfg = newPopoverCfg;
        currentPopover = ui.build(newPopoverCfg).root;
        group.add(currentPopover);
        if (fast) currentPopover.showFast(); else currentPopover.show();
    }

    function showDelayed(type, ...args) {
        if (delayedShowTimer) {
            clearTimeout(delayedShowTimer);
            delayedShowTimer = null;
        }
        delayedShowTimer = setTimeout(()=> {
            show(type, ...args);
            temporarilySkipDelays();
            delayedShowTimer = null;
        }, (noDelays?0:tooltipDelay));        
    }

    function hide() {
        if (delayedShowTimer) {
            clearTimeout(delayedShowTimer);
            delayedShowTimer = null;
        }
        if (!currentPopover) return;
        temporarilySkipDelays();
        group.remove(currentPopover);
        currentPopover.destroy();
        currentPopover = null;
        currentPopoverCfg = null;
    }

    function toDebugString() {
        return `current popover: ${currentPopover}
skip delays: ${noDelays}
delay: ${tooltipDelay}
skip delays Period: ${noDelaysExpiration}`;
    }

    function temporarilySkipDelays() {
        if (!noDelaysExpiration) return;
        noDelays = true;
        if (noDelaysExpirationTimer) clearTimeout(noDelaysExpirationTimer);
        noDelaysExpirationTimer = setTimeout(()=> {
            noDelays = false;
        }, noDelaysExpiration);
    }

    return self;

}

export default Popovers;