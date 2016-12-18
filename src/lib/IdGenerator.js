function IdGenerator(spec) {
    let nextVal = {};

    return Object.freeze({
        next,
        reset,
        toJSON() { return nextVal; },
        fromJSON(obj) { nextVal = obj; }
    });

    function next(key) {
        if (!nextVal[key]) nextVal[key] = 1;
        return nextVal[key]++;
    }

    function reset(key) {
        nextVal[key] = 1;
    }

}

export default IdGenerator;