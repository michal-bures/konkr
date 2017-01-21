const SHOWHIDE_DURATION = 200;

function AnimatorBase(component, {show, hide}) {
    let tween = null;
    let hidden = true;
    component.visible = false;

    return Object.freeze({
        animateShow,
        animateHide
    });

    function animateHide() {
        if (hidden) return;
        hidden = true;
        if (tween) {
            tween.stop();
        }
        tween = hide();        
        if (tween) tween.onComplete.add(()=>{
            if (hidden) component.visible = false;
        });
    }

    function animateShow() {
        if (!hidden) return;
        hidden = false;
        if (tween) {
            tween.stop();
            tween = null;
        }
        component.visible = true;
        tween = show();
    }

}

function AnimatorSlideUp({game,tweens,log}, component) {
    return new AnimatorBase(component, {
        show() {
            component.reflow();
            let targetY = component.cameraOffset.y;
            component.y = game.height;
            component.cameraOffset.y=component.y;
            return tweens.add(component.cameraOffset).to({y:targetY}, SHOWHIDE_DURATION, Phaser.Easing.Quadratic.InOut, true);
        },
        hide() {
            return tweens.add(component.cameraOffset).to({y:game.height}, SHOWHIDE_DURATION, Phaser.Easing.Quadratic.InOut, true);
        }
    });
}

function AnimatorPopup({tweens},component, fromX, fromY) {
    return new AnimatorBase(component, {
        show() {
            const dx = fromX - component.pivot.x;
            const dy = fromY - component.pivot.y;
            component.pivot.x = fromX;
            component.x += dx;
            component.pivot.y = fromY;
            component.y += dy;

            component.scale.setTo(0.1);
            return tweens.add(component.scale).to({x:1, y:1}, SHOWHIDE_DURATION, Phaser.Easing.Quadratic.InOut, true);        
        },
        hide() {
            return tweens.add(component.scale).to({x:0.1, y:0.1}, SHOWHIDE_DURATION, Phaser.Easing.Quadratic.InOut, true);        
        }
    });
}

export default {
    popup: AnimatorPopup,
    slideUp: AnimatorSlideUp,
};