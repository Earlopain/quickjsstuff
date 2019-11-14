const fs = require("fs");
const request = require("request");
//const sharp = require("sharp");
const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

//TODO check if player the player windows was closed


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

DiscordRPC.register(clientId);
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

const users = [1, 23160072];

const plexCLient = new PlexAPI({ "token": secrets.plexservertoken, "hostname": "192.168.178.97" });

let endTime;

let alreadySettingActivity = false;
let currentDisplayThis;
let notPlayingAnythingTimerClear;

async function setActivity() {
    if (alreadySettingActivity)
        return;
    let allStreams;
    alreadySettingActivity = true;
    try {
        allStreams = await plexQuery("/status/sessions");
    } catch (error) {
        console.log(error);
        return;
    }
    let displayThis;
    if (allStreams.size === 0) {
        notPlayingAnythingTimerClear = setTimeout(() => {
            setRPC("");
        }, 5e3);
        alreadySettingActivity = false;
        return;
    }
    if(notPlayingAnythingTimerClear !== undefined){
        clearTimeout(notPlayingAnythingTimerClear);
        notPlayingAnythingTimerClear = undefined;
    }
    let activeStream = false;
    for (const stream of allStreams.Metadata) {
        if (users.includes(parseInt(stream.User.id))) {
            if (stream.Player.state !== "paused") {
                displayThis = stream;
                activeStream = true;
                break;
            }
        }
    }
    if (!activeStream) {
        setRPC("");
    }
    else if (currentDisplayThis !== "" && playingKey === displayThis.key) {
        firstTime = false;
    }

    else if (currentDisplayThis !== displayThis) {
        endTime = new Date().getTime() + parseInt(displayThis.duration) - parseInt(displayThis.viewOffset);

        playingKey = displayThis.key;

        if (previousCovers[displayThis.parentRatingKey] === undefined)
            await uploadCover(displayThis);

        setRPC(displayThis);
    }
    alreadySettingActivity = false;
}

let displayBuffer;
let allowedToSet = true;

function setRPC(displayThis) {
    if (allowedToSet) {
        if (currentDisplayThis === displayThis)
            return;
        currentDisplayThis = displayThis;
        if (displayThis === "") {
            console.log("Clearing activity");
            rpc.clearActivity();
        }
        else {
            const activity = {
                details: displayThis.title,
                state: displayThis.grandparentTitle + " - " + displayThis.parentTitle,
                startTimestamp: new Date().getTime(),
                endTimestamp: endTime,
                largeImageKey: 'cover' + displayThis.parentRatingKey,
                largeImageText: 'Listening to Music',
                smallImageKey: 'plex',
                smallImageText: 'Playing',
                instance: false,
            };
            console.log("Setting activity to");
            console.log(activity);
            rpc.setActivity(activity);
        }
        allowedToSet = false;
        setTimeout(() => {
            if (displayBuffer !== undefined) {
                setRPC(displayBuffer);
                displayBuffer === undefined;
            } else {
                allowedToSet = true;
            }
        }, 15e3);
    }
    else {
        displayBuffer = displayBuffer;
    }
}

rpc.on('ready', () => {
    setActivity();
    //activity can only be set every 15 seconds
    setInterval(() => {
        setActivity();
    }, 1e3);
});

rpc.login({ clientId }).catch(console.error);

async function plexQuery(string) {
    return new Promise(resolve => {
        plexCLient.query(string).then(function (result) {
            resolve(result.MediaContainer);
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
    if (Object.keys(previousCovers).length >= 145)  //max images is 150, but leave some space for other images
        await removeOldestCover();
    const cover = await getCover(displayThis);
    //const coverResized = await resizeImage(cover);
    const coverBase64 = "data:image/jpeg;base64," + cover.toString("base64");
    const response = await postImage(coverBase64, displayThis);
    if(isNaN(response.id)){
        console.log("Discord POST request did not return a id, probably expired webcookie");
        console.log(response);
        return;
    }
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
