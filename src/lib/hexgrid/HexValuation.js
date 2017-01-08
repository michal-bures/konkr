import Heap from 'heap';

function Adhoc(valuationFunc) {
    return Object.freeze({
        get,
    });

    function get(hex, ...args) {
        return valuationFunc(hex, ...args);
    }
}

function Composite(valuation1, valuation2) {
    return Object.freeze({
        get,
        pop,
        peek
    });

    function get(hex, ...args) {
        const v1 = valuation1.get(hex, ...args);
        const v2 = valuation2.get(hex, ...args);
        return Math.max(v1,v2);
    }

    function pop() {
        let v1 = valuation1.peek(),
            v2 = valuation2.peek();

        if (!v2) return valuation1.pop();
        if (!v1) return valuation2.pop();

        if (v1.val > v2.val) {
            return valuation1.pop();
        } else {
            return valuation2.pop();
        }
    }

    function peek() {
        let v1 = valuation1.peek(),
            v2 = valuation2.peek();

        if (!v2) return valuation1.peek();
        if (!v1) return valuation2.peek();

        if (v1.val > v2.val) {
            return valuation1.peek();
        } else {
            return valuation2.peek();
        }
    }
}

function Manual(defaultValue, heapFunction = (a,b)=> b.val - a.val) {
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
        peek
    });

    function get(hex) {
        if (data[hex.id] !== undefined) {
            return data[hex.id].val;
        } else {
            return defaultValue;
        }
    }

    function set(hex, value) {
        if (data[hex.id]) {
            data[hex.id].val = value;
            heap.updateItem(data[hex.id]);
        } else {
            const entry = {hex: hex, val:value};
            data[hex.id] = entry;
            heap.push(entry);
        }
    }

    function reset() {
        data = {};
        heap = new Heap(heapFunction);
    }

    function peek() {
        return heap.peek();
    }

    function pop() {
        let res = heap.pop();
        if (!res) return null;
        delete data[res.hex.id];
        return res;
    }
}


export default { Manual, Adhoc, Composite };