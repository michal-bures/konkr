import { convertToWorldCoordinates, HEX_HEIGHT } from 'ui/Renderer';

const DEFAULT_TOOLTIP_DELAY = 750;
const NO_DELAYS_EXPIRATION_INTERVAL = 500;

function Popovers(spec, {
    tooltipDelay = DEFAULT_TOOLTIP_DELAY,
    noDelaysExpiration = NO_DELAYS_EXPIRATION_INTERVAL
}) {
    
    let {game, styles, ui, help, players, regions} =spec;
    let group = game.make.group();
    let delayedShowTimer = null,
        noDelaysExpirationTimer = null,
        noDelays = false;


    let self = Object.freeze({
        show,
        showDelayed,
        hide,
        get tooltipDelay() {return tooltipDelay; },
        get group() { return group; },
        toDebugString
    });

    let currentPopover = null;

    function pawnTitle(pawn) {
        const items = [];
        
        items.push({
            component: 'label',
            align: Phaser.LEFT_CENTER,
            text: help.getPawnTitle(pawn)+" ",
            style: styles.get("TOOLTIP_TITLE")
        });

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
        if (value) {
            items.push({
                component: 'label',
                align: Phaser.LEFT_CENTER,
                text: value,
                style: styles.get("TOOLTIP_TEXT")
            });
        }

        return {
            component: 'horizontalGroup',
            align: Phaser.LEFT_CENTER,
            spacing: 5,
            contains: items
        };
    }

    function pawnUpkeep(pawn) {
        if (!pawn.upkeep) return null;
        return {
            component: 'label',
            align: Phaser.LEFT_CENTER,
            text: `Costs ${pawn.upkeep}g each turn`,
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
        return {
            component: 'label',
            align: Phaser.LEFT_CENTER,
            text: (isOwn ? help.getOwnPawnDescription(pawn) : help.getHostilePawnDescription(pawn)),
            style: styles.get("TOOLTIP_FLAVOUR_TEXT")
        };
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

           return popoverUI({x,y}, {
                component: 'label',
                align: Phaser.CENTER,
                text: text,
                style: styles.get("TOOLTIP_TEXT")
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
        const components = ui.build( {
            name: 'popover',
            component: 'popoverPanel',
            contains: contents,
            useWorldCoords: !fixedToCamera,
            padding: 10,
            vOffset,
            x:x,
            y:y,
        });

        //debug.sprite(ui.label);
        return components.popover;

    }

    function show(type, ...args) {
        if (currentPopover) hide();

        let cfg = uiFactory[type];
        if (!cfg) throw `Unknown popover type: ${type}`;

        currentPopover = cfg(...args);

        group.add(currentPopover);
        currentPopover.show();
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