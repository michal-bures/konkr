//converts string like "Exponential.InOut" to the matching function from Phaser.Easing 
function easing(str) {
    var s = str.split(".");
    expect(s.length).toBe(2, "Invalid easing function ID: "+str);
    return Phaser.Easing[s[0]][s[1]];
}

//extend(base,child) ... recursively adds properties from child object to base object
function extend(base, child, stack) {
    expect(base).toBeA('object', 'invalid base object');
    expect(child).toBeA('object', 'invalid extender');
    stack = stack || "";
    for (var key in child) {
        if (child.hasOwnProperty(key)) {
            if (typeof base[key] === 'object') {
                if (typeof child[key]!== 'object') {
                    log.error('invalid extension of ' + stack + "."+key+": cannot replace object by non-object");
                    return false;
                }
                extend(base[key], child[key], stack+"."+key);
            } else {
                base[key] = child[key];
            }
        }
    }
}

function onFirefox() {
    return (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1 );
}


class OrderedHashMap {
    constructor() {
        this._keys = [];
        this._vals = {};
    }

    push(k,v) {
        if (this._vals[k] === undefined) this._keys.push(k);
        this._vals[k] = v;
    }

    insert(pos,k,v) {
        if (this._vals[k] === undefined) {
            this._keys.splice(pos,0,k);
            this._vals[k] = v;
        }
    }

    forEach(fn) {
        this.keys.forEach((k) => fn(k,this._vals[k]));
    }

    get(k) { 
        return this._vals[k]; 
    }

    get length() {
        return this._keys.length;
    }

    get keys() {
        return this._keys;
    }

    get values() {
        return this._keys.map(k => this._vals[k]);
    }
};

window.OrderedHashMap = OrderedHashMap;

//==================
// CHEATS
var Cheat = {
    search : function(sequence) {
        return Dictionary.get()._impl.search(sequence,20);
    },
    lifes : function(amount) {
        inspect.director.addLifes(amount);
    }
};

//==================
// CACHE

var Cache = function(func, context, limit) {
    expect(func).toBeA('function');
    this.func = func;
    this.context = context;
    this.data = {};
    this.dataQueue = [];
    this.limit = limit;
};

Cache.prototype.get = function (key, callback) {
    if (this.data[key]) {
        log.debug("CACHE HIT", key);
        return callback.apply(this,this.data[key]);
    }
    var self = this;
    log.debug("CACHE MISS", key);
    this.func(key,processResult);
    function processResult() {
        self.data[key] = arguments;
        self.dataQueue.push(key);
        while (self.dataQueue.length > self.limit) {
            self.invalidate(self.dataQueue.shift());
        }
        callback.apply(self,arguments);
    }
};

Cache.prototype.invalidate = function(key) {
    delete(this.data[key]);
};

Cache.test = function() {
    function f(x,callback) {
        callback(x, x*x, x+x);
    }

    var func = new Cache(f,this,3);
    func.get(1, log.debug);
    func.get(2, log.debug);
    func.get(3, log.debug);
    func.get(1, log.debug);
    func.get(3, log.debug);
    func.get(4, log.debug);
    func.get(1, log.debug);
    func.get(1, log.debug);
    func.get(2, log.debug);
};


//==================
// RANDOMIZERS

var Random = {
    oneOf: function(array) {
        return array[Random.integer(0,array.length)];
    },
    property: function(obj) {
        var result;
        var count = 0;
        for (var prop in obj)
            if (Math.random() < 1/++count)
               result = prop;
        return result;
    },
    //
    integer: function(from, to) {
        return Math.floor(Math.random()*(to-from+1))+from;
    },
    substring: function(str, length) {
        length = length || Random.integer(1,str.length);
        var start = Random.integer(0,str.length-length);
        return str.substring(start, start+length);
    }
};
Random.Selector = function Selector() {
    this.list = [];
    this.total = 0;
};

Random.Selector.prototype.add = function (item, weight) {
    this.list.push({item:item, weight:weight});
    this.total += weight;
};
Random.Selector.prototype.pickOne = function () {
    if (!this.list.length) {
        log.warn("Attempted to pick an item from an empty Random.Selector.");
        return null;
    }
    var result = Math.random()*this.total;
    var sum = 0;
    var i = 0;
    while (sum < result) {
        sum += this.list[i++].weight;
    }
    return this.list[Math.max(0, i-1)].item;
};

Random.Selector.test = function() {
    var s = new Random.Selector();
    s.add("A",1);
    s.add("B",2);
    s.add("C",3);

    var results = {
        A:0, B:0, C:0
    };
    for (var n = 1; n<100000; ++n) {
        ++results[s.pickOne()];
    }
    log.debug("Results: ", s, results);
};
/*
var a = { a: { a1: 1, a2: 2}, b:'b' }
var b = { a: { a1: 3 } }

extend(a,b);
console.debug("TEST1:",a);
*/


export { OrderedHashMap, Random };