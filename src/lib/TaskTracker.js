// Object that keeps a list of pending tasks
// new tasks can be added using addTask()
// after all desired tasks are added, register a callback via onResolved(), which will be
// called as soon as no pending tasks are remaining
class TaskTracker {
    constructor(name='anonymous') {
        this.name=name;
        this.waitingFor = [];
        this.resolvedCallback = null;
    }

    onResolved(func) {
        if (this.resolvedCallback) throw Error("Callback already defined");
        this.resolvedCallback = func;
        this.checkIfResolved();
    }

    checkIfResolved() {
        if (!this.resolvedCallback) return;
        if (!this.waitingFor.length) {
            this.resolvedCallback();
            this.resolvedCallback = null;
        }
    }

    addTask(description) {
        let promise = {
            description: description,
            done : () => { 
                this.waitingFor.splice(this.waitingFor.indexOf(promise),1);
                this.checkIfResolved();
            },
            toString: () => `[TaskRegistration ("${description}")]`
        };
        this.waitingFor.push(promise);
        return promise;
    }

    toString() {
        return `[TaskTracker ${this.name} (${(this.waitingFor.length?this.waitingFor.length+' waiting':'done')}))]`;
    }

    toDebugString() {
        if (!this.waitingFor.length) return `${this.name} is resolved`;
        return `${this.name} is waiting for ${this.waitingFor.map(promise => `[${promise.description}]`).join(", ")}`;
    }
}

export default TaskTracker;