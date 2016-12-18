import HexGroupSet from './HexGroupSet';

class HexGroup {
    constructor(hexes) {
        this.members=[];
        this._length = 0;
        this._pivot = null;
        Object.seal(this);
        if (hexes) this.add(hexes);
    }

    contains(hex) {
        return !!this.members[hex.id];
    }

    containsId(id) {
        return !!this.members[id];
    }

    _findNewPivot() {
        this._pivot = this.find(()=>true);
    }

    get pivot() {
        return this._pivot;
    }

    border(includeShoreline=false) {
        return this.filter( hex => {
            if (includeShoreline && hex.neighbours().length<6) return true;
            return hex.neighbours().filter(h2 => !this.contains(h2)).length>0;
        });
    }

    borderIncludingShoreline() {
        return this.border(true);
    }

    neighbours() {
        let res = new HexGroup();
        this.forEach( hex => {
            res.add(hex.neighbours().filter(h2 => !this.contains(h2)));
        });
        return res;
    }

    components(condition=()=>true) {
        let comps = new HexGroupSet();
        let compNumber = 1;
        this.forEach(hex => {
            if (!comps.getOwnerOf(hex)) {
                comps.add(hex, compNumber);
                comps.add(hex.floodFill(hex2=>this.contains(hex2) && condition(hex2)), compNumber);
                ++compNumber;
            }
        });
        return comps;
    }

    getById(id) {
        return this.members[id];
    }

    add(hexOrGroup) {
        hexOrGroup.forEach(hex=>{
            if (this.members[hex.id]) return false;
            if (!this._pivot) this._pivot = hex;
            this.members[hex.id] = hex;
            ++this._length;
            return true;
        });
    }

    remove(hexOrGroup) {
        hexOrGroup.forEach(hex => {
            if (this.members[hex.id] === undefined) return;
            delete this.members[hex.id];
            --this._length;

            if (hex === this._pivot) {
                this._findNewPivot();
            }
        });
    }

    filter(fn) {
        return new HexGroup(this.members.filter(fn));
    }

    forEach(fn) {
        return this.members.forEach(fn);
    }

    map(fn) {
        return this.members.filter(x=>x).map(fn);
    }

    find(fn) {
        if (!this.length) return undefined;
        for (const key in this.members) {
            if (fn(this.members[key])) return this.members[key];
        }
    }

    sort(fn) {
        return this.members.sort(fn);
    }

    clone() {
        return new HexGroup(this.members);
    }

    clear() {
        this.members = [];
    }

    get length() {
        return this._length;
    }

    floodFill(condition = ()=>true) {
        let pending = this.clone(); 

        let nextPending;
        const processHex = thisHex => {
                this.add(thisHex);
                nextPending.add(thisHex.neighbours().filter((adjHex)=>filterCondition(adjHex,thisHex)));
        };
        const filterCondition = (thisHex,prevHex)=>condition(thisHex,prevHex) && !this.contains(thisHex);
        while (pending.length > 0) {
            //log.debug("Pending:"+ pending.toString());
            nextPending = new HexGroup();
            pending.forEach(processHex);
            pending = nextPending;
        }
    }

    toJSON() {
        let ret = [];
        this.forEach(hex=>ret.push(hex.id));
        return ret;
    }

    toString() {
        return `[HexGroup (${this.length}): ${this.members.map(hex=>`#${hex.id}`).filter(a=>a!==undefined).join(",")}]`;
    }
}

export default HexGroup;