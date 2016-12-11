function getAttackOpportunities({warfare}, action, region, maxDefense, valuation) {
    valuation.reset();
    let availableHexes = region.hexes.neighbours().filter(hex => warfare.defenseOf(hex) <= maxDefense);
    availableHexes.forEach( hex=> {
        valuation.set(hex,1);
    });
}

export default getAttackOpportunities;