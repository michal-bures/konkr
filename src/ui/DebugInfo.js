import { OrderedMap } from 'lib/util';

class DebugInfo {
    constructor({game}) {
        this.game = game;
        this.items = new OrderedMap();
        this.sprites = [];
        this.commands = {};
    }

    set(key,value) {
        this.items.push(key,value);
    }

    sprite(sprite) {
        this.sprites.push(sprite);
    }

    addCommand(category,title,func) {
        if (!this.commands[category]) this.commands[category]=[];
        this.commands[category].push({title, func});
    }

    generateDebugCommandsHTML(enclosingDiv, category) {
        enclosingDiv.innerHTML="";
        if (!this.commands[category]) return [];
        this.commands[category].forEach(cmd=> {
          let newButton = document.createElement('input');
          newButton.type = 'button';
          newButton.className = 'debugCommandButton';
          newButton.value = cmd.title;
          newButton.onclick = function () {
            let newTitle = cmd.func();
            if (newTitle) newButton.value = newTitle;
          };
          enclosingDiv.appendChild(newButton);
        });
    }

    render() {
        let y = 32;
        this.items.forEach((key, value) => {
            if (value!==null && value!==undefined) {
                this.game.debug.text(key + ": " + value,32,y);
            }
            y +=32;
        });
        this.sprites.forEach(sprite=>this.game.debug.spriteBounds(sprite));
    }
}

export default DebugInfo;