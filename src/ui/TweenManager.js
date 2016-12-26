function TweenManager({game}) {
    let tweens = [];

    return Object.freeze({
        add,
        waitForAll,
        stopAll,
        toDebugString,
        get tweens() { return tweens; }
    });

    function add(target) {
        let tween = game.add.tween(target);
        tweens.push(tween);
        return tween;
    }

    function runningTweens() {
        return tweens.filter(tween => tween.isRunning);
    }

    function waitForAll() {
        tweens = tweens.filter(tween => tween.isRunning && tween.target.exists);
        return Promise.all(runningTweens().map(tween => new Promise(resolve=> {
            tween.onComplete.add(resolve);
        })))
                      .then(()=>{tweens=[];});
    }

    function stopAll() {
        runningTweens().forEach(tween=>tween.stop());
        tweens = [];
    }

    function toDebugString() {
        let list = tweens.map(tween=>`${tween.isRunning?' ⏵ ':' ✓ '} ${tween.target} -> ${JSON.stringify(tween.properties)}`).join('\n');

        return `${runningTweens().length} running tweens (out of ${tweens.length} total):
${list}`;
    }
}

export default TweenManager;