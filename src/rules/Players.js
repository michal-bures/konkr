import IterableOn from 'lib/decorators/IterableOn';
import HexGroup from 'lib/hexgrid/HexGroup';

function Players(spec) {

    let { actions, economy, grid, pawns, regions, ids, log } = spec;

    class Player {
        constructor(id, name) {
            this.id = id;
            this.name = name;
        }

        get regions() {
            return getRegionsControlledBy(this);
        }

        controls(region) {
            return ownerOf(region) === this;
        }

        canMoveUnit(pawn) {
            return this.controls(regions.regionOf(pawn.hex)) && !movedUnits[pawn.hex.id];
        }

        getAvailableUnits(region) {
            let ret = pawns.select({ 
                hexes: region.hexes, 
                custom: pawn=> pawn.isTroop() && this.canMoveUnit(pawn)
            });
            log.debug("available units: ", ret);
            return ret;
        }

        play() { throw Error(`Not implemented`); }

        toString() {
            return `[Player ${this.name}]`;
        }
    }

    class GlobalAIPlayer extends Player {
        constructor(id) {
            super(id,"Global AI");
        }

        toJSON() {
            return "GlobalAIPlayer";
        }

        play() {
            actions.schedule("AI_PLAYER_BEGIN", this);
        }
    }

    let _players = [];
    
    let activePlayer = null,
        grabbedPawn = null,
        grabbedPawnRegion = null,
        movedUnits = {};

    let p = new GlobalAIPlayer(ids.next('player'));
    _players[p.id] = p;        

    // public API
    let self = {
        byId(id) { return _players[id]; },
        toJSON,
        fromJSON
    };
    IterableOn(self, _players);
    Object.freeze(self);

    function toJSON() {
        return {
            players: _players.map(player=>player && player.id).filter(x=>x),
            activePlayer: activePlayer && _players.indexOf(activePlayer),
            grabbedPawn: grabbedPawn && grabbedPawn.name,
            grabbedPawnRegion: grabbedPawnRegion && grabbedPawnRegion.id,
            movedUnits: movedUnits
        };
    }

    function fromJSON(src) {
        _players = [];
        src.players.forEach(id=> _players[id]=new GlobalAIPlayer(id));
        activePlayer = src.activePlayer && self.byId(src.activePlayer);
        grabbedPawn = src.grabbedPawn && pawns[src.grabbedPawn];
        grabbedPawnRegion = src.grabbedPawnRegion && regions.byId(grabbedPawnRegion);
        movedUnits = src.movedUnits;
    }

    actions.setHandler('START_PLAYER_TURN', (action, player) => {
        if (activePlayer) throw Error(`Cannot start turn for ${player}, because another players turn is in progress: ${activePlayer}`);
        activePlayer = player;
        action.data.previousMovedUnits=movedUnits;
        movedUnits = {};
        player.play();
        action.schedule('END_PLAYER_TURN', player);
        action.resolve();
    },{
        undo(action) {
            movedUnits = action.data.previousMovedUnits;
            activePlayer = null;
        }
    });

    actions.setHandler('CONQUER_HEX', (action, hex, region) => {
        if (!grabbedPawn) return action.reject(`Attempted to conquer ${hex} with no pawn grabbed!`);
        if (!region) return action.reject(`Conquering region not specified`);
        movedUnits[hex.id] = true;

        if (pawns.pawnAt(hex)) {
            action.schedule('DESTROY_PAWN', pawns.pawnAt(hex));
        }
        action.schedule('CHANGE_HEXES_REGION', new HexGroup(hex), region);
        action.schedule('DROP_UNIT', hex);
        action.resolve();
    }, { undo(action, hex, region) {
        delete movedUnits[hex.id];
    }});

    actions.setHandler('GRAB_UNIT', (action, pawn) => {
        if (movedUnits[pawn.hex.id]) throw Error(`Tried to grab ${pawn}, which has already moved this turn.`);
        if (!pawn.pawnType.isTroop()) throw Error(`${pawn} is not movable by player!`);
        const region = regions.regionOf(pawn.hex);
        if (!activePlayer.controls(region)) throw Error(`Tried to grab ${pawn}, which does not belong to ${activePlayer}`);

        action.data.previousGrabbed = grabbedPawn;
        addUnitToGrabbed(pawn.pawnType);
        grabbedPawnRegion = region;
        action.schedule('DESTROY_PAWN',pawn);
        action.resolve();
    },{ 
        undo(action) {
            grabbedPawn = action.data.previousGrabbed;
        }
    });

    actions.setHandler('DROP_UNIT', (action, hex) => {
        if (regions.regionOf(hex) != grabbedPawnRegion) throw Error(`Tried to drop pawn into a different region then it originates from.`);
        if (pawns.pawnAt(hex)) throw Error(`Cannot drop pawn on ${hex} - already occupied by ${pawns.pawnAt(hex)} `);
        action.schedule('CREATE_PAWN',grabbedPawn, hex);
        action.data.grabbedPawn = grabbedPawn;
        action.data.grabbedPawnRegion = grabbedPawnRegion;
        grabbedPawn = null;
        grabbedPawnRegion = null;
        action.resolve();
    }, { undo(action) {
        grabbedPawn = action.data.grabbedPawn;
        grabbedPawnRegion = action.data.grabbedPawnRegion;
    }});

    actions.setHandler('BUY_UNIT', (action, unitType, region)=> {
        const cost = economy.priceOf(unitType);
        if (!cost) throw Error(`Unit ${unitType} cannot be bought by a player.`);
        if (!region) throw Error(`No region specified, who is supposed to pay for this?!`);
        if (cost > economy.treasuryOf(region)) throw Error(`Region ${region} cannot afford to buy ${unitType}.`);
        if (grabbedPawn) throw Error(`Cannot buy unit, because player is already holding one`);
        //TODO: Auto unit merging?
        action.schedule('CHANGE_REGION_TREASURY',region, -cost);
        addUnitToGrabbed(unitType);
        grabbedPawnRegion = region;
        action.resolve();
    },{
        undo() {
            grabbedPawn=null;
            grabbedPawnRegion=null;
        }
    });

    actions.setHandler('END_PLAYER_TURN', (action, player) => {
        if (player!=activePlayer)  throw Error(`${player} requested to end hist turn but it's not his turn currently!`);
        if (grabbedPawn) throw Error(`${player} tried to end turn with an unplaced pawn still grabbed.`);
        activePlayer = null;
        action.resolve();
    },{ undo(action, player) {
        activePlayer = player;
    } });

    // when the current region was merged into another one, make sure to update
    // grabbedPawnRegion with the new region identity
    regions.onMerged.add((srcRegion, rcvRegion)=>{
        if (grabbedPawnRegion === srcRegion) grabbedPawnRegion = rcvRegion;
    });

    function addUnitToGrabbed(pawnType) {
        if (grabbedPawn) {
            let result = pawns.getMergeResult(grabbedPawn, pawnType);
            if (!result) throw Error(`Illegal attempt to merge ${grabbedPawn} with ${pawnType}`);
            grabbedPawn = result;
        } else {
            grabbedPawn = pawnType;
        }
    }

    function getRegionsControlledBy(player) {
        //TODO less bullshit, more actual implementation
        let list = [];
        regions.forEach(r=>{if(r.hasCapital()) list.push(r); });
        return list;
    }

    function ownerOf(region) {
        //TODO less bullshit, more actual implementation
        return _players.filter(p=>p)[0];
    }

    return Object.freeze(self);
}

export default Players;