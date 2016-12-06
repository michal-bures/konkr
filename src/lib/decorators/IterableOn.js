function IterableOn(obj,getter) {
    if (!getter) throw Error(`Cannot iterate on ${getter}`);
    obj.forEach = (...args) => getter().forEach(...args);
}

export default IterableOn;