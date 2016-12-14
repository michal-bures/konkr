import HexValuation from 'lib/hexgrid/HexValuation';

function Warfare(spec) {
    let {regions, pawns, debug} = spec;

    const defense = new HexValuation.Adhoc(hex=> {
        return [hex].concat(hex.neighbours())
            .filter(hex2 => regions.regionOf(hex) === regions.regionOf(hex2))
            .reduce((currentMaximum, hex) => Math.max(currentMaximum, baseDefenseOf(hex)),0);
    });

    debug.valuation('defense', defense);

    return Object.freeze({
        defenseOf,
    });

    function defenseOf(hex) {
        return defense.get(hex);
    }

    // base defense value of a hex not taking into account neighbouring hexes
    function baseDefenseOf(hex) {
        const pawn = pawns.pawnAt(hex);
        if (!pawn) return 0;
        return pawn.pawnType.defense || 0;
    }
}

export default Warfare;