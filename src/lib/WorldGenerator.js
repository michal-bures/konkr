import noisejs from 'noisejs';

class LandTile {
    constructor(coords) {
        this.position = coords;
    }

    toString() {
        return `[LandTile at ${this.position}]`;
    }

    get id() {
        return this.position.index;
    }

}

function worldGenSolid({grid,log}) {
    grid.fillWith((p)=> new LandTile(p));
}

function worldGenPerlin({grid,log}) {
    var noise = new noisejs.Noise(Math.random());
    grid.fillWith((p)=> {
        return ((noise.simplex2(p.x/10,p.y/10) + 1) * avoidEdges(p.x/grid.width,p.y/grid.height) >=0.75?new LandTile(p): null);
    });
}

// x and y shoudl be between 0 and 1
// returns 1 for center (0.5;0.5) and approaches zero when going further from center (return 0 in corners such as 0;0, 1;0)
function avoidEdges(x,y) {
    return 1 - ((0.5-x)*(0.5-x)+(0.5-y)*(0.5-y))*2;
}

window.avoidEdges = avoidEdges;

export { worldGenPerlin, worldGenSolid };