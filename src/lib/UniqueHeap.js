import Heap from 'heap';

//Extension of Heap that prevents duplicates
class UniqueHeap extends Heap {
    constructor(...args) {
        super(...args);
        this._contains = {};
    }

    push(item) {
        if (this._contains[item]) return;
        this._contains[item] = true;
        super.push(item);
    }

    pop() {
        let item = super.pop();
        delete this._contains[item];
        return item;
    }
}

export default UniqueHeap;