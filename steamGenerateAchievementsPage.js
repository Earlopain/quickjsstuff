const request = require("request");
const fs = require("fs");

const getRemaining = false;

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const apikey = secrets.steamapikey;
let steamid = "Earlopain";
let begining = `<!DOCTYPE html><html><head><title>Page Title</title></head><body><span id="root"></span><script>`;
let script = `
    let adder = document.getElementById("root");
    function sleep(ms = 250) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function add(img, name, id){
        //await sleep();
        let template = document.createElement("template");
        template.innerHTML = "<a><img></img></a>";
        template.content.childNodes[0].href = \"https://steamcommunity.com/stats/\" + id + \"/achievements\";
        template.content.childNodes[0].childNodes[0].src = \"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/\" + img;
        template.content.childNodes[0].childNodes[0].title = name;
        template.content.childNodes[0].childNodes[0].width = 64;
        template.content.childNodes[0].childNodes[0].height = 64;
        adder.appendChild(template.content.firstChild);
    }
    async function main(){

`;
let filename = steamid + (getRemaining ? "Remaining" : "Achieved")
let stream = fs.createWriteStream(__dirname + "/" + filename + ".html", { flags: 'a' });
let ending = "</script></body></html>";

async function main() {
    await resolveUsername();
    stream.write(begining + script);
    const allGames = await getAllGamesUser();
    let prev = "";
    for (let i = 0; i < allGames.length; i++) {
        let next = (i / allGames.length * 100).toFixed(2) + "%";
        if (prev !== next) {
            prev = next;
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(prev);
        }
        const element = allGames[i];
        const game = await gameAchievementsToDisplay(element, true);
        if (Object.keys(game).length !== 0) {
            const achievements = game.achievements;
            let add = "";
            achievements.forEach(element2 => {
                add += "add(\"" + element2.icon.substr(66) + "\", \"" + escapeHtml(element2.name) + "\", " + game.gameid + ");";
            });
            stream.write(add + "sleep();\n    ");
        }
    }
    stream.write("}main()\n" + ending);
    stream.end();
}

main();

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\\/g, "\\\\;");
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

async function getAllGamesGlobal() {
    const url = "https://api.steampowered.com/ISteamApps/GetAppList/v2/?key=" + apikey + "&format=json";
    const json = await getJSON(url);
    let result = [];
    json.applist.apps.forEach((element, index) => {
        result.push({ id: element.appid, name: element.name });
    });
    return result;
}

async function gameAchievementsToDisplay(game, getUserToo) {
    const gameid = game.id;
    const name = game.name;
    const image = game.image;
    const urlGeneral = "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=" + apikey + "&format=json&appid=" + gameid + "&l=en";
    const urlUser = "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=" + apikey + "&format=json&steamid=" + steamid + "&appid=" + gameid + "&l=en";
    const jsonGeneral = await getJSON(urlGeneral);
    let jsonUser;
    if (getUserToo)
        jsonUser = await getJSON(urlUser);
    let percentage = "100%"
    let result = [];
    if (jsonGeneral.game && jsonGeneral.game.availableGameStats && jsonGeneral.game.availableGameStats.achievements && (!getUserToo || (jsonUser.playerstats && jsonUser.playerstats.achievements))) {
        const general = jsonGeneral.game.availableGameStats.achievements;
        let user;
        if (getUserToo)
            user = jsonUser.playerstats.achievements;
        let count = 0;
        general.forEach((element, index) => {
            if (!getUserToo || user[index].achieved === (getRemaining ? 0 : 1)) {
                result.push({ name: element.displayName, icon: element.icon, link: "https://steamcommunity.com/profiles/" + steamid + "/stats/" + gameid + "/achievements/" });
                count++;
            }
        });
        percentage = (100 - count / general.length * 100).toFixed(2) + "%";
        return { gameid: gameid, name: name, image: image, percentage: percentage, achievements: result };
    }
    return {};
}


function getJSON(url) {
    return new Promise(resolve => {
        request.get(url, (error, response, body) => {
            resolve(JSON.parse(body));
        });
    });
}
