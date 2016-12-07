function IterableOn(obj,iterable) {
    if (!iterable) throw Error(`Cannot iterate on ${iterable}`);
    obj.forEach = (...args) => { iterable.forEach(...args); };
    obj.map = iterable.map;
    obj.filter = iterable.filter;
    obj.some = iterable.some;
}

export default IterableOn;