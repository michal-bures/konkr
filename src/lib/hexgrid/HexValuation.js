import Heap from 'heap';

function AdhocFunctionValuation(valuationFunc) {
    return Object.freeze({
        get,
    });

    function get(hex) {
        return valuationFunc(hex);
    }
}

function ManualValuation(defaultValue, heapFunction = (a,b)=> a.val - b.val) {
    let data = {},
        heap = new Heap(heapFunction);

    return Object.freeze({
        // get(hex) => stored value for hex or defaultValue
        get,
        // set(hex, value) ... stores value for hex
        set,
        // pop => { hex, value } | null
        // returns max value based on heapFunction and removes it from the valuation
        // return null if valuation is empty
        pop, 
        reset,
    });

    function get(hex) {
        if (data[hex.id] === undefined) {
            return data[hex.id];
        } else {
            return defaultValue;
        }
    }

    function set(hex, value) {
        data[hex.id] = value;
        heap.push({hex: hex, val:value});
    }

    function reset() {
        data = {};
    }

    function pop() {
        let res = heap.pop();
        if (!res) return null;
        delete data[res.hex.id];
        return res;
    }
}


export { AdhocFunctionValuation, ManualValuation };