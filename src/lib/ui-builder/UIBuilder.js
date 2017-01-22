import Image from './components/Image';
import Label from './components/Label';
import Button from './components/Button';
import DecoratorPanel from './components/DecoratorPanel';
import LargeTextButton from './components/LargeTextButton';
import PawnShop from './components/PawnShop';
import HorizontalGroup from './components/HorizontalGroup';
import VerticalGroup from './components/VerticalGroup';
import PopoverPanel from './components/PopoverPanel';

const componentConstructors = {
    image : (...args) => new Image(...args),
    label : (...args) => new Label(...args),
    button : (...args) => new Button(...args),
    decoratorPane: (...args) => new DecoratorPanel(...args),
    largeTextButton: (...args) => new LargeTextButton(...args),
    pawnShop : (...args) => new PawnShop(...args),
horizontalGroup : (...args) => new HorizontalGroup(...args),
    verticalGroup : (...args) => new VerticalGroup(...args),
    popoverPanel : (...args) => new PopoverPanel(...args)
};

function UI (spec, def) {
    let {log, game} = spec;

    let components =[];
    let self = {
        addComponent,
        update() { components[0].update(); },
        get root() { return components[0]; }
    };
    addComponent(def);
    components[0].reflow();

    spec.ui.onResize.add(()=>components[0].reflow());

    function addComponent(def, parent) {
        if (def.name && self[def.name]) throw new Error(`Duplicate component name '${def.name}'`);
        let newComp = createComponent(def);
        if (parent) {
            parent.addComponent(newComp);
        }

        if (def.name) self[def.name] = newComp;
        components.push(newComp);
        if (def.contains) def.contains.forEach(childDef => {
            addComponent(childDef, newComp);
        });
    }

    function createComponent(def, parent) {
        let constructorFunc = componentConstructors[def.component];
        if (!constructorFunc) throw Error(`Unknown component type '${def.component}'`);
        return constructorFunc(spec,def,parent);
    }

   return self; 
}

export default Object.freeze({
    build(spec, def) {
        return new UI(spec, def);
    }
});