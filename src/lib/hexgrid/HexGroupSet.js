import HexGroup from './HexGroup';
import expect from 'expect';

class HexGroupSet {
    constructor() {
        this.groups = {};
        this.membership = [];
        this._length = 0;
    }

    add(hexOrGroup, key) {
        hexOrGroup.forEach(hex => {
            if (this.membership[hex.id]) {
                if (this.membership[hex.id] === key) return;
                this.groups[key].remove(hex);
            } else if (!this.groups[key]) {
                this.groups[key] = new HexGroup();
                ++this._length;
            }
            this.groups[key].add(hex);
            this.membership[hex.id] = key;
        });
    }

    getOwnerOf(hex) {
        expect(hex).toExist();
        return this.membership[hex.id];
    }

    remove(key) {
        expect(this.groups[key]).toBeTruthy();
        this.groups[key].forEach(hex=> delete this.membership[hex.id]);
        delete this.groups[key];
        --this._length;
    }

    forEach(fn) {
        for (const key in this.groups) {
            fn(this.groups[key],key);
        }
    }

    map(fn) {
        let res = [];
        this.forEach((group,key)=>res.push(fn(group,key)));
        return res;
    }

    getLargestGroup() {
        var max = 0;
        var res = null;
        this.forEach(hexGroup => {
            if (hexGroup.length > max) {
                max = hexGroup.length;
                res = hexGroup;
            }
        });
        return res;
    }

    popLargestGroup() {
        var max = 0;
        var res = -1;
        var group = null;
        this.forEach((hexGroup, key) => {
            if (hexGroup.length > max) {
                max = hexGroup.length;
                res = key;
                group = this.groups[key];
            }
        });
        if (!group) return null;
        this.remove(res);
        return group;
    }    

    get length() {
        return this._length;
    }

    toString() {
        let total=0;
        let str = Object.keys(this.groups).map((key) => {
            const len = this.groups[key].length;
            total += len;
            return `${key}(${len})`;
        }).join(", ");
        return `[HexGroupSet (${total}): ${str}]`;
    }
}

export default HexGroupSet;