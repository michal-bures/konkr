import log from 'loglevel';
import expect from 'expect';
import Hexagon from './Hexagon';
import HexGroup from './HexGroup';
import HexGroupSet from './HexGroupSet';

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
        this._index = undefined;
        this._axial = undefined;
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
        Object.seal(this);
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

class HexGrid {

    constructor({actions}, width=0, height=0) {
        this.hexes = [];
        this.reset(width, height);

        actions.setHandler('RESET_HEXGRID', (action, width, height) => {
            this.reset(width, height);
            action.resolve();
        });
    }

    toJSON() {
        return {
            w: this.width,
            h: this.height,
            hexes: this.hexes.map(hex=>(hex?'1':'0')).join('')
        };
    }

    fromJSON(src) {
        this.reset(src.w, src.h);
        this.fillWith(point => src.hexes[point.index]==='1');
    }

    reset(width, height) {
        this.hexes.length = 0;
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

    getHexByAxial(r,c) {
        if (c >= this.width - 0.5 + r/2 || c - r/2 <= -1) return null;
        if (r >= this.height) return null;
        const i = r * this.width + c - Math.floor(r/2);
        return this.hexes[i] || null;
    }

    getHexById(id) {
        return this.hexes[id] || null;
    }

    forEach(fn) {
        return this.hexes.forEach(hex => {
            if (hex) fn(hex);
        });
    }

    destroyHexes(hexes) {
        hexes.forEach(hex => {
            this.hexes[hex.position.index] = null;
        });
    }

    components(condition=()=>true) {
        let comps = new HexGroupSet();
        let compNumber = 1;
        this.forEach(hex => {
            if (!comps.getOwnerOf(hex)) {
                comps.add(hex, compNumber);
                comps.add(hex.floodFill(condition), compNumber);
                ++compNumber;
            }
        });
        return comps;
    }

    allHexes() {
        return new HexGroup(this.hexes.filter(x=>x));
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
        grid.forEach(function(hex) {
            log.debug("Visited hex " + hex.toString());
        });
    }
}

export { HexGrid, HexGroup };

