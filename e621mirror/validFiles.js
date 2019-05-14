const fs = require("fs");
const crypto = require("crypto");
const network = require("./network.js");

const files = fs.readdirSync("yiff.party");

let count = 0;

async function main(){
    for (let i = 0; i < files.length; i++) {
        const md5 = createMd5FromPath("yiff.party/" + files[i]);
        const json = await network.getJSON("https://e621.net/post/show.json?md5=" + md5);
        const localJson = JSON.parse(fs.readFileSync("./json/" + json.id + ".json"));
        if (!localJson.md5) {
            console.log(localJson.delreason);
            count++;
        }
        else
            fs.unlinkSync("yiff.party/" + files[i]);
    }
    process.exit(0);
}

main();



function createMd5FromPath(path) {
    const data = fs.readFileSync(path);
    return crypto.createHash("md5").update(data).digest("hex");
}