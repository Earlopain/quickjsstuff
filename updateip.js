const request = require("request");
const fs = require("fs");
const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const zoneid = secrets.cloudflarezoneid;
const email = secrets.cloudflareemail
const apikey = secrets.cloudflareapikey;

async function main() {
    console.log(await updateIP());
}

async function updateIP() {
    const currentIp = await getCurrentIp();
    let previousIp;
    try {
        previousIp = fs.readFileSync(__dirname + "/ip.txt", "utf8");
    } catch (e) { }
    if (currentIp === previousIp)
        return "No update required, ip is still " + currentIp;
    console.log("Previous ip was " + previousIp + ", new one is " + currentIp + ", updating");

    const json = JSON.parse(await getURL("https://api.cloudflare.com/client/v4/zones/" + zoneid + "/dns_records?type=A"));
    if (json.errors && json.errors.length !== 0)
        return json.errors;
    for (const result of json.result) {
        const response = await updateZoneIP(result, currentIp);
        if (response.errors && response.errors.length !== 0)
            return response.errors;
    }
    fs.writeFileSync(__dirname + "/ip.txt", currentIp, "utf8");
    return "Success";
}

main();

function getURL(url) {
    return new Promise(resolve => {
        request.get({ url: url, headers: { "X-Auth-Email": email, "X-Auth-Key": apikey, "Content-Type": "application/json" } }, (error, response, body) => {
            resolve(body)
        });
    })
}
function updateZoneIP(result, ip) {
    let useProxy = true;
    if (result.name === "mc.c5h8no4na.net")
        useProxy = false;
    return new Promise(resolve => {
        request.put({
            url: "https://api.cloudflare.com/client/v4/zones/" + zoneid + "/dns_records/" + result.id, headers: { "X-Auth-Email": email, "X-Auth-Key": apikey, "Content-Type": "application/json" },
            json: { type: "A", proxied: useProxy, name: result.name, content: ip }
        },
            (error, response, body) => {
                resolve(body);
            });
    })
}

async function getCurrentIp() {
    const ip = await getURL("https://ipinfo.io/ip");
    return ip.split("\n")[0];
}
