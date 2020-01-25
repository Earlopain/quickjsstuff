const request = require("request");
const fs = require('fs');

const baseURL = "https://e621.net/post/show.json?"

const whitelist = ["0e2d7c28575fd692ddcf68fc63221d9c"];

let folder = "/run/media/earlopain/plex/plexmedia/e621/explicit";
const files = fs.readdirSync(folder);

async function main() {
    for (const file of files) {
        let md5 = file.split(".")[0];
        if (whitelist.includes(md5))
            continue;
        const startJSON = await getPostJSON(md5);
        let newID = getNewerVersionID(startJSON);
        if (startJSON.id === newID)
            continue;
        let encounteredIds = [newID, startJSON.id];
        while (true) {
            const json = await getPostJSON(newID);
            newID = getNewerVersionID(json);
            if (encounteredIds.includes(newID)) {
                console.log("CIRCUAL REFERENCE");
                console.log(encounteredIds);
                break;
            }
            encounteredIds.push(newID);
            if (json.id === newID) {
                console.log("OLD: " + md5 + " NEW: " + json.md5);
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
    const prefix = post.length === 32 ? "md5=" : "id=";
    return new Promise(async resolve => {
        request(baseURL + prefix + post, { headers: { 'User-Agent': "postupdater" } }, async (error, response, body) => {
            try {
                resolve(JSON.parse(body));
            }
            catch (e) {
                await new Promise(resolve => { setTimeout(() => { resolve() }, 5000) });
                resolve(await getPostJSON(post));
            }
        })
    });
}
