class LandTile {
    constructor(gridPoint) {
        this.position = gridPoint;
    }

    toString() {
        return `[Tile at ${this.position}]`;
    }

    get id() {
        return this.position.index;
    }
}

export default LandTile;