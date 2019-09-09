const request = require('request');
const fs = require('fs');
const readline = require('readline');


const jsonURL = "https://e621.net/post/show.json?id=";
const saveTo = "/media/earlopain/External/Pictures/e621";

const allFiles = fs.readdirSync(saveTo + "/all");
const downloadedFiles = fs.readdirSync(saveTo).filter(element => element !== "all");
const alreadyDownloaded = allFiles.concat(downloadedFiles).map(element => {
    return element.split(".")[0];
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    for (const id of await getUserInput()) {
        const postJSON = await getJSON(jsonURL + id);
        if (postJSON.status === "deleted") {
            console.log("Post " + postJSON.md5 + " (" + id + ") is deleted");
            continue;
        }
        
        if (alreadyDownloaded.includes(postJSON.md5)) {
            console.log(postJSON.md5 + " already downloaded");
            continue;
        }
        await writeFile(postJSON.file_url);
        console.log(postJSON.md5 + " finished");
    }
}

main();

async function getUserInput() {
    const regex = /post\/show\/([0-9]*)/g;
    return new Promise(resolve => {
        let results = [];
        rl.question("URLS: ", (answer) => {
            let m;
            do {
                m = regex.exec(answer);
                if (m) {
                    results.push(m[1]);
                }
            } while (m);
            resolve(results);
            rl.close();
        });
    });
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

async function getURL(url, formating) {
    return new Promise(function (resolve, reject) {
        request.get({ url: url, headers: { "User-Agent": 'e621downloader/earlopain' }, encoding: formating }, async (error, response, body) => {
            resolve(body);
        });
    });
}