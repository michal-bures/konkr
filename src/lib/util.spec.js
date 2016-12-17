import { extend } from 'lib/util';

describe("extend", () => {

    it("bloody works", () => {
        let baseObject = {
            prop1: 'baseProp1',
            prop2: 'baseProp2',
            method1() { return 'baseMethod1'; },
            method2() { return 'baseMethod2'; }
        };
        let child = Object.create(baseObject);
        extend(child, {
            prop2: 'childProp2',
            method2() { return 'childMethod2'; },
            prop3: 'childProp3',
            method3() { return 'childMethod3'; }
        });

        expect(child.prop1).toEqual('baseProp1');
        expect(child.prop2).toEqual('childProp2');
        expect(child.prop3).toEqual('childProp3');
        expect(child.method1()).toEqual('baseMethod1');
        expect(child.method2()).toEqual('childMethod2');
        expect(child.method3()).toEqual('childMethod3');
    });
});