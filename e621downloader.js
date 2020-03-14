const request = require('request');
const fs = require('fs');

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));
const saveTo = "/media/plex/plexmedia/e621/explicit";
const saveToAnimation = "/media/plex/plexmedia/e621/explicitanimation";
const saveToSafe = "/media/plex/plexmedia/e621/safe";

[saveTo, saveToAnimation, saveToSafe].forEach(element => {
    if (!fs.existsSync(element)) {
        fs.mkdirSync(element);
    }
});

const alreadyDownloaded = fs.readdirSync(saveTo).concat(fs.readdirSync(saveToAnimation), fs.readdirSync(saveToSafe)).map(element => {
    return element.split(".")[0];
});

async function main() {
    for (const id of getUserInput(process.argv[2])) {
        const json = await getPost(id);
        if (json.flags.deleted) {
            console.log("Post " + json.file.md5 + " (" + id + ") is deleted");
            continue;
        }
        if (alreadyDownloaded.includes(json.file.md5)) {
            console.log(json.filemd5 + " already downloaded");
            continue;
        }
        if (!json.is_favorited) {
            await favoritePost(json.id);
        }
        await upvotePost(json.id);
        await writeFile(json);
        console.log(json.file.md5 + " finished");
    }
}

main();

function getUserInput(input) {
    const regex = /posts\/([0-9]+)/g;
    let results = [];
    let m;
    do {
        m = regex.exec(input);
        if (m) {
            results.push(m[1]);
        }
    } while (m);
    return results;
}

async function writeFile(json) {
    const url = "https://static1.e621.net/data/" + json.file.md5.substring(0, 2) + "/" + json.file.md5.substring(2, 4) + "/" + json.file.md5 + "." + json.file.ext;
    const filename = json.file.md5 + "." + json.file.ext;
    const bin = await getBinary(url);

    let folder;

    if (json.rating === "s" || json.rating === "q") {
        folder = saveToSafe;
    }
    else if (json.file.ext === "gif" || json.file.ext === "swf" || json.file.ext === "webm") {
        folder = saveToAnimation;
    }
    else {
        folder = saveTo;
    }

    fs.writeFileSync(folder + "/" + filename, bin, "binary");
}


async function getBinary(url) {
    return await makeRequest(url, "binary");
}

async function getPost(id) {
    const url = "https://e621.net/posts/" + id + ".json";
    const json = await makeRequest(url, "utf8");
    return json.post;
}

async function favoritePost(id) {
    const baseURLFav = "https://e621.net/favorites.json";
    return await makeRequest(baseURLFav, "utf8", "POST", { post_id: id });
}

async function upvotePost(id) {
    const url = "https://e621.net/posts/" + id + "/votes.json";
    const json = await makeRequest(url, "utf8", "POST", { score: 1 });
    if (json.our_score === 0) {
        await makeRequest(url, "utf8", "POST", { score: 1 });
    }
}

async function makeRequest(url, formating, method = "GET", json = {}) {
    const username = secrets.e621username;
    const apiKey = secrets.e621apikey;
    return new Promise(function (resolve, reject) {
        request({
            method: method, url: url, headers: { "User-Agent": 'e621downloader/earlopain' }, encoding: formating, json: json, auth: {
                user: username,
                pass: apiKey
            }
        }, async (error, response, body) => {
            resolve(body);
        });
    });
}
