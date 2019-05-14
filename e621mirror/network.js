const EventEmitter = require('events');
const request = require("request");
const util = require("./util.js");

const testURL = "https://e621.net/post/index.json?limit=1";

const useragent = "mirror";
const retryTime = 30000;
const timeout = 300000;

let down = false;

const notifier = new EventEmitter();

/**
* Writes the file at the url to the specified path as a binary
* @param {String} url what to save
* @param {String} path where to save to
*/
async function getBinary(url, line) {
    let retries = 0;
    let bin = await getURL(url, "binary", line);
    while (bin === undefined) {
        retries++;
        line.update(line.id + " failed, " + retries + " retries, trying again in " + retryTime / 1000 + " seconds");
        await util.sleep(retryTime);
        bin = await getURL(url, "binary", line);
    }
    return bin;
}

async function getText(url) {
    let text = await getURL(url, "utf8");
    while (text === undefined) {
        await util.sleep(retryTime);
        text = await getURL(url, "utf8");
    }
    return text;
}

/**
 * Parses the json at the url and returns it 
 * @param {String} url
 * @returns Promise: Parsed Json from url
 */
async function getJSON(url, line) {
    let json = await getURL(url, "utf8");
    let prev;
    if (line)
        prev = line.getText();
    while (json === undefined) {
        if (line)
            line.update("Failed getting json, trying again in " + (retryTime / 1000) + "s");
        await util.sleep(retryTime);
        json = await getURL(url, "utf8");
    }
    if (line)
        line.update(prev);
    return JSON.parse(json);
}

async function getURL(url, formating, line) {
    if (down)
        return undefined;
    return new Promise(function (resolve, reject) {
        let totalDown = 0;
        let r;
        //After 3 minutes, return undefined, probably didn't work
        const timer = setTimeout(() => {
            resolve(undefined);
            r.abort();
        }, timeout);
        try {
            r = request.get({ url: url, headers: { "User-Agent": useragent }, encoding: formating }, async (error, response, body) => {
                if (down)
                    resolve(undefined);
                if (error) {
                    clearTimeout(timer);
                    down = true;
                    notifier.emit("connectionoff");
                    resolve(undefined);
                }
                else if (siteDown(response, body, error)) {
                    clearTimeout(timer);
                    down = true;
                    notifier.emit("serveroffline", response.statusCode, response.statusMessage);
                    resolve(undefined);
                }

                else {
                    if (down)
                        notifier.emit("backup");
                    down = false;

                    if (response.statusCode !== 200 && response.statusCode !== 404) {
                        clearTimeout(timer);
                        resolve(undefined);
                    }
                    else {
                        clearTimeout(timer);
                        resolve(body);
                    }
                }

            }).on("data", data => {
                totalDown += data.length;
                if (line)
                    line.update(line.prefix + " " + (totalDown / 1024).toFixed(0) + "kb");
            });
        }
        catch (e) {
            clearTimeout(timer);
            resolve(undefined);
        }

    });
}

function siteDown(response, body, error) {
    if (error)
        return true;
    else if (response.statusCode === 200 && body.includes("We are performing maintenance on the site and its servers! Keep an eye on the"))
        return true;
    else if (response.statusCode >= 500 && response.statusCode < 600)
        return true;
    return false;
}

setInterval(() => {
    if (!down)
        return;
    request.get({ url: testURL, headers: { "User-Agent": useragent } }, async (error, response, body) => {
        if (!siteDown(response, body, error)) {
            notifier.emit("backup");
            down = false;
        }
    });

}, retryTime);

exports.getBinary = getBinary;
exports.getJSON = getJSON;
exports.getText = getText;
exports.notifier = notifier;
