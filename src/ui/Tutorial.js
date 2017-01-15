function Tutorial(spec) {
    
    let {players, economy} =spec;

    let data = {
        SELECT_YOUR_KINGDOM: {
            message: ()=>"Select your kingdom",
            target: (region) => economy.capitalOf(region),
        },
        BUY_SOMETHING: {
            message: () => "Buy a <b>villager</b> that will expand and defend your kingdom",
            target: (sprite) => sprite
        },
        BUY_VILLAGER: {
            message: "Click here to inspect your kingdom",
            get target() {
                return economy.capitalOf(players.bestRegionOf(players.localPlayer));
            }
        }
    };
}

export default Tutorial;