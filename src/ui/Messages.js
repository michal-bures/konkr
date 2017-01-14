import { debounce } from 'lib/util';

const OFFSET_FROM_BOTTOM=100;

const STYLE_COLORS = {
    default:'white',
    info:'white',
    error:'red',
    warn:'yellow'
};

function Messages({game, log, debug}) {
    let group = game.make.group();
    let currentYOffset = 0;

    group.y = calculateY();
    group.fixedToCamera=true;

    const self = Object.freeze({
        push,
        get group() { return group; }
    });

    function push(message,style='default') {
        let newSprite = new MessageSprite(game.width/2,currentYOffset, message, style);
        newSprite.anchor.x=0.5;
        group.add(newSprite);
        currentYOffset += newSprite.height;
        game.add.tween(group.cameraOffset).to({y: calculateY()},300,Phaser.Easing.Quadratic.InOut,true);
    }

    function calculateY() {
        return game.height-OFFSET_FROM_BOTTOM-currentYOffset;
    }

    function getStyle(style) {
        return { 
            font: "14px Arial",
            fill: STYLE_COLORS[style]
        };
    }


    class MessageSprite extends Phaser.Text {
        constructor(x,y, message, style) {
            super(game, x, currentYOffset+game.height, message+' ', getStyle(style));
            // note: one extra space added to message to prevent premature shadow cutoff
            this.anchor.setTo(0,0);
            this.setShadow(1,1,'rgba(0,0,0,1)',3);
            game.add.tween(this).to({y: y},300,Phaser.Easing.Quadratic.Out, true);
            setTimeout(()=>{
                game.add.tween(this).to({alpha: 0},2000,"Linear", true).onComplete.add(
                ()=>{
                    group.remove(this, true);
                });
            },2000);
            //log.debug(`Hex sprite for ${hex} created at ${x}:${y}`);
            /*
            var style = { font: "12px Courier New", fill: "white", align: "center"};
            this.label = game.add.text(HEX_WIDTH/2,HEX_HEIGHT/2,hex.id, style);
            this.label.alpha=0.5;
            this.label.lineSpacing = -6;
            this.label.anchor.set(0.5,0.5);
            this.addChild(this.label);*/
        }        
    }

    const resizeHandler = debounce(()=> {
        group.cameraOffset.y=calculateY();
    }, 200);

    game.scale.onSizeChange.add(resizeHandler);

    return self;
}

export default Messages;