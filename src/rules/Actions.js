

function Actions(spec) {
    let { regions, economy } = spec;
    let undoStack = [];

    const self = {
        execute,
        create,
        undoLastAction
    };

    function execute(id, ...args) {
        const action = create(id, ...args);
        if (action.execute() && action.canUndo()) {
            undoStack.push(action);
        }
    }


    function create(id, ...args) {
        if (!ACTIONS[id]) throw Error(`Unkown action ${id}`);
        return new ACTIONS[id](...args);
    }

    function undoLastAction() {
        if (!undoStack.length) return false;
        return undoStack.pop().undo(); 
    }

    class Action {
        execute() {
            throw Error("Not implemented");
        }

        canUndo() {
            return false;
        }

        undo() {
            throw Error("Cannot undo this action");
        }
    }

    class NextTurn extends Action {
        execute() {
            regions.forEach(region => {
                region.treasury += economy.netIncomeOf(region);
                //TODO: kill all units if region is bankrupt
            });
        }
    }

    const ACTIONS = {
        NEXT_TURN: NextTurn,

    };    

    return self;
}

export default Actions;