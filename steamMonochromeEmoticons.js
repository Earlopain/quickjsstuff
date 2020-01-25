const request = require("request");
const fs = require("fs");
const PNG = require("pngjs").PNG;

const emoteSize = 54;

const maxDiff = 100;

let alreadyDownloaded;
let ignoreList;
try {
    alreadyDownloaded = JSON.parse(fs.readFileSync(__dirname + "/steamemotes/alreadydownloaded.json"));
} catch (e) {
    alreadyDownloaded = [];
}
try {
    ignoreList = JSON.parse(fs.readFileSync(__dirname + "/steamemotes/ignorelist.json"));
} catch (e) {
    ignoreList = [];
}

async function main() {
    const emotes = await getEmotes();
    await refreshLocalEmotes(emotes);
    for (let i = 0; i < emotes.length; i++) {
        const emote = emotes[i];
        if (ignoreList.includes(emote.name))
            continue;
        let image = await pngTo2DArray(__dirname + "/steamemotes/" + emote.name + ".png");
        if (isMonochrome(image)) {
            console.log("https://steamcommunity.com/market/listings/" + emote.url);
        }
    }
}
main();

async function buildIgnoreList(emotes) {
    for (let i = 0; i < emotes.length; i++) {
        const emote = emotes[i];
        if (!fs.existsSync(__dirname + "/steamemotes/" + emote.name + ".png")) {
            if (!ignoreList.includes(emote.name))
                ignoreList.push(emote.name);
        }
        else if (await isDMCATakedown(emote.name)) {
            if (!ignoreList.includes(emote.name))
                ignoreList.push(emote.name);
        }
    }

    fs.writeFileSync(__dirname + "/steamemotes/ignorelist.json", JSON.stringify(ignoreList));
}

async function refreshLocalEmotes(onlineEmotes) {
    for (let i = 0; i < onlineEmotes.length; i++) {
        const emote = onlineEmotes[i];
        if (!alreadyDownloaded.includes(emote.name) && !fs.existsSync(__dirname + "/steamemotes/" + emote.name + ".png")) {
            await getEmoteFromSteam(emote.name)
            alreadyDownloaded.push(emote.name);
            if (i % 50 === 0)
                fs.writeFileSync(__dirname + "/steamemotes/alreadydownloaded.json", JSON.stringify(alreadyDownloaded));
        }
        else
            alreadyDownloaded.push(emote.name)
    }
    fs.writeFileSync(__dirname + "/steamemotes/ignorelist.json", JSON.stringify(ignoreList));
    fs.writeFileSync(__dirname + "/steamemotes/alreadydownloaded.json", JSON.stringify(alreadyDownloaded));
}

async function getEmoteFromSteam(emoteName) {
    const url = "https://steamcommunity-a.akamaihd.net/economy/emoticonhover/" + emoteName.slice(1, -1) + "/json.js";
    const body = await getFile(url);
    if (body === "") {
        ignoreList.push(emoteName);
        return;
    }
    let base64;
    const regex = /data[\s\S]*?"/m;
    while ((m = regex.exec(body)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        m.forEach((match, groupIndex) => {
            base64 = match.slice(0, -1);
        });
        break;
    }
    if (base64 === undefined) {
        ignoreList.push(emoteName);
        return;
    }
    fs.writeFileSync(__dirname + "/steamemotes/" + emoteName + ".png", Buffer.from(base64.split(",")[1], "base64"), "binary")
}

function isMonochrome(emote) {
    if (emote.length === 0)
        return false;
    const firstColor = emote[0][0];
    for (let y = 0; y < emoteSize; y++) {
        for (let x = 0; x < emoteSize; x++) {
            const currentColor = emote[x][y];
            if (currentColor.a !== 255)
                return false;
            const diff = currentColor.diff(firstColor);
            if (diff > maxDiff)
                return false;
        }
    }
    return true;
}

async function isDMCATakedown(name) {
    if (name.includes("RareDeplorable"))
        debugger;
    let emote = await pngTo2DArray(__dirname + "/steamemotes/" + name + ".png");
    for (let y = 0; y < emote.length; y++) {
        for (let x = 0; x < emote.length; x++) {
            const pixel = emote[x][y];
            if (pixel.a !== 0)
                return false;
        }
    }
    return true;
}

function pngTo2DArray(path) {
    return new Promise(resolve => {
        let d1array = [];
        fs.createReadStream(path)
            .pipe(new PNG())
            .on('parsed', function () {
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const i = (this.width * y + x) << 2;
                        d1array.push(new Pixel(this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]));
                    }
                }
                let result = [];
                while (d1array.length) result.push(d1array.splice(0, emoteSize));
                resolve(result);
            }).on("error", () => {
                resolve([]);
            })

    });
}

function getFile(url) {
    return new Promise(resolve => {
        request.get({
            url: url
        }, (error, response, body) => {
            resolve(body);
        });
    });
}

function getEmotes() {
    return new Promise(resolve => {
        request.get({
            url: "https://cdn.steam.tools/data/emote.json", headers: {
                "Referer": "https://steam.tools/emoticons/",
            }
        }, (error, response, body) => {
            resolve(JSON.parse(body));
        });
    });
}

class Pixel {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    diff(pix) {
        return Math.abs(this.r - pix.r) + Math.abs(this.g - pix.g) + Math.abs(this.b - pix.b);
    }
}

class Emote {
    constructor(json, image) {
        this.json = json;
        this.image = image;
    }
}
