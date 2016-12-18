import HexGroup from './HexGroup';

const DIRECTION =             {0:'UP_LEFT',1:'UP_RIGHT',2:'RIGHT',3:'DOWN_RIGHT',4:'DOWN_LEFT', 5:'LEFT'};
const HEX_ADJACENCY_VECTORS = [  [-1,-1],    [-1,0],      [0,1],    [1,1],         [1,0],       [0,-1]];

class Hexagon {
    constructor(grid,gridPoint) {
        this.position = gridPoint;
        this.grid = grid;
        Object.freeze(this);
    }

    toString() {
        return `⬡${this.id}`;
    }


    neighbours(condition=()=>true) {
        const {r,c} = this.position;
        return HEX_ADJACENCY_VECTORS
            .map((change) => this.grid.getHexByAxial(r+change[0], c+change[1]))
            .filter((hex) => hex && condition(hex));        
    }

    neighbour(direction) {
        return this.grid.getHexByAxial(this.position.r+HEX_ADJACENCY_VECTORS[direction][0],this.position.c+HEX_ADJACENCY_VECTORS[direction][1]);
    }

    floodFill(condition) {
        const res = new HexGroup([this]);
        res.floodFill(condition);
        return res;
    }

    floodFind(searchFunc, floodCondition = ()=>true) {
        let pending = new HexGroup([this]);
        let visited = new HexGroup();
        let nextPending;
        const processHex = thisHex => {
                visited.add(thisHex);
                if (searchFunc(thisHex)) {
                    return thisHex;
                } else {
                    nextPending.add(thisHex
                        .neighbours()
                        .filter((adjHex)=>filterCondition(adjHex,thisHex)));
                    return null;
                }
        };
        
        const filterCondition = (thisHex,prevHex) =>
            !visited.contains(thisHex) &&
            floodCondition(thisHex,prevHex);

        while (pending.length > 0) {
            //log.debug("Pending:"+ pending.toString());
            nextPending = new HexGroup();
            let res = pending.find(processHex);
            if (res) return res;
            pending = nextPending;
        }
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

    get length() { return 1; }

    exists() { return true; }
}

export default Hexagon;