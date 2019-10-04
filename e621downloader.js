const request = require('request');
const fs = require('fs');

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const jsonURL = "https://e621.net/post/show.json?";
const saveTo = "/media/plex/plexmedia/Pictures/e621";
const saveToAnimation = "/media/plex/plexmedia/Pictures/e621animation";
const saveToSafe = "/media/plex/plexmedia/Pictures/e621safe";

[saveTo, saveToAnimation, saveToSafe].forEach(element => {
    if (!fs.existsSync(element)) {
        fs.mkdirSync(element);
    }
});


const baseURLFav = "https://e621.net/favorite/create.json?login=earlopain&password_hash=" + secrets.e621passwordhash + "&id=";
const baseURLUpvote = "https://e621.net/post/vote.json?login=earlopain&password_hash=" + secrets.e621passwordhash + "&score=1&id=";

const alreadyDownloaded = fs.readdirSync(saveTo).concat(fs.readdirSync(saveToAnimation), fs.readdirSync(saveToSafe)).map(element => {
    return element.split(".")[0];
});

async function main() {
    for (const id of getUserInput(process.argv[2])) {
        const json = id.length === 32 ? await getJSON(jsonURL + "md5=" + id) : await getJSON(jsonURL + "id=" + id);

        if (json.status === "deleted") {
            console.log("Post " + json.md5 + " (" + id + ") is deleted");
            continue;
        }
        if (alreadyDownloaded.includes(json.md5)) {
            console.log(json.md5 + " already downloaded");
            continue;
        }

        await postJSON(baseURLFav + json.id);
        const result = await postJSON(baseURLUpvote + json.id);
        if (result.change === -1)
            await postJSON(baseURLUpvote + id);
        await writeFile(json);
        console.log(json.md5 + " finished");
    }
    console.log("Done");
}

main();

function getUserInput(input) {
    const regex1 = /post\/show\/([0-9]*)/g;
    const regex2 = /md5=([0-9a-z]*)/g;
    let results = [];
    let m;
    do {
        m = regex1.exec(input);
        if (m) {
            results.push(m[1]);
        }
    } while (m);
    do {
        m = regex2.exec(input);
        if (m) {
            results.push(m[1]);
        }
    } while (m);
    return results;
}

async function writeFile(json) {
    const url = json.file_url;
    const filename = url.split("/")[url.split("/").length - 1];
    const bin = await getBinary(url);

    let folder;

    if (json.rating === "s" || json.rating === "q") {
        folder = saveToSafe;
    }
    else if (json.file_ext === "gif" || json.file_ext === "swf" || json.file_ext === "webm") {
        folder = saveToAnimation;
    }
    else {
        folder = saveTo;
    }

    fs.writeFileSync(folder + "/" + filename, bin, "binary");
}


async function getBinary(url) {
    return await getURL(url, "binary");
}

async function getJSON(url) {
    const json = await getURL(url, "utf8");
    return JSON.parse(json);
}

async function postJSON(url) {
    const json = await getURL(url, "utf8", "post");
    return JSON.parse(json);
}

async function getURL(url, formating, method = "get") {
    return new Promise(function (resolve, reject) {
        request({ method: method, url: url, headers: { "User-Agent": 'e621downloader/earlopain' }, encoding: formating }, async (error, response, body) => {
            resolve(body);
        });
    });
}