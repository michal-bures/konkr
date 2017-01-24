function Help(spec) {
    let {pawns, players, regions} = spec;

    let self = Object.freeze({
        pawnInfo,
        pawnShopInfo,
        getPawnTitle,
        getOwnPawnDescription,
        getHostilePawnDescription,
        getIncomeBreakdownItem
    });

    const pawnData = {
        'TOWN': { 
            title: "Kingdom capital", 
            descOwn: `The treasury of this kingdom is stored here. Don't let your enemies raze it! The town protects surrounding tiles from takeover by enemy militia.`,
            desc:`This kingdoms treasury is stored here. Would be real shame if something happened to it! Also protects surrounding tiles from takeover by enemy militia.`,
        },
        'TROOP_1': { title: "Militia",
            desc: "Great for capturing undefended territory and dealing with bandits. Protects adjacent tiles from enemy militia.",
        },
        'TROOP_2': { title: "Pikeman",
            desc: "Stronger than towns and militia, but can't deal with towers.",
         },
        'TROOP_3': { title: "Knight",
            desc: `Borderline unstopabble, only other knights or heroes can stand in his way.`,
         },
        'TROOP_4': { title: "Hero",
            desc: `Unstopabble tool of destruction, only other heroes can hope to challenge him.`,
         },
        'TOWER': { title: "Tower",
            desc: "Protects surrounding tiles from hostile militia and pikemen."
         },
        'BANDIT': { title: "Bandit",
            desc: `Loyal to no one but himself, a bandit moves to a random adjacent tile every turn and plunders its income.`
         },

    };

    const incomeBreakdown = {
        taxes:"Taxes from land",
        TROOP_1:"Militia",
        TROOP_2:"Pikemen",
        TROOP_3:"Knights",
        TROOP_4:"Heroes",
        BANDIT:"Plundered by bandits",
    };

    function getIncomeBreakdownItem(key) {
        return incomeBreakdown[key] || key;
    }

    function getPawnTitle(pawn) {
        return pawnData[pawn.name] && pawnData[pawn.name].title;
    }

    function getOwnPawnDescription(pawn) {
        const data = pawnData[pawn.name];
        if (!data) return undefined;
        return data.descOwn || data.desc;
    }

    function getHostilePawnDescription(pawn) {
        const data = pawnData[pawn.name];
        return data && data.desc;
    }

    function pawnShopInfo(pawn) {
        return pawnInfo(pawn, 'price');
    }

    function pawnInfo(pawn, attributeList=['might', 'defense', 'upkeep']) {
        const type = pawn.name;
        const data = pawnData[type];
        let attrs=[];

        const title = (data?data.title:type);
        attributeList.forEach(attrName=>{
            if (pawn[attrName]!== undefined) {
                attrs.push({id:attrName,value:pawn[attrName]});
            }
        });
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