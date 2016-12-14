import { isFunction } from 'lib/util';

let i = 0;

function Injector(parent=Object, extension) {

    let _resolved = {},
        _constructors = {},
        _loading = [],
        _id = ++i;

    const self = Object.create(parent);

    self.listConstructors = function() {
        if (parent === Object) return Object.keys(_constructors);
        return Object.keys(_constructors).concat(parent.listConstructors());
    };

    self.registerAll = function(obj) {
        Object.keys(obj).forEach(key => self.register(key, obj[key]));
    };

    self.extend = function(extension) {
        return new Injector(self,extension);
    };

    self.register = function (name, factoryFunction) {
        if (!isFunction(factoryFunction)) throw Error(`Invalid factoryMethod for property '${name}' passed to injector`);

        if (Object.isSealed(self)) throw Error(`Attempt to add property '${name}' to an injector that is already sealed`);
        if (_constructors[name]) throw Error(`Injector already has a '${name} propety registered'`);
        _constructors[name] = factoryFunction;
        Object.defineProperty(self,name,{
            get: () => { 
                Object.seal(self); // no more props can be added to the injector after its used for the first time
                let loaderId = _id+'/'+name;
                if (!_resolved[name]) {
                    if (_loading.indexOf(loaderId)!==-1) throw Error(`Dependency loop detected! ${_loading.concat(loaderId).join(' <- ')}`);
                    _loading.push(loaderId);
                    console.debug(`Injector ${_id}> loading: ${_loading.join(' <- ')}`);
                    _resolved[name]=factoryFunction(self);
                    _loading.pop();
                }
                return _resolved[name];
            }
        });
    };

    //explicitely resolve a property
    self.resolve = function(name) {
        return self[name];
    };

    self.toDebugString = function() {
        const instantiated = Object.keys(_resolved);
        const sleeping = Object.keys(_constructors).filter(name => !_resolved[name]);
        const tParent = (parent !== Object? parent.toDebugString():'<root>');
        return `${tParent}
 -> [Ready: ${instantiated.join(', ')} Sleeping: ${sleeping.join(', ')} ]`;
    };

    if (extension) self.registerAll(extension);

    return self;
}

export default Injector;