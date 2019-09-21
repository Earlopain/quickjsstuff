const fs = require("fs");
const os = require("os");
const request = require("request");

//User config

//Your steam ID
const steamUserID = "76561198069428143";
//Should covers try to download again, if it failed in the past
//Maybe the cover got uploaded to igdb since the last run
const tryDownloadingAgain = false;
//should your already existing stuff be overwritten
//if there will be a version on steam, keep the custom one
const preserveCustomCoverArt = true;
//You can manually specify it, if it is not in the default location. Do not add a trailing slash
let steamFolder;

const configFile = __dirname + "/steamcovers.json";

const secrets = JSON.parse(fs.readFileSync("secrets.json"));

const steamapikey = secrets.steamapikey;
const igdbapikey = secrets.igdbapikey;

if (!fs.existsSync(configFile)) {
    console.log("First time running");
    fs.writeFileSync(configFile, JSON.stringify({ users: {} }, null, 4), "utf8");
}

//take the steamid, convert it binary and take the last 32bit. Convert back to decimal
const steamUserDataNumber = BigInt("0b" + BigInt(steamUserID).toString(2).substr(-32)).toString();
if (steamFolder === undefined) {
    switch (process.platform) {
        case "win32":
            steamFolder = "C:/Program Files (x86)/Steam";
            break;
        case "linux":
            steamFolder = os.homedir() + "/.steam";
            break;
        case "darwin":
            steamFolder = os.homedir() + "/Library/Application Support/Steam";
            break;
    }

}
if (steamFolder === undefined || !fs.existsSync(steamFolder))
    throw new Error("Please manually specify your steam folder at the beginning of the file");

const userDataFolder = steamFolder + "/userdata/" + steamUserDataNumber;
const steamConfigFolder = userDataFolder + "/config";
const steamCoverFolder = steamConfigFolder + "/grid";

if (!fs.existsSync(userDataFolder))
    throw new Error("You specified a wrong steamid");
if (!fs.existsSync(steamConfigFolder))
    fs.mkdirSync(steamConfigFolder);
if (!fs.existsSync(steamCoverFolder))
    fs.mkdirSync(steamCoverFolder);

const storage = JSON.parse(fs.readFileSync(configFile));
const storageBackup = storage;

async function main() {
    const allDLC = await getAllSteamDLC();
    const games = (await getAllSteamGames()).filter(value => { return (value.img_icon_url !== "" && value.img_logo_url !== "" && !allDLC.includes(value.appid)) });
    console.log("You have a total of %s games", games.length);
    if (firstRun()) {
        storage[steamUserID] = {};
        storage[steamUserID].status = {};
    }
    else {
        console.log("You are not running this for the first time. You will propably see few to no ouput");
    }

    for (const game of games) {
        let recheckCoverStatus = true;
        if (currentUser()[game.appid] === undefined) {    //this game has not yet been checked
            recheckCoverStatus = false;
            currentUser()[game.appid] = {};
            currentUser()[game.appid].steamcoverexists = await statusOK("https://steamcdn-a.akamaihd.net/steam/apps/" + game.appid + "/library_600x900_2x.jpg");
            currentUser()[game.appid].igdbcoverdownloaded = false;
            currentUser()[game.appid].igdbtriedcoverdownload = false;
        }

        if (currentUser()[game.appid].steamcoverexists === true) {  //nothing to do here, cover already exists
            continue;
        }
        //only recheck if entry was not undefined during this run and custom cover art should be deleted
        if (!preserveCustomCoverArt && recheckCoverStatus && currentUser()[game.appid].steamcoverexists !== true) {
            currentUser()[game.appid].steamcoverexists = await statusOK("https://steamcdn-a.akamaihd.net/steam/apps/" + game.appid + "/library_600x900_2x.jpg");
            const filePath = steamCoverFolder + "/" + game.appid + "p.jpg";
            if (currentUser()[game.appid].steamcoverexists === true && fs.existsSync(filePath)) {
                console.log("%s now has a cover", game.name);
                saveConfigFile();
                fs.unlinkSync(filePath);
                continue;
            }
        }
        //no steam cover, no igdb downloaded yet, but there is cover art, don't overwrite it
        if (preserveCustomCoverArt && currentUser()[game.appid].igdbcoverdownloaded === false && coverImageExists(game.appid)) {
            console.log("%s already has custom cover art", game.name);
            currentUser()[game.appid].igdbcoverdownloaded = true;
            saveConfigFile();
            continue;
        }

        //specified to download again but the cover has already been downloaded
        //tried downloading custom cover, but no result found, or cover did not have the right format
        if ((tryDownloadingAgain && currentUser()[game.appid].igdbcoverdownloaded === true) ||
            (currentUser()[game.appid].igdbtriedcoverdownload === true || currentUser()[game.appid].igdbcoverdownloaded === true)) {
            continue;
        }

        const gameName = game.name.replace(/\\/g, "\\\\");      //needed for the api request data
        const igdbGameArray = await doApiRequest("games", 'fields name,cover; search "' + gameName + '";');
        const igdbGame = igdbGameArray.filter(value => { return value.name.replace(/\\/g, "\\\\") === gameName })[0];

        if (igdbGame === undefined || igdbGame.cover === undefined) {   //game could not exist or it does but has no cover
            console.log("%s has no cover", game.name)
            currentUser()[game.appid].igdbcoverdownloaded = true;
            saveConfigFile();
            continue;
        }

        let igdbCover = (await doApiRequest("covers", "fields image_id, height, width; where id = " + igdbGame.cover + ";"))[0];

        if (igdbCover === undefined) {    //should not happen, but for n++ only the second request delivers results
            igdbCover = (await doApiRequest("covers", "fields image_id, height, width; where game = " + igdbGame.id + ";"))[0];
        }
        //there could be no results overall or the cover is horizontal
        if (igdbCover === undefined || igdbCover.width > igdbCover.height) {
            console.log(igdbCover.width > igdbCover.height ? "%s cover is horizontal" : "%s has no cover", game.name)
            currentUser()[game.appid].igdbtriedcoverdownload = true;
            continue;
        }

        await saveCoverImage(igdbCover.image_id, game.appid);
        console.log("%s has been downloaded", game.name)
        currentUser()[game.appid].igdbcoverdownloaded = true;
        saveConfigFile();
    }
    //populate statistics
    const runNumber = Object.keys(currentUser().status).length;
    currentUser().status[runNumber] = {
        "currentSteamGames": Object.keys(games).length, "previousSteamCovers": 0, "currentSteamCovers": 0,
        "previousTotalCovers": 0, "currentTotalCovers": 0, "timestamp": new Date().getTime()
    };

    for (const key of Object.keys(currentUser())) {
        currentUser().status[runNumber].currentSteamCovers += currentUser()[key].steamcoverexists === true;
        currentUser().status[runNumber].currentTotalCovers += currentUser()[key].steamcoverexists === true || currentUser()[key].igdbcoverdownloaded === true;

    }

    for (const key of Object.keys(currentUserBackup())) {
        currentUserBackup().status[runNumber].previousSteamCovers += currentUserBackup()[key].steamcoverexists === true;
        currentUserBackup().status[runNumber].previousTotalCovers += currentUserBackup()[key].steamcoverexists === true || currentUserBackup()[key].igdbcoverdownloaded === true;
    }

    console.log("Stats:");
    if (!firstRun()) {
        console.log("%s previous steam covers", currentUser().status[runNumber].previousSteamCovers);
        console.log("%s previous total covers", currentUser().status[runNumber].previousTotalCovers);
    }
    console.log("%s current  steam covers", currentUser().status[runNumber].currentSteamCovers);
    console.log("%s current  total covers", currentUser().status[runNumber].currentTotalCovers);
    if (!firstRun()) {
        console.log("%s official steam diff", currentUser().status[runNumber].currentSteamCovers - currentUser().status[runNumber].previousSteamCovers);
        console.log("%s current  steam diff", currentUser().status[runNumber].currentTotalCovers - currentUser().status[runNumber].previousTotalCovers);
    }
    console.log("Changes applied. Restart Steam to see them");
    saveConfigFile();
}

main();

function currentUser() {
    return storage[steamUserID];
}

function currentUserBackup() {
    return storageBackup[steamUserID];
}

function firstRun() {
    return storage[steamUserID] === undefined || currentUser().status === undefined;
}

function saveConfigFile() {
    fs.writeFileSync(configFile, JSON.stringify(storage, null, 4), "utf8");
}
async function saveCoverImage(igdbCoverImageID, appid) {
    const bin = await getBinary("https://images.igdb.com/igdb/image/upload/t_720p/" + igdbCoverImageID + ".jpg");
    fs.writeFileSync(steamCoverFolder + "/" + appid + "p.jpg", bin, "binary");
}
//Request related stuff

async function getAllSteamGames() {
    const url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + steamapikey + "&steamid=" + steamUserID + "&include_appinfo=1&include_played_free_games=1";
    const games = await getJSON(url);
    return games.response.games;
}
async function getAllSteamDLC() {
    const url = "https://api.steampowered.com/IStoreService/GetAppList/v1/?key=" + steamapikey + "&include_games=0&include_dlc=1&include_videos=1&include_hardware=1&max_results=50000";
    const dlc = await getJSON(url);
    return dlc.response.apps.map(value => value.appid);
}

async function saveCoverImage(igdbCoverImageID, appid) {
    const bin = await getBinary("https://images.igdb.com/igdb/image/upload/t_720p/" + igdbCoverImageID + ".jpg");
    fs.writeFileSync(steamCoverFolder + "/" + appid + "p.jpg", bin, "binary");
}

function coverImageExists(appid) {
    return fs.existsSync(steamCoverFolder + "/" + appid + "p.jpg");
}

async function doApiRequest(type, data) {
    let response;
    while ((response = await requestApi(type, data)) === undefined) {
        await sleep(10000);
    }
    return response;

}

async function getBinary(url) {
    return await getURL(url, "binary");
}

async function getJSON(url) {
    const json = await getURL(url, "utf8");
    return JSON.parse(json);
}

async function getURL(url, formating, header = {}) {
    let response;
    while ((response = await requestNormal(url, formating, header)) === undefined) {
        await new Promise(resolve => { setTimeout(() => resolve(), 10000) });
    }
    return response;

}


function requestCallback(error, response, body) {
    if (error) {
        console.log("Fatal Error");
        console.log(error);
        debugger;
        process.exit();
    }
    else if (response.statusCode > 500) {
        resolve(undefined);
    }
    else if (response.statusCode !== 200) {
        console.log("Unknown Error");
        console.log(body || response);
        debugger;
        process.exit();
    }
    else {
        this(body);
    }
}

function requestNormal(url, formating, header) {
    return new Promise(function (resolve, reject) {
        request.get({ url: url, headers: header, encoding: formating }, requestCallback.bind(resolve));
    });
}

async function requestApi(type, data) {
    const response = await new Promise(resolve => {
        request.post({ url: "https://api-v3.igdb.com/" + type, headers: { "user-key": igdbapikey }, body: data }, requestCallback.bind(resolve));
    });
    return JSON.parse(response);
}

async function statusOK(url) {
    const response = await getHeader(url);
    if (response === undefined)
        return false;
    return response.statusCode === 200;
}

async function getHeader(url) {
    return new Promise(function (resolve, reject) {
        request.head({ url: url }, (error, response, body) => {
            resolve(response);
        });
    });
}

function sleep(time) {
    return new Promise(resolve => { setTimeout(() => resolve(), time) })
}