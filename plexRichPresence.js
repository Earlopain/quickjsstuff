const fs = require("fs");
const request = require("request");
//const sharp = require("sharp");
const secrets = JSON.parse(fs.readFileSync("./secrets.json"));


const DiscordRPC = require('discord-rpc');
var PlexAPI = require("plex-api");

const clientId = '610566273956446221';

let previousCovers;

try {
    previousCovers = JSON.parse(fs.readFileSync(__dirname + "/imageKey.json", "utf8"));
} catch (error) {
    previousCovers = {};
}


let playingKey;
let parentKey;

DiscordRPC.register(clientId);
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

const user = "earlopain";

const plexCLient = new PlexAPI({ "token": secrets.plexservertoken, "hostname": "192.168.178.97" });

let startedPlaying;

async function setActivity() {
    if (!rpc)
        return;
    const allStreams = await plexQuery("/status/sessions");
    let displayThis;
    if (allStreams === undefined) {
        return;
    }

    for (const stream of allStreams) {
        if (stream.User.title.toLowerCase() === user) {
            displayThis = stream;
            if (displayThis.Player.state === "paused") {
                rpc.clearActivity();
                return;
            }
        }
    }
    if (!displayThis)
        return;
    if (playingKey !== displayThis.key) {
        startedPlaying = new Date();
        playingKey = displayThis.key;
    }
    if (previousCovers[displayThis.parentRatingKey] === undefined)
        await uploadCover(displayThis);

    rpc.setActivity({
        details: displayThis.title,
        state: displayThis.originalTitle + " - " + displayThis.parentTitle,
        startTimestamp: startedPlaying,
        largeImageKey: 'cover' + displayThis.parentRatingKey,
        largeImageText: 'Listening to Music',
        smallImageKey: 'plex',
        smallImageText: 'Playing',
        instance: false,
    });
}

rpc.on('ready', () => {
    setActivity();

    //activity can only be set every 15 seconds
    setInterval(() => {
        setActivity();
    }, 15e3);
});

rpc.login({ clientId }).catch(console.error);

async function plexQuery(string) {
    return new Promise(resolve => {
        plexCLient.query(string).then(function (result) {
            resolve(result.MediaContainer.Metadata);
        }, function (err) {
            console.error("Could not connect to server", err);
        });
    })
}

async function plexQueryBin(string) {
    return new Promise(resolve => {
        plexCLient.query(string).then(function (result) {
            resolve(result);
        }, function (err) {
            console.error("Could not connect to server", err);
        });
    })
}

async function uploadCover(displayThis) {
    if (Object.keys(previousCovers).length >= 150)
        await removeOldestCover();
    const cover = await getCover(displayThis);
    //const coverResized = await resizeImage(cover);
    const coverBase64 = "data:image/jpeg;base64," + cover.toString("base64");
    const response = await postImage(coverBase64, displayThis);
    writeCoverKey(displayThis.parentRatingKey, response.id);
}

async function getCover(displayThis) {
    const bin = await plexQueryBin("/library/metadata/" + displayThis.parentRatingKey + "/thumb");
    return bin;
}

function postImage(imageBase64, displayThis) {
    return new Promise(resolve => {
        request({
            url: "https://discordapp.com/api/v6/oauth2/applications/" + clientId + "/assets",
            method: "POST",
            headers: {
                "Authorization": secrets.discordWebToken
            },
            json: {
                "image": imageBase64,
                "name": "cover" + displayThis.parentRatingKey, "type": 1
            }
        }, (error, response, body) => {
            resolve(body);
        });
    });
}

function deleteCover(id) {
    return new Promise(resolve => {
        request({
            url: "https://discordapp.com/api/v6/oauth2/applications/" + clientId + "/assets/" + id,
            method: "DELETE",
            headers: {
                "Authorization": secrets.discordWebToken
            }
        }, (error, response, body) => {
            resolve(body);
        });
    });
}

function writeCoverKey(plexID, discordID) {
    previousCovers[plexID] = { "discordID": discordID, "addedAt": new Date().getTime() };
    fs.writeFileSync(__dirname + "/imageKey.json", JSON.stringify(previousCovers, null, 4), "utf8")
}

async function removeOldestCover() {
    let oldest = Number.MAX_SAFE_INTEGER;
    let discordID;
    for (const cover of previousCovers) {
        if (cover.addedAt < oldest) {
            oldest = cover.addedAt;
            discordID = cover.discordID;
        }
    }
    await deleteCover(discordID);
}

async function resizeImage(buffer) {
    return new Promise(resolve => {
        sharp(buffer).resize(512, 512).toBuffer().then(data => {
            resolve(data.buffer)
        });
    });
}