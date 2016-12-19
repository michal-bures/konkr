import Planner from 'lib/Planner';

describe("Planner", () => {

    let taskLog = [];

    // mock resource objects
    const A = {A:1}, B = {B:1}, C = {C:1};

    beforeEach(()=>{
        taskLog = [];
    });

    function task(id) {
        return ()=>{ 
            return new Promise (resolve=>{
                console.log("Running "+id);
                taskLog.push(id);
                resolve();
            });
        };
    }

    it("executes tasks in correct order", (done) => {
        let planner = new Planner();

        planner.addTask([A],task('A1'));
        planner.addTask([A],task('A2'));
        planner.addTask([B],task('B1'));
        planner.addTask([B],task('B2'));
        planner.addTask([B],task('B3'));
        planner.addTask([B],task('B4'));
        planner.addTask([A,B],task('AB'));

        planner.execute().then(()=>{
            expect(taskLog).toEqual(['B1','B2','A1','B3','A2','B4','AB']);
            done();
        });
    });
});