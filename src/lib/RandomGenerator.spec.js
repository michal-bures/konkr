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
});