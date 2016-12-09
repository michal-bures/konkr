import IterableOn from 'lib/decorators/IterableOn';
import { Random } from 'lib/util';

const HEX_ADJACENCY_VECTORS = [[-1,-1],[-1,0],[0,1],[1,1],[1,0],[0,-1]];

const NullHex = {
    toString: () => "[Null Hex]",
    neighbours: () => [],
    id: -1,    
    exists: () => false,
    position: {
        x: -1, 
        y: -1, 
        r: -1,
        c: -1,
        index: -1,
        toString: () => "[Null GridPoint]"
    },
    floodFill: null,
};

class HexGroup {
    constructor(hexes) {
        this.members=[];
        this._length = 0;
        this._pivot = NullHex;
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
        if (!this.length) return NullHex;
        for (key in this.members) {
            this._pivot = this.members[key];
            return;
        }
    }

    get pivot() {
        return this._pivot;
    }

    border() {
        return this.filter( hex => hex.neighbours().filter(h2 => !this.contains(h2)).length>0);
    }

    neighbours() {
        let res = new HexGroup();
        this.forEach( hex => {
            res.add(hex.neighbours().filter(h2 => !this.contains(h2)));
        });
        return res;
    }

    getRandomHex() {
        if (!this.length) return NullHex;
        let i = Random.integer(0, this._length-1);
        let n = 0;
        var res = NullHex;
        this.members.some(hex => { 
            if( n++ === i) {
                res = hex;
                return true;
            }
        });
        return res;
    }

    getById(id) {
        return this.members[id];
    }

    add(hexOrGroup) {
        hexOrGroup.forEach(hex=>{
            if (this.members[hex.id]) return false;
            if (!this._pivot.exists()) this._pivot = hex;
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

    toString() {
        return `[HexGroup (${this.length}): ${this.members.map(hex=>`#${hex.id}`).filter(a=>a!==undefined).join(",")}]`;
    }
}


class Hexagon {
    constructor(grid,gridPoint) {
        this.position = gridPoint;
        this.grid = grid;
        Object.freeze(this);
    }

    toString() {
        return `[Hex #${this.id} (${this.position.r},${this.position.c})]`;
    }

    neighbours(condition=()=>true) {
        const {r,c} = this.position;
        return HEX_ADJACENCY_VECTORS
            .map((change) => this.grid.getHexByAxial(r+change[0], c+change[1]))
            .filter((hex) => hex.exists() && condition(hex));        
    }

    floodFill(condition) {
        const res = new HexGroup([this]);
        res.floodFill(condition);
        return res;
    }

    forEach(fn) {
        fn(this);
    }

    filter(fn) {
        return new HexGroup([this].filter(fn));
    }

    map(fn) {
        return new HexGroup([fn(this)]);
    }

    get id() {
        return this.position.index;
    }

    exists() { return true; }
}

NullHex.floodFill = () => new HexGroup();
Object.freeze(NullHex);

export { Hexagon, HexGroup, NullHex };