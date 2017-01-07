import * as Immutable from "immutable";
import HexGroup from 'lib/hexgrid/HexGroup';

function SimplifiedRegionsModel(state = Immutable.fromJS({
        factionOf: {}, // int->int
        regionOf: {},  // int->int
        regions: {}, // int->(HexGroup)
        newRegionId: 1,
    })) {

    this.state = state;
}
SimplifiedRegionsModel.prototype.setOwner = function(hex, faction) {
    let state = this.state;
    let prevRegion = state.getIn(['regionOf',hex.id]);

    if (prevRegion) {
        state = state.updateIn(['regions',prevRegion], hexes=> {
            let h = hexes.clone();
            h.remove(hex);
            return h;
        });
    }
    let mergeRegions = []; // regions that will be merged with the owner-switching hex
    hex.neighbours().forEach(hex2 => {
        const f2 = state.getIn(['factionOf',hex2.id],-1);
        if (f2 == faction) {
            const r2 = state.getIn(['regionOf', hex2.id]);
            if (r2 && mergeRegions.indexOf(r2) === -1) mergeRegions.push(r2);
        }
    });
    state = state.setIn(['factionOf',hex.id], faction);

    if (mergeRegions.length) {
        //merges into existing region(s)
        let mainRegion = mergeRegions.shift();
        let convertedHexes = new HexGroup(hex);
        mergeRegions.forEach( regionId => {
            let regionHexes = state.getIn(['regions',regionId]);
            convertedHexes.add(regionHexes.clone());
            state = state.deleteIn(['regions', regionId]);            
        });
        state = state.updateIn(['regions',mainRegion], hexes => {
            let res = hexes.clone();
            res.add(convertedHexes);
            return res;
        });

        convertedHexes.forEach(hex=>{
            state=state.setIn(['regionOf', hex.id], mainRegion);
        });
    } else {
        let regionId = state.get('newRegionId');
        state = state.setIn(['regions', regionId], new HexGroup(hex))
                     .setIn(['regionOf', hex.id], regionId)
                     .update('newRegionId', x=>x+1);
    }
    return new SimplifiedRegionsModel(state);
};
SimplifiedRegionsModel.prototype.regionOf = function(hex) {
    let regionId = this.state.getIn(['regionOf',hex.id]);
    return this.state.getIn(['regions', regionId]);
};
SimplifiedRegionsModel.prototype.regions = function(hex) {
    return this.state.get('regions').toArray();
};
SimplifiedRegionsModel.prototype.hexFactions = function() {
    return this.state.get('factionOf').toObject();
};

function RegionRandomizer({grid, random, log}) {

    const strategies = {
        balancedStart,
    };

    return Object.freeze({
        run
    });

    function run(strategy, options) {
        if (!strategies[strategy]) throw new Error("Undefined region randomization strategy: "+strategy);
        return strategies[strategy](options);
    }

    function balancedStart({
        numFactions=6,
        maxRegionSize=4,
        minBestRegionSize=6,
    }) {
        let hexGroup = grid.allHexes();
        let assigningFaction = 1;
        let world = new SimplifiedRegionsModel();
        let numFailures = 0;

        let bestRegion=new Array(numFactions);

        // randomly split all land between factions while respecting maxRegionSize
        let nextHex = random.hex(hexGroup);
        while (hexGroup.length) {
            let candidateWorld = world.setOwner(nextHex, assigningFaction);
            let newRegionSize = candidateWorld.regionOf(nextHex).length;
            if (newRegionSize > maxRegionSize && numFailures < numFactions) {
                ++numFailures;
            } else {
                world = candidateWorld;
                if (!bestRegion[assigningFaction] || bestRegion[assigningFaction].length < newRegionSize ) {
                    bestRegion[assigningFaction] = world.regionOf(nextHex);
                }
                hexGroup.remove(nextHex);
                nextHex = random.hex(hexGroup);
                numFailures = 0;
            }
            assigningFaction++;
            if (assigningFaction>numFactions) assigningFaction = 1;
        }

        // Ensure each faction has a region with size of at least <minBestRegionSize>
        // first protect all hexes in each factions currently largest region from being converted 
        // to another faction
        let forbiddenHexes = new HexGroup();
        for (let faction = 1; faction <= numFactions; ++faction) {
            forbiddenHexes.add(bestRegion[faction]);
        }
        function canExpandIntoThisHex(hex) {
            return !forbiddenHexes.contains(hex);
        }

        for (let faction = 1; faction <= numFactions; ++faction) {
            while (bestRegion[faction].length < minBestRegionSize) {
                //expand
                let candidates = bestRegion[faction].neighbours().filter(canExpandIntoThisHex);
                if (!candidates.length) break;
                let chosenHex = random.hex(candidates);
                world = world.setOwner(chosenHex,faction);
                bestRegion[faction] = world.regionOf(chosenHex);
                log.debug("Expanded region for faction ", faction," now ",bestRegion[faction].length,"tiles");
            }
        }

        return world.hexFactions();
    }
}

export default RegionRandomizer;


