const request = require("request");
const fs = require('fs');

const baseURL = "https://e621.net/post/show.json?"

const whitelist = ["0e2d7c28575fd692ddcf68fc63221d9c"];

let folder = "/media/earlopain/External/Pictures/e621/all";
folder = folder.replace(/\\/g, "/");
if (!folder.endsWith("/"))
    folder = folder + "/";

async function main() {
    for (const file of files) {
        let md5 = file.split(".")[0];
        if (whitelist.includes(md5))
            continue;
        const startJSON = await getPostJSON(md5);
        let startID = startJSON.id;
        let newID = getNewerVersionID(startJSON);
        if (startID === newID)
            continue;
        while (true) {
            const json = await getPostJSON(newID);
            newID = getNewerVersionID(json);
            if (json.id === newID) {
                console.log("OLD: " + md5 + " NEW: " + json.id);
                break;
            }

        }
    }
}

main();

function getNewerVersionID(json) {
    if (json.status === "deleted" && json.delreason && json.delreason.startsWith("Inferior version/duplicate of post")) {
        return json.delreason.split("Inferior version/duplicate of post #")[1];
    }
    return json.id;
}

function getPostJSON(post) {
    let prefix;
    if (post.length === 32)
        prefix = "md5="
    else prefix = "id="
    return new Promise(function (resolve, reject) {
        request(baseURL + prefix + post, { headers: { 'User-Agent': "postupdater" } }, (error, response, body) => {
            resolve(JSON.parse(body));
        })
    });
}