const fs = require("fs");
const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const discordClientId = '610566273956446221';
const plexUsers = [1, 23160072];
const plexIp = "192.168.178.97";

function generateActivity(activeStream) {
    return {
        details: activeStream.title,
        state: activeStream.grandparentTitle + " - " + activeStream.parentTitle,
        startTimestamp: new Date().getTime(),
        endTimestamp: new Date().getTime() + parseInt(activeStream.duration) - parseInt(activeStream.viewOffset),
        largeImageKey: "plex",
        largeImageText: "Listening to Music",
        smallImageKey: "plex",
        smallImageText: "Playing",
        instance: false,
    };
}

async function sleep(duration) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, duration);
    });
}

class DiscordRpc {
    constructor(clientId) {
        const DiscordRPC = require('discord-rpc');
        DiscordRPC.register(clientId);
        this.rpc = new DiscordRPC.Client({ transport: 'ipc' });
        this.clientId = clientId;
    }

    async init() {
        return new Promise(resolve => {
            this.rpc.on('ready', async () => {
                resolve();
            });
            this.rpc.login({ clientId: this.clientId }).catch(console.error);
        });
    }

    setActivity(activity) {
        this.rpc.setActivity(activity);
    }

    clearActivity() {
        this.rpc.clearActivity();
    }
}

class PlexApi {
    constructor(ip) {
        const PlexAPI = require("plex-api");
        this.plexClient = new PlexAPI({ "token": secrets.plexservertoken, "hostname": ip });
    }

    async getPlayingStream() {
        let allStreams;
        try {
            allStreams = (await this.plexClient.query("/status/sessions")).MediaContainer.Metadata;
        } catch (error) {
            console.log(error);
            return;
        }
        if(allStreams === undefined) {
            return;
        }
        for (const stream of allStreams) {
            if (plexUsers.includes(parseInt(stream.User.id))) {
                if (stream.Player.state !== "paused") {
                    return stream;
                }
            }
        }
    }
}

(async () => {
    const sleepTime = 1000;
    const discord = new DiscordRpc(discordClientId);
    await discord.init();
    const plex = new PlexApi(plexIp);
    let previousKey;
    let activityClearable = false;
    while (true) {
        const activeStream = await plex.getPlayingStream();
        if (activeStream === undefined && activityClearable) {
            console.log("Clearing activity");
            discord.clearActivity();
            await sleep(15000 - sleepTime);
            previousKey = undefined;
            activityClearable = false;
        }
        else if (activeStream !== undefined && previousKey !== activeStream.ratingKey) {
            const activity = generateActivity(activeStream);
            console.log("Setting activity to");
            console.log(activity);
            discord.setActivity(activity);
            await sleep(15000 - sleepTime);
            previousKey = activeStream.ratingKey;
            activityClearable = true;
        }
        await sleep(sleepTime);
    }
})();
