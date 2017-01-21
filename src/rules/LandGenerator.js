import noisejs from 'noisejs';


function LandGenerator({actions, grid, log, random}) {
    actions.setHandler('GENERATE_LANDMASS', action=> {
        worldGenSolid();
        action.resolve();
    });

    return Object.freeze({});

    function worldGenSolid() {
        grid.fillWith((p)=> true);
    }

    function worldGenPerlin() {
        const MIN_SIZE = grid.width * grid.height * 0.4;
        const SMOOTHNESS = 10;
        const WATER_LEVEL = 0.5;

        let noise, comps, largest, tries, seed;
        const generatorFunc = (p=>{
            return (noise.simplex2(p.x/SMOOTHNESS,p.y/SMOOTHNESS) + 1) * avoidEdges(p.x/grid.width,p.y/grid.height) >= WATER_LEVEL;
        });


        do {
            seed = random.integer(0,65535);
            noise = new noisejs.Noise(seed);
            grid.fillWith(generatorFunc);
            comps = grid.components();
            largest = comps.getLargestGroup();
            ++tries;
            if (tries > 50) throw Error('Failed to generate suitable world after 50 iterations');
        } while (!largest || largest.length < MIN_SIZE);

        comps.forEach((hexGroup)=>{
            if (hexGroup!=largest) {
                grid.destroyHexes(hexGroup);
            }
        });

        log.info("Map generated (map seed="+seed+")");

    }
}


// x and y shoudl be between 0 and 1
// returns 1 for center (0.5;0.5) and approaches zero when going further from center (return 0 in corners such as 0;0, 1;0)
function avoidEdges(x,y) {
    return 1 - ((0.5-x)*(0.5-x)+(0.5-y)*(0.5-y))*2;
}

export default LandGenerator;