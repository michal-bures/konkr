function IterableOn(obj,iterable) {
    if (!iterable) throw Error(`Cannot iterate on ${iterable}`);
    obj.forEach = (...args) => { return iterable.forEach(...args); };
    obj.map = (...args) => { return iterable.map(...args); };
    obj.filter = (...args) => { return iterable.filter(...args); };
    obj.some = (...args) => { return iterable.some(...args); };
}

export default IterableOn;