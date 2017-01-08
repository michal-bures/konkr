import RandomGenerator from './RandomGenerator';

describe("RandomGenerator", () => {

    it("returns deterministic sequence when given fixed seed", () => {
        let rnd = new RandomGenerator();

        rnd.reset(10);
        let res1 = new Array(10).map(()=>rnd.integer());
        rnd.reset(10);
        let res2 = new Array(10).map(()=>rnd.integer());
        expect(res1).toEqual(res2);
    });

    it("generates random integers with equal chance", ()=> {

        let rnd = new RandomGenerator();
        let brackets = new Array(3);
        brackets.fill(0);
        for (let i=0; i<1000; ++i) {
            ++brackets[rnd.integer(0,2)];
        }
        expect(brackets.length).toEqual(3);
        brackets.forEach(result=> expect(result).toBeGreaterThan(300));
    });
});