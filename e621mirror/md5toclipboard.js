const readline = require("readline");
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const clipboard = require("clipboardy");
const fs = require("fs");
const crypto = require("crypto");
const opn = require("opn");
const request = require("request");

async function main() {
    while (true) {
        const path = readline.question("Path: ").replace(/\\/g, "/").replace(/\"/g, "");
        if (!fs.existsSync(path)) {
            console.log(path + " doesn't exist");
            continue;
        }
        const data = fs.readFileSync(path);

        const hash = crypto.createHash("md5").update(data).digest("hex");
        clipboard.writeSync(hash);
        opn("https://e621.net/post/show.json?md5=" + hash);
        if (await readlineYN("Valid? ")) {
            const json = await getJSON("GET", "https://e621.net/post/show.json?md5=" + hash)
            console.log("Id is " + json.id);
            json.md5 = hash;
            json.file_ext = path.split(".")[path.split(".").length - 1].toLowerCase();
            fs.writeFileSync("./json/" + json.id + ".json", JSON.stringify(json, null, 4));
            fs.renameSync(path, "F:/Programmieren/quickjsstuff/e621mirror/takedown/" + json.md5 + "." + json.file_ext);
            console.log("Wrote modified json");
        }
        else {
            fs.unlinkSync(path);
            console.log("Skipping");
        }
    }
}

main();

function readlineYN(promt) {
    rl.resume();
    return new Promise(resolve => {
        rl.question(promt, function (answer) {
            rl.pause();
            answer = answer.toLowerCase();
            if (answer === 'y' || answer === "yes")
                resolve(true)
            else
                resolve(false)
        });
    })
}

function getJSON(url) {
    return new Promise(resolve => {
        request.get({ uri: url, headers: { "User-Agent": "md5" } }, (error, response, body) => {
            resolve(JSON.parse(body));
        });
    });
}