const fs = require("fs");

/**
 * resolves a promise after n milliseconds
 * @param {Number} ms 
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function alreadyFinished(id) {
    if (fs.existsSync("./json/" + id + ".json")) {
        const json = JSON.parse(await fs.readFile("./json/" + id + ".json"));
        //post is deleted, no picture to download
        if (json.md5 === undefined)
            return true;
        //picure already downloaded
        if (fs.existsSync("./files/" + json.md5.substr(0,2) + "/" + json.md5.substr(2,2) + "/" + json.md5 + "." + json.file_ext)) {
            return true;
        }
        return false;
    }
    else if(fs.existsSync("./processed/" + id + ".json")) {
        const json = JSON.parse(await fs.readFile("./processed/" + id + ".json"));
        //post is deleted, no picture to download
        if (json.md5 === undefined)
            return true;
        //picure already downloaded
        if (fs.existsSync("./files/" + json.md5.substr(0,2) + "/" + json.md5.substr(2,2) + "/" + json.md5 + "." + json.file_ext)) {
            return true;
        }
        return false;
    }
    return false;
}

/**
 * Get the id to continue mirroring from
 * @returns Highest id downloaded - 1. -1, becausae json could have finished downllading, but not the image
 */
async function lastDownloaded() {
    const files = fs.readdirSync("./json");
    let highest = 1;
    for (let i = 0; i < files.length; i++) {
        if (parseInt(files[i].split(".")[0]) > highest) {
            highest = parseInt(files[i].split(".")[0]);
        }
    }
    return highest - 1;
}

exports.sleep = sleep;
exports.alreadyFinished = alreadyFinished;
exports.lastDownloaded = lastDownloaded;