const fs = require("fs");
const request = require("request");
//const sharp = require("sharp");

const DiscordRPC = require('discord-rpc');
var PlexAPI = require("plex-api");

const clientId = '610566273956446221';

let playingKey;
let parentKey;

DiscordRPC.register(clientId);
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

const user = "earlopain";

const plexCLient = new PlexAPI({ "token": "fpJx4zeYwyou3KWv4BNX", "hostname": "192.168.178.97" });

let startedPlaying;

async function setActivity() {
    if (!rpc)
        return;
    const allStreams = await plexQuery("/status/sessions");
    let displayThis;

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
    if (parentKey !== displayThis.parentRatingKey) {
        parentKey = displayThis.parentRatingKey;
        await uploadCover(displayThis);
    }
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
    await removePreviousCover();
    const cover = await getCover(displayThis);
    //const coverResized = await resizeImage(cover);
    const coverBase64 = "data:image/jpeg;base64," + cover.toString("base64");
    const response = await postImage(coverBase64, displayThis);
    writeCoverKey(response.id);
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
                "Authorization": "mfa.J0jVZUR5iIGmdj1FOmPK_Y35s_FV8Y8SakQ6M3ZUxchYoSiHuLtRHNE5Kb5pH6PkBXnlRjQT6VYdDyDT3jpu"
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
                "Authorization": "mfa.J0jVZUR5iIGmdj1FOmPK_Y35s_FV8Y8SakQ6M3ZUxchYoSiHuLtRHNE5Kb5pH6PkBXnlRjQT6VYdDyDT3jpu"
            }
        }, (error, response, body) => {
            resolve(body);
        });
    });
}

function writeCoverKey(coverID) {
    fs.writeFileSync(__dirname + "/imageKey.txt", coverID, "utf8")
}

function getCoverKey() {
    return fs.readFileSync(__dirname + "/imageKey.txt", "utf8");
}

async function removePreviousCover() {
    await deleteCover(getCoverKey());
}

async function resizeImage(buffer) {
    return new Promise(resolve => {
        sharp(buffer).resize(512, 512).toBuffer().then(data => {
            resolve(data.buffer)
        });
    });
}