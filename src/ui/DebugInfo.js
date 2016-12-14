import { OrderedMap } from 'lib/util';

class DebugInfo {
    constructor(spec) {
        this.spec = spec;
        this.game = spec.game;
        this.items = new OrderedMap();
        this.sprites = [];
        this.commands = {};
        this.globalCommands = [];
        this.valuations = {};
        this.overlaysRenderer = null;

    }

    set(key,value) {
        this.items.push(key,value);
    }

    sprite(sprite) {
        this.sprites.push(sprite);
    }

    valuation(title, hexValuation) {
        this.valuations[title]=hexValuation;
        if (this.overlaysRenderer) {
            this.overlaysRenderer.configureOverlay({
                name: title,
                valuation: hexValuation
            });
        }
    }

    attachOverlayRenderer(renderer) {
        this.overlaysRenderer = renderer;
        for (const title in this.valuations) {
            renderer.configureOverlay({
                name: title,
                valuation: this.valuations[title]
            });
        }
    }

    addCommand(category,title,func) {
        if (!category) return this.globalCommands.push({title, func});
        if (!this.commands[category]) this.commands[category]=[];
        this.commands[category].push({title, func});
    }

    getNamedProxy(name) {
        const self = this;
        return {
            set(...args) { self.set(...args); },
            sprite(...args) { self.set(...args); },
            addCommand(...args) { self.addCommand(name, ...args); },
            valuation(title, valuation) { self.valuation(name+'.'+title, valuation); }
        };
    }

    generateDebugCommandsHTML(enclosingDiv, category) {
        enclosingDiv.innerHTML="";
        this.globalCommands.concat(this.commands[category]||[]).forEach(cmd=> {
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