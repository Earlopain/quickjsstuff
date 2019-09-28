const request = require('request');
const fs = require('fs');

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const jsonURL = "https://e621.net/post/show.json?";
const saveTo = "/media/earlopain/plex/plexmedia/Pictures/e621";


const baseURLFav = "https://e621.net/favorite/create.json?login=earlopain&password_hash=" + secrets.e621passwordhash + "&id=";
const baseURLUpvote = "https://e621.net/post/vote.json?login=earlopain&password_hash=" + secrets.e621passwordhash + "&score=1&id=";

const allFiles = fs.readdirSync(saveTo);
const alreadyDownloaded = allFiles.map(element => {
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
        await writeFile(json.file_url);
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

async function writeFile(url) {
    const filename = url.split("/")[url.split("/").length - 1];
    const bin = await getBinary(url);
    fs.writeFileSync(saveTo + "/" + filename, bin, "binary");
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