import Valuation from 'lib/hexgrid/HexValuation';

function hex(id) {
    return { id:id };
}

describe("Valuation.Manual", () => {


    it("returns default value", () => {
        let vals = new Valuation.Manual(5);
        expect(vals.get(hex(1))).toEqual(5);
    });

    it("orders pops values in descending order by default", () => {
        let vals = new Valuation.Manual(0);

        vals.set(hex(3), 3);
        vals.set(hex(4), 4);
        vals.set(hex(5), 5);
        vals.set(hex(2), 2);

        expect(vals.pop()).toEqual({hex: hex(5), val: 5});
        expect(vals.pop()).toEqual({hex: hex(4), val: 4});
        expect(vals.pop()).toEqual({hex: hex(3), val: 3});
        expect(vals.pop()).toEqual({hex: hex(2), val: 2});
        expect(vals.pop()).toEqual(null);

        expect(vals.get(hex(5))).toEqual(0);
    });

    it("supports custom heap function", () => {
        let vals = new Valuation.Manual(0, (a,b) => a-b);

        vals.set(hex(1), 1);
        vals.set(hex(2), 2);
        vals.set(hex(3), 3);

        expect(vals.pop()).toEqual({hex: hex(1), val: 1});
        expect(vals.pop()).toEqual({hex: hex(2), val: 2});
        expect(vals.pop()).toEqual({hex: hex(3), val: 3});
    });

    it ("supports udpating values", () => {
        let vals = new Valuation.Manual(0);

        vals.set(hex(1), 1);
        vals.set(hex(2), 2);
        vals.set(hex(3), 3);
        vals.set(hex(1), 10);

        expect(vals.get(hex(1))).toEqual(10);
        expect(vals.pop()).toEqual({hex: hex(1), val: 10});
        expect(vals.pop()).toEqual({hex: hex(3), val: 3});
    });
});

describe("Valuation.Composite", () => {
    it("correctly combines two valuations", ()=> {
        let A = new Valuation.Manual(0);
        let B = new Valuation.Manual(0);
        let vals = new Valuation.Composite(A,B);

        A.set(hex(1), 10);
        A.set(hex(2), 5);
        A.set(hex(3), 0);
        B.set(hex(1), 0);
        B.set(hex(3), 11);

        expect(vals.get(hex(1))).toEqual(10);
        expect(vals.get(hex(2))).toEqual(5);
        expect(vals.get(hex(3))).toEqual(11);

        expect(vals.pop()).toEqual({hex: hex(3), val: 11});
        expect(vals.pop()).toEqual({hex: hex(1), val: 10});
        expect(vals.pop()).toEqual({hex: hex(2), val: 5});
        expect(vals.pop()).toEqual({hex: hex(1), val: 0});
        expect(vals.pop()).toEqual({hex: hex(3), val: 0});
        expect(vals.pop()).toEqual(null);

    });
});
