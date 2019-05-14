const request = require("request");
const fs = require("fs");

const servers = ["Z9Zc9ce", "pXPJApK", "eC72Vj9"];
const outputFolder = "./discordoutput";
try {
    fs.mkdirSync(outputFolder);
} catch (error) {/*EEXIST*/ }


const checkInterval = 20 //seconds

async function main() {
    for (let i = 0; i < servers.length; i++) {
        if (!fs.existsSync(outputFolder + "/" + servers[i] + ".csv")) {
            const serverName = await getServerName(servers[i]);
            fs.appendFileSync(outputFolder + "/" + servers[i] + ".csv", "Date,Count," + serverName + "\n");
        }
    }
    while (true) {
        const timeStart = new Date().getMilliseconds();

        for (let i = 0; i < servers.length; i++) {
            const dateString = getTime();
            const serverSize = await getServerSize(servers[i]);
            fs.appendFileSync(outputFolder + "/" + servers[i] + ".csv", dateString + "," + serverSize+ ",\n");
        }
        const runtime = new Date().getMilliseconds() - timeStart;
        await sleep(checkInterval * 1000 - runtime);
    }

}

main();

async function getServerSize(id) {
    const json = await getJSON("https://discordapp.com/api/v6/invite/" + id + "?with_counts=true");
    return json.approximate_member_count;
}
async function getServerName(id) {
    const json = await getJSON("https://discordapp.com/api/v6/invite/" + id + "?with_counts=true");
    return json.guild.name;
}

function getJSON(url) {
    return new Promise(resolve => {
        request.get(url, (error, response, body) => {
            resolve(JSON.parse(body));
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getTime() {
    const date = new Date();
    const hour = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const result = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDay() + " " + (hour.toString().length === 1 ? "0" + hour : hour) + ":" + (minutes.toString().length === 1 ? "0" + minutes : minutes) + ":" + (seconds.toString().length === 1 ? "0" + seconds : seconds);
    return result;
}