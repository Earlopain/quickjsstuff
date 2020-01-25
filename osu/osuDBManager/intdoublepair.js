const mod = require("./mod.js");

class IntDoublePair {
    constructor(int, double) {
        this.int = int;
        this.double = double;
    }
    toString() {
        return "\nMod: " + mod.toString(this.int) + " SR: " + this.double;
    }
}

exports.IntDoublePair = IntDoublePair;
