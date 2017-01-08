import { isFunction } from 'lib/util';

function Planner() {
    
    let root = { depth:0, children: [], impl:()=>Promise.resolve() };

    // for each resource used points to the latest action in the graph that processed it
    let resourcePtr=new WeakMap(); 
    let maxDepth = 0;

    return Object.freeze({
        addTask,
        execute,
        getExecutionPlan
    });

    function addTask(usedResources, impl) {
        let task = new Task(impl);
        usedResources.forEach(resource=>{
            let parent = (resourcePtr.get(resource) || root);
            if (parent.children.indexOf(task)===-1) parent.children.push(task);
            if (task.depth <= parent.depth) task.depth = parent.depth + 1;
            if (task.depth > maxDepth) maxDepth = task.depth;
            resourcePtr.set(resource,task);
        });
        return task;
    }

    // execute from root and run each task as soon as possible
    
    function execute() {
        return new Promise(resolve=> {
            let plan = getExecutionPlan();

            console.debug(plan.map((line,i)=>`${i}->${line}`).join('\n'));
            executeRemaining().then(resolve);

            function executeRemaining() {
                if (!plan.length) return Promise.resolve();
                return Promise.all(plan.shift().map(task=>{
                    return task.impl();
                })).then(executeRemaining);
            }
        });
    }

    // execute from root and run each task as late as possible (without negatively affecting overal execution time)
    function getExecutionPlan() {
        let executionPlan=[];
        for (let i = 0; i < maxDepth; ++i) {
            executionPlan[i] = [];
        }
        function getTick(node) {
            let tick;
            if (!node.children.length) {
                tick = maxDepth-1;
            } else {
                tick = Math.min.apply(null,node.children.map(getTick))-1;
            }
            if (tick<0) return; // arrived to root node
            if (executionPlan[tick].indexOf(node)===-1) executionPlan[tick].push(node);
            return tick;
        }
        getTick(root);
        return executionPlan;
    }

    function Task(impl) {
        if (!isFunction(impl)) throw Error(`Invalid task: ${impl} is not a function`);
        let self= Object.seal({
            impl,
            waitingFor: [],
            children: [],
            depth:0,
        });
        return self;
    }
}

export default Planner;