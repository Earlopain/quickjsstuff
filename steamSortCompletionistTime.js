const request = require("request");
const fs = require("fs");
const hltb = require('howlongtobeat');
const hltbService = new hltb.HowLongToBeatService();

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const apikey = secrets.steamapikey;
let steamid = "Earlopain";
const checkForCompletion = true;

main();

async function main() {
    await resolveUsername();
    const games = await getAllGamesUser();
    const logThis = [];
    for (let i = 0; i < games.length; i++) {
        try {
            const json = await getGameJSON(games[i].id);

            if (json.playerstats.error === "Profile is not public")
                throw new Error("Profile is not public");
            if (json.playerstats.error || !json.playerstats || !json.playerstats.achievements || json.playerstats.achievements.length === 0)
                continue;
            const achiCount = json.playerstats.achievements.length;
            if (checkForCompletion) {
                const achieUserCount = await getUserAchievementCount(json);
                if (achieUserCount === achiCount)
                    continue;
            }
            const ttc = await getTimeToComplete(games[i].name);
            if (!ttc || !ttc[0] || isNaN(ttc[0].gameplayCompletionist) || ttc[0].gameplayCompletionist === 0)
                continue;
            logThis.push({ name: ttc[0].name, time: ttc[0].gameplayCompletionist });
        }
        catch (e) { }
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write((i / games.length * 100).toFixed(2) + "%");
    }
    logThis.sort((a, b) => {
        return a.time - b.time;
    })
    let string = "";
    for (let i = 0; i < logThis.length; i++) {
        string += logThis[i].time.toString().padEnd(7) + " => " + logThis[i].name + "\n";
    }
    fs.writeFileSync("./TimeToComplete.txt", string);
}

async function getTimeToComplete(name) {
    return new Promise(resolve => {
        hltbService.search(name).then(result => resolve(result)).catch(e => resolve(undefined));
    });
}

async function resolveUsername() {
    const url = "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=" + apikey + "&format=json&vanityurl=" + steamid + "&url_type=1";
    if (steamid.length !== 17 && isNaN(parseInt(steamid))) {
        const json = await getJSON(url);
        steamid = json.response.steamid;
    }
}

async function getAllGamesUser() {
    const url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + apikey + "&format=json&steamid=" + steamid + "&include_appinfo=1&l=en&appids_filter=";
    const json = await getJSON(url);
    let result = [];
    json.response.games.forEach(element => {
        result.push({ id: element.appid, name: element.name, image: "http://media.steampowered.com/steamcommunity/public/images/apps/" + element.appid + "/" + element.img_logo_url + ".jpg" });
    });
    return result;
}

async function getGameJSON(appid) {
    const url = "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=" + apikey + "&format=json&steamid=" + steamid + "&appid=" + appid + "&l=";
    const json = await getJSON(url);
    return json;
}

async function getUserAchievementCount(json) {
    let result = 0;
    json.playerstats.achievements.forEach(element => {
        if (element.achieved === 1)
            result++;
    });
    return result;
}

function getJSON(url) {
    return new Promise(resolve => {
        request.get(url, (error, response, body) => {
            resolve(JSON.parse(body));
        });
    });
}
