const request = require("request");
var spawn = require('child_process').spawn;

const secrets = JSON.parse(require("fs").readFileSync("./secrets.json"));


const url = "https://www.googleapis.com/youtube/v3/commentThreads?key=" + secrets.youtubeapikey + "&textFormat=plainText&part=snippet&videoId=acVtErjF9Hs&maxResults=50"

async function main() {
    let comments = [];
    while (true) {
        const json = await getJSON(url);
        for (const comment of json.items) {
            const commentText = comment.snippet.topLevelComment.snippet.textDisplay;
            if (comments.indexOf(commentText) === -1) {
                console.log(commentText);
                comments.push(commentText);
            }
        }
        await sleep(1000);
    }
}

main();

function sleep(duration) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), duration);
    })
}

function getJSON(url) {
    return new Promise(resolve => {
        request.get({
            uri: url, headers: { followRedirect: false, }
        }, (error, response, body) => {
            resolve(JSON.parse(body))
        });
    });
}