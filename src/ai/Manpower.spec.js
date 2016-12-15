import GameState from 'rules/GameState';
import Manpower  from 'ai/Manpower';
import Injector from 'lib/Injector';


describe("Manpower", () => {

    function pawn(type) {
        return { pawnType: type };
    }

    let spec = new GameState(new Injector(null,{log: ()=>console})).spec;
    let pawns = spec.pawns;

    it("recommends purchases if given empty list of units", () => {
        let mp = new Manpower(spec, []);
        expect(mp.totalMight()).toEqual(0);
        expect(mp.gatherMight(0)).toEqual({ use:[], buy: pawns.TROOP_1 });
        expect(mp.gatherMight(1)).toEqual({ use:[], buy: pawns.TROOP_1 });
        expect(mp.gatherMight(4)).toEqual({ use:[], buy: pawns.TROOP_4 });
        expect(mp.gatherMight(5)).toEqual(null);
    });

    it("picks the right unit for the job", () => {
        let mp = new Manpower(spec, [ pawn(pawns.TROOP_1), pawn(pawns.TROOP_1),
                                      pawn(pawns.TROOP_2),
                                      pawn(pawns.TROOP_3)]);
        expect(mp.totalMight()).toEqual(7);
        expect(mp.gatherMight(2)).toEqual({ use: [pawn(pawns.TROOP_2)] });
        expect(mp.totalMight()).toEqual(5);
    });

    it("knows how to merge units", () => {
        let mp = new Manpower(spec, [ pawn(pawns.TROOP_1), 
                                      pawn(pawns.TROOP_2),
                                      pawn(pawns.TROOP_3)]);
        expect(mp.gatherMight(4)).toEqual({ use: [pawn(pawns.TROOP_3), pawn(pawns.TROOP_1)] });
        expect(mp.totalMight()).toEqual(2);
    });

    it("combines merging and buying if necessary", () => {
        let mp = new Manpower(spec, [ pawn(pawns.TROOP_1), 
                                      pawn(pawns.TROOP_1) ]);
        expect(mp.gatherMight(3)).toEqual({ use: [pawn(pawns.TROOP_1), pawn(pawns.TROOP_1)], buy: pawns.TROOP_1 });
        expect(mp.totalMight()).toEqual(0);
    });

});