import log from 'loglevel';
import expect from 'expect';

// A coordinates in the hexagonal grid.
// automatically converts between three coordinate systems
// - ordinal: (index, rowrowSize) position of hex in a 1D array organized by rows
// - axial: (r,c) coordinates in hex map (r = row, c = column (column axis on hex grid goes down and sligthly left))
// - spatial: (x,y) coordinates on screen
class GridPoint {
    // index = index in single-dimensional row-major array of hexes
    // rowSize = number of hexes per row in the array
    constructor({x,y,r,c,index,rowSize}) {
        expect(rowSize).toBeA('number');
        if (x !== undefined && y !== undefined) {
            this._axial = { r: 2*(y-x), c: y};
        } else if (r !== undefined && c !== undefined) {
            this._axial = { r: r };
        } else if (index !== undefined && rowSize !== undefined) {
            this._index = index;
        } else {
            log.error('Invalid coordinates specification for creating a GridPoint ',{x:x,y:y,r:r,c:c,index:index,rowSize:rowSize});
        }
        this._rowSize = rowSize;
    }

    // Index in array of all gridpoints on map
    get index() {
        if (this._index === undefined) {
            this._index = this.r * this._rowSize + this.c - Math.floor(this.r/2);
        }
        return this._index;
    }

    // Axial coordinates in hexagonal grid
    get axial() {
        if (this._axial === undefined) {
            let r = Math.floor(this._index / this._rowSize);
            this._axial = {r: r, c:Math.floor(this._index  % this._rowSize + Math.floor(r/2))};
        }
        return this._axial;
    }


    // row in hexagonal grid
    get r() {
        return this.axial.r;
    }

    // "column" (line going down and left) in the hexagonal grid
    get c() {
        return this.axial.c;
    }

    // horizontal coordinate for display
    get x() {
        return this.c - this.r/2;
    }

    // vertical coordinate for display
    get y() {
        return this.r;
    }

    toString() {
        return(`[GridPoint ${this.index} (${this.r},${this.c})]`);
    }

}

const HEX_ADJACENCY_VECTORS = [[-1,-1],[-1,0],[0,1],[1,1],[1,0],[0,-1]];

class Hexagon {
    constructor(grid,gridPoint) {
        this.position = gridPoint;
        this.grid = grid;
    }

    toString() {
        return `[Hex at ${this.position}]`;
    }

    neighbours() {
        const {r,c} = this.position;
        return HEX_ADJACENCY_VECTORS
            .map((change) => this.grid.getHexByAxial(r+change[0], c+change[1]))
            .filter((hex) => hex.exists());        
    }

    floodFill(condition) {
        return (new HexSet([this])).floodFill(condition);
    }

    get id() {
        return this.position.index;
    }

    exists() { return true; }
}

class HexSet {
    constructor(hexes) {
        this.members=[];
        if (hexes) this.addAll(hexes);
    }

    contains(hex) {
        return !!this.members[hex.id];
    }

    containsId(id) {
        return !!this.members[id];
    }

    getById(id) {
        return this.members[id];
    }

    add(hex) {
        if (this.members[hex.id]) return false;
        this.members[hex.id] = hex;
        return true;
    }

    addAll(hexes) {
        hexes.forEach(this.add);
    }

    remove(hex) {
        this.members[hex.id] = undefined;
    }

    forEach(fn) {
        return this.members.forEach(fn);
    }

    clone() {
        return new HexSet(this.members);
    }

    clear() {
        this.members = [];
    }

    get length() {
        return this.members.length;
    }

    floodFill(condition = ()=>true) {
        let pending = this.clone(); 

        let nextPending;
        const processHex = hex => {
                this.add(hex);
                nextPending.addAll(hex.neighbours().filter(filterCondition));
        };
        const filterCondition = hex=>condition(hex) && !this.contains(hex);

        while (pending.length > 0) {
            nextPending = new HexSet();
            pending.forEach(processHex);
        }
    }

    toString() {
        return `[HexSet (${this.data.map(hex=>`#${hex.id}`).join(",")})]`;
    }
}

class HexGrouping {
    constructor() {
        this.groups = {};
        this.membership = [];
    }

    add(hex, key) {
        if (this.membership[hex.id]) {
            if (this.membership[hex.id] === key) return;
            this.groups[key].remove(hex);
            if (!this.groups[key]) this.groups[key] = new HexSet();
            this.groups[key].add(hex);
            this.membership[hex.id] = key;
        }
    }

    addAll(hexes, key) {
        hexes.forEach(hex => this.add(hex, key));
    }

    getOwnerOf(hex) {
        return this.membership[hex.id];
    }

    toString() {
        let total=0;
        let str = Object.keys(this.groups).map((key) => {
            const len = this.groups[key].length;
            total += len;
            return `${key}(${len})`;
        }).join(", ");
        return `[HexGrouping (${total}): ${str}]`;
    }
}

class HexGrid {

    constructor(width, height) {
        this.hexes = [];
        this.width = width;
        this.height = height;
        this.upperBound = width * height;
    }

    fillWith(fn) {
        for (let i = 0; i < this.upperBound; ++i) {
            var p = new GridPoint({index: i, rowSize: this.width});
            this.hexes[i] = (fn(p) ? new Hexagon(this,p) : null );
        }
    }

    // point = GridPoint instance
    getHexByAxial(r,c) {
        if (c >= this.width - 0.5 + r/2 || c - r/2 <= -1) return NullHex;
        if (r >= this.height) return NullHex;
        const i = r * this.width + c - Math.floor(r/2);
        return this.hexes[i] || NullHex;
    }

    map(fn) {
        var self = this;
        return this.hexes.map(function(hex, index) {
            fn(hex, new GridPoint({index: index, rowSize: self.width}));
        });
    }

    components(categoryFunction) {
        let comps = new HexGrouping();
        let compNumber = 1;
        this.hexes.forEach(hex => {
            if (!comps.getOwnerOf(hex)) {
                comps.add(hex, compNumber);
                comps.addAll(hex.floodFill(), compNumber);
                ++compNumber;
            }
        });
    }

    dump() {
        let str = "";
        for (let r = 0; r < this.height; ++r) {
            for (let c = 0; c < this.width; ++c) {
                str+=(this.hexes[r*this.height+c]===null?" ":"X");
            }
            str += "\n";
        }
        return str;
    }

    static test() {
        let grid = new HexGrid(4,6);
        log.debug("4x6 world");
        grid.map(function(hex,p) {
            log.debug("Visited hex #" + p);
        });
    }
}

const NullHex = {
    toString: () => "[Null Hexagon]",
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
    floodFill: () => new HexSet()
};

export { HexGrid };

