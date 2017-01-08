function RandomGenerator() {    
    let seed, initialSeed;
    reset();

    return Object.freeze({
        reset,
        oneOf,
        property,
        integer,
        number,
        hex,
        get seed() { return initialSeed; },
        toJSON() { return {seed,initialSeed}; },
        fromJSON(data) { seed = data.seed; initialSeed = data.initialSeed }
    });

    function reset(newSeed=Math.floor(Math.random()*100000)) {
        seed = newSeed;
        initialSeed = seed;
    }

    function number() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    function oneOf(array) {
        return array[integer(0,array.length-1)];
    }

    function hex(hexGroup) {
        if (!hexGroup.length) return null;
        let i = integer(0, hexGroup.length-1);
        let n = 0;
        var res = null;
        hexGroup.find(hex => { 
            if( n++ === i) {
                res = hex;
                return true;
            }
        });
        return res;
    }

    function property(obj) {
        var result;
        var count = 0;
        for (var prop in obj)
            if (number() < 1/++count)
               result = prop;
        return result;
    }
    
    function integer(from, to) {
        return Math.floor(number()*(to-from+1))+from;
    }
}


export default RandomGenerator;