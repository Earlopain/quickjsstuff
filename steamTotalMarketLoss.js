const request = require("request");
const fs = require("fs");

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const cookie = secrets.steamapikey;
const apikey = secrets.steamwebcookie;
class Wallet {
    constructor() {
        this.balance = 0;
        this.soldCapacity = 0;
        this.boughtCapacity = 0;
        this.soldTo = [];
        this.boughtFrom = [];
        this.allActors = [];
    }

    async addTransactions(transactions) {
        for (let i = 0; i < transactions.length; i++) {
            this.balance += transactions[i].listingPrice;
            if (transactions[i].listingPrice < 0) {
                const idx = this.getSteamUserIndex(transactions[i].actor, this.boughtFrom);
                if (idx === -1) {
                    let steamUser = await SteamUser.createSteamUser(transactions[i].actor);
                    steamUser.addTransaction(transactions[i]);
                    this.boughtFrom.push(steamUser);
                }
                else
                    this.boughtFrom[idx].addTransaction(transactions[i])
                this.boughtCapacity += transactions[i].listingPrice

            }
            else {
                const idx = this.getSteamUserIndex(transactions[i].actor, this.soldTo);
                if (idx === -1) {
                    let steamUser = await SteamUser.createSteamUser(transactions[i].actor);
                    steamUser.addTransaction(transactions[i]);
                    this.soldTo.push(steamUser);
                }
                else
                    this.soldTo[idx].addTransaction(transactions[i])
                this.soldCapacity += transactions[i].listingPrice;
            }
        }
    }

    getSteamUserIndex(user, array) {
        for (let i = 0; i < array.length; i++) {
            if (array[i].steamid === user || array[i].vanity === user)
                return i;
        }
        return -1;
    }
}

class Transaction {
    constructor(listingPrice, item, actor) {
        this.listingPrice = listingPrice;
        this.item = item;
        this.link = "https://steamcommunity.com/market/search?q=" + item;
        this.actor = actor;
    }
}

class SteamUser {
    constructor(steamid, level, common, saveToDisk) {
        this.steamid = steamid;
        this.level = level;
        this.personaName = common.personaname;
        this.avatar = common.avatar;
        const string = common.profileurl !== undefined ? common.profileurl.split("/")[4] : common.vanity;
        this.vanity = SteamUser.isSteamID(string) ? "" : string;
        this.timecreated = common.timecreated;
        this.country = common.loccountrycode !== undefined ? common.loccountrycode : "";
        this.transactions = [];
        if (saveToDisk)
            this.saveToDisk();
    }

    addTransaction(transaction) {
        this.transactions.push(transaction);
    }

    saveToDisk() {
        const json = {};
        json.steamid = this.steamid;
        json.level = this.level;
        json.personaname = this.personaName;
        json.avatar = this.avatar;
        json.vanity = this.vanity;
        json.timecreated = this.timecreated;
        json.country = this.country;
        fs.writeFileSync(__dirname + "/steamusers/" + (this.vanity !== "" ? this.vanity : this.steamid) + ".json", JSON.stringify(json, null, 4));
    }

    static createFromDisk(user) {
        const json = JSON.parse(fs.readFileSync(__dirname + "/steamusers/" + user + ".json", "utf8"));
        let common = {};
        common.personaname = json.personaname;
        common.avatar = json.avatar;
        common.vanity = json.vanity;
        common.timecreated = json.timecreated;
        common.country = json.country;
        return new SteamUser(json.steamid, json.level, common, false)
    }

    static async createSteamUser(user) {
        if (fs.existsSync(__dirname + "/steamusers/" + user + ".json"))
            return this.createFromDisk(user);
        let steamid;
        if (SteamUser.isSteamID(user))  //steamid
            steamid = user;
        else
            steamid = await this.resolveVanity(user);
        const level = await this.getLevel(steamid);
        const common = await this.getCommon(steamid);
        return new SteamUser(steamid, level, common, true);
    }

    static isSteamID(string) {
        return string.length === 17 && !isNaN(string);
    }

    static async getCommon(steamid) {
        const url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=" + apikey + "&format=json&steamids=" + steamid;
        const json = await getJSON(url);
        return json.response.players[0];
    }

    static async getLevel(steamid) {
        const url = "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=" + apikey + "&format=json&steamid=" + steamid;
        const json = await getJSON(url);
        return json.response.player_level;
    }

    static async  resolveVanity(vanity) {
        const url = "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=" + apikey + "&format=json&vanityurl=" + vanity + "&url_type=1"
        const json = await getJSON(url);
        return json.response.steamid;
    }
}

function getPage(index) {
    const pageSize = 500;
    const url = "https://steamcommunity.com/market/myhistory/?start=" + pageSize * index + "&count=" + pageSize;
    return new Promise(resolve => {
        request.get({
            url: url, headers: {
                "Cookie": cookie,
            }
        }, (error, response, body) => {
            if (body.includes("There was an error")) {
                resolve(getPage(index));
            }
            else
                resolve(JSON.parse(body));
        });
    });
}

async function getTransactions(json) {
    const transactions = [];
    const str = json.results_html;
    const split = str.split("market_listing_gainorloss");
    for (let i = 0; i < split.length; i++) {
        const element = split[i];
        const string = element.replace(/\r?\n|\r|\t/g, "");
        const transactionType = string.charAt(2);
        let price;
        if (transactionType === "+")
            price = -parseFloat(string.split("market_listing_price")[1].substring(2).split("<")[0].replace(",", "."));
        else if (transactionType === "-")
            price = parseFloat(string.split("market_listing_price")[1].substring(2).split("<")[0].replace(",", "."));
        else
            continue;
        const actor = string.split("https://steamcommunity.com")[1].split("/")[2].split("\"")[0];
        const itemName = string.split("market_listing_item_name\"")[1].split(">")[1].split("<")[0];
        const gameName = string.split("market_listing_game_name\">")[1].split("<")[0];
        const item = gameName + " " + itemName;
        transactions.push(new Transaction(price, item, actor))
    }
    return transactions;

}

async function main() {
    let wallet = new Wallet();
    let index = 0;
    let total;
    while (true) {
        const json = await getPage(index);
        total = json.total_count;
        if (json.start > total) {
            console.log("Sold items worth:   " + wallet.soldCapacity.toFixed(2));
            console.log("Bought items worth: " + -wallet.boughtCapacity.toFixed(2));
            console.log("Overall balance:    " + (wallet.balance >= 0 ? "+" + wallet.balance.toFixed(2) : wallet.balance.toFixed(2)));
            const a = sortTransactions(wallet.boughtFrom, "steamlevel");
            const b = sortTransactions(wallet.soldTo, "steamlevel");
            return;
        }
        console.log((json.start / total * 100).toFixed(2) + "%");
        const transactions = await getTransactions(json);
        await wallet.addTransactions(transactions);
        index++;
    }
}

function sortTransactions(users, type) {
    switch (type) {
        case "transactioncount":
            return users.sort((a, b) => { return b.transactions.length - a.transactions.length })
        case "steamlevel":
            return users.sort((a, b) => {
                if (a.level === undefined)
                    return 1;
                if (b.level === undefined)
                    return -1;
                return b.level - a.level
            })
        default:
            debugger;
            break;
    }
}

main();

function getJSON(url) {
    return new Promise(resolve => {
        request.get(url, (error, response, body) => {
            resolve(JSON.parse(body));
        });
    });
}
