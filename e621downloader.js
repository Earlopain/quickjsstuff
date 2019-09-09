const request = require('request');
const fs = require('fs');
const url = "https://e621.net/post/show.json?id=";
const saveTo = "/media/earlopain/External/Pictures/e621";
const alreadyDownloaded = fs.readdirSync(saveTo + "/all");

alreadyDownloaded.forEach((file, index) => {
    alreadyDownloaded[index] = file.split(".")[0];
});
const regex = /post\/show\/([0-9]*)/g;
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
let urls = [];

rl.question("URLS: ", (answer) => {
    let str = answer
    let results = [];
    let m;
    do {
        m = regex.exec(str);
        if (m) {
            results.push(m[1]);
        }
    } while (m);

    next(results[0]);

    function next(id) {
        getURL(id).then(resolve => {
            if (resolve.status !== "active" && resolve.status !== "pending" && resolve.status !== "flagged") {
                console.log("Post " + resolve.id + " (" + id + ")" + "is status: " + resolve.status);
                urls.push(undefined);
            }
            else {
                let filehash = toMD5(saveTo + "/" + resolve.md5 + "." + resolve.file_ext);
                if (filehash === resolve.md5 || alreadyDownloaded.includes(resolve.md5)) {
                    console.log(resolve.md5 + " already downloaded");
                    urls.push(undefined);
                }
                else
                    urls.push(resolve.file_url);
            }
            if (urls.length !== results.length) {
                next(results[urls.length]);
            }
            else {
                writeFile(urls.pop());
            }
        });
    }
    rl.close();
});

function writeFile(url) {
    if (urls.length === 0 && url === undefined)
        return;
    if (url === undefined) {
        writeFile(urls.pop());
        return;
    }
    const filename = url.split("/")[url.split("/").length - 1];

    file = request(url).pipe(fs.createWriteStream(saveTo + "/" + filename));
    file.on('finish', function () {
        console.log(filename.split(".")[0] + " finished");
        writeFile(urls.pop());
    });
}

function getURL(id) {
    return new Promise(function (resolve, reject) {
        request(url + id, { headers: { 'User-Agent': 'request' } }, (error, response, body) => {
            console.log(url + id);
            body = JSON.parse(body);
            resolve(body);
        })
    });
}

function toMD5(path) {
    try {
        const data = fs.readFileSync(path);
        return crypto.createHash("md5").update(data).digest("hex");
    }
    catch (e) {
        return "";
    }
}
