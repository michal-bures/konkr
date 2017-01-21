function Help(spec) {
    let {pawns, players, regions} = spec;

    let self = Object.freeze({
        pawnInfo,
        pawnShopInfo,
    });

    const pawnData = {
        'TOWN': { 
            title: "Kingdom capital", 
            descOwn: `This kingdoms treasury is stored here. Don't let your enemies raze it!
Also protects surrounding tiles from being captured by enemy villagers.`,
            desc:`This kingdoms treasury is stored here. 
Would be real shame if something happened to it!
Also protects surrounding tiles from being captured by enemy villagers.`,
        },
        'TROOP_1': { title: "Villager",
            desc: "Great for capturing undefended territory and weeding out bandits.",
        },
        'TROOP_2': { title: "Pikeman",
            desc: "Stronger than towns and villagers, but can't deal with towers.",
         },
        'TROOP_3': { title: "Knight",
            desc: `Borderline unstopabble, only other knights or heroes can stand in his way.`,
         },
        'TROOP_4': { title: "Hero",
            desc: "Unstopabble tool of destruction, only other heroes can hope to challenge him.",
         },
        'TOWER': { title: "Tower",
            desc: "Protects surrounding hexes from enemy villagers and pikemen."
         },
        'BANDIT': { title: "Bandit",
            desc: `Independent unit that moves to an adjacent empty tile (ignoring Kingdom borders)
each turn and reduces income of whichever Kingdom it currently occupies.`
         },

    };


    function pawnShopInfo(pawn) {
        return pawnInfo(pawn);
    }

    function pawnInfo(pawn) {
        const type = pawn.name;
        const data = pawnData[type];
        let attrs=[];

        const title = (data?data.title:type);
        if (pawn.might) {
            attrs.push(`might: ${pawn.might}`);
        } else if (pawn.defense) {
            attrs.push(`defense: ${pawn.defense}`);
        }
        if (pawn.upkeep) {
            attrs.push(`upkeep: ${pawn.upkeep}`);
        }
        const attributes = attrs.join(' ');
        let text;
        if (data) {
            let own = false;
            if (pawn.hex) own = players.localPlayer.controls(regions.regionOf(pawn.hex));
            text=(own && data.descOwn?data.descOwn:data.desc);
        }

        return { title, text, attributes };
    }

    return self;
    
}

export default Help;