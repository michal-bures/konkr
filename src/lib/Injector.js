import 'must/register';
import { isFunction, OrderedMap } from 'lib/util';

class Injector {
    constructor(parent) {
        this._resolved = {};
        this._constructors = {};
        this._loading = [];
        this._parentConstructors = [];

        if (parent instanceof Injector) {
            this._parentConstructors = parent.listConstructors();
            this._parentConstructors.forEach(key => {
                Object.defineProperty(this,key,{
                    get: () => { return parent[key]; }
                });
            });
        } else if (typeof parent == 'object') {
            this.registerAll(parent);
        }
    }

    listConstructors() {
        return Object.keys(this._constructors).concat(this._parentConstructors);
    }

    registerAll(obj) {
        Object.keys(obj).forEach(key => this.register(key, obj[key]));
    }

    register(name, factoryFunction) {
        if (!isFunction(factoryFunction)) throw Error(`Invalid factoryMethod for property '${name}' passed to injector`);

        if (Object.isSealed(this)) throw Error(`Attempt to add propert ${name} to an injector that is already sealed`);
        if (this._constructors[name]) throw Error(`Injector already has a '${name} propety registered'`);
        this._constructors[name] = factoryFunction;
        Object.defineProperty(this,name,{
            get: () => { 
                Object.seal(this); // no more props can be added to the injector after its used for the first time
                if (!this._resolved[name]) {
                    if (this._loading.indexOf(name)!==-1) throw Error(`Dependency loop detected! ${this._loading.join(' <- ')}`);
                    this._loading.push(name);
                    console.debug(`Loading: ${this._loading.join(' <- ')}`);
                    this._resolved[name]=factoryFunction(this);
                    this._loading.pop();
                }
                return this._resolved[name];
            }
        });
    }

    //explicitely resolve a property
    resolve(name) {
        return this[name];
    }
}

export default Injector;