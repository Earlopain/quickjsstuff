const request = require("request");
const fs = require('fs');

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const baseURLFav = "https://e621.net/favorite/create.json?login=earlopain&password_hash=" + secrets.e621passwordhash + "&id=";
const baseURLUpvote = "https://e621.net/post/vote.json?login=earlopain&password_hash=" + secrets.e621passwordhash + "&score=1&id=";

const baseURLId = "https://e621.net/post/show.json?md5="

let folder = "/media/earlopain/External/Pictures/e621/";
folder = folder.replace(/\\/g, "/");
if (!folder.endsWith("/"))
    folder = folder + "/";

let files = fs.readdirSync(folder);
main();

async function main() {
    for (const file of files) {
        if (fs.statSync(folder + file).isDirectory())
            continue;
        const md5 = file.split(".")[0];
        if (md5.length !== 32) {
            console.log(file);
            continue;
        }
        else {
            const json = await getURL(baseURLId + md5);
            console.log(baseURLId + md5);
            const id = json.id;
            if (json.status === "deleted")
                console.log(md5 + " https://e621.net/post/show/" + id);
            await postURL(baseURLFav + id);
            const result = await postURL(baseURLUpvote + id);
            if (result.change === -1)
                await postURL(baseURLUpvote + id);
            fs.copyFileSync(folder + file, folder + "all/" + file);
            fs.unlinkSync(folder + file, folder + "all/" + file);
        }
    }
}

function getURL(url) {
    return new Promise(function (resolve, reject) {
        request.post(url, { headers: { 'User-Agent': "favsync/1.0 (earlopain)" } }, (error, response, body) => {
            resolve(JSON.parse(body));
        })
    });
}

function postURL(urll) {
    const options = {
        url: urll,
        method: 'POST',
        headers: {
            'User-Agent': 'favsync/1.0 (earlopain)'
        }
    };
    return new Promise(function (resolve, reject) {
        request(options, (error, response, body) => {
            resolve(JSON.parse(body));
        })
    });

}
