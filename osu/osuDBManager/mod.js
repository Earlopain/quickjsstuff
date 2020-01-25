const mods = ["NF", "EZ", "NV", "HD", "HR", "SD", "DT", "RL", "HT", "NC", "FL",
    "AP", "SO", "AP", "PF", "K4", "K5", "K6", "K7", "K8", "FI", "RD", "CINEMA",
    "TP", "K9", "COOP", "K1", "K2", "K3"];

function toString(value) {
    if (value === 0)
        return "NOMOD";
    const bin = value.toString(2).split("").reverse().join("");
    let result = "";
    for (let i = 0; i < bin.length; i++) {
        bin.charAt(i) === "1" ? result += mods[i] + " " : "";
    }
    return result;
}

exports.toString = toString;
