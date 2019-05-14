const readline = require("readline-sync");
const fs = require("fs");
const request = require("request");
const opn = require("opn");
const baseURL = "https://e621.net/post/show.json?id=";
const openURL = "https://e621.net/post/show/"
const crypto = require('crypto');

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const folder = "./deleted/"

async function main() {
    let page = 1;
    while (true) {
        const html = await getText(craftLink(page));
        const ids = getIdsFromHTML(html);
        let finishedIds;
        try {
            finishedIds = JSON.parse(fs.readFileSync("./finished.json"));
        }
        catch (e) {
            finishedIds = {};
        }
        for (let i = 0; i < ids.length; i++) {
            const jsonExists = fs.existsSync("./json/" + ids[i] + ".json");
            console.log("https://e621.net/post/show.json?id=" + ids[i]);
            let json;
            if (!jsonExists) {
                json = await getJSON(baseURL + ids[i]);
                fs.writeFileSync("./json/" + ids[i] + ".json", JSON.stringify(json, null, 4));
                console.log("got json over network");
            }
            else {
                json = JSON.parse(fs.readFileSync("./json/" + ids[i] + ".json"))
                console.log("loaded json");
            }
            if (json.md5 !== undefined) {
                console.log("Already found, skiping");
                finishedIds[json.id] = json.md5;
                continue;
            }
            let finished = false;
            let found = false;
            if (finishedIds[json.id])
                continue;
            let reason;
            while (!finished) {
                opn(openURL + json.id);
                let input = readline.question("Enter new md5: ");
                if (input === "skip") {
                    console.log("no source found, skipping");
                    reason = "notfound"
                    finished = true;
                }
                else if (input === "exit") {
                    console.log("writing file and exiting");
                    fs.writeFileSync("./finished.json", JSON.stringify(finishedIds, null, 4));
                    process.exit(0);
                }

                else if (input.length !== 32)
                    console.log("Hash not 32 chars long, try again");
                else {
                    finished = true;
                    found = true;

                    let goodExt = false;
                    let ext;
                    while (!goodExt) {
                        ext = readline.question("Enter file extension: ");
                        if (validExtension(ext))
                            goodExt = true;
                    }
                    json.md5 = input.toLowerCase();
                    reason = json.md5;
                    json.file_ext = ext;
                }
            }
            if (found) {
                fs.writeFileSync("./json/" + ids[i] + ".json", JSON.stringify(json, null, 4));
                console.log("modified json with md5 property");
            }
            finishedIds[json.id] = reason;
            fs.writeFileSync("./finished.json", JSON.stringify(finishedIds, null, 4));
        }
        page++;
    }
}

//main();
auto();

async function auto() {

    let finishedIds;
    let alreadyTried;
    try {
        finishedIds = JSON.parse(fs.readFileSync("./finished.json"));
    }
    catch (e) {
        finishedIds = {};
    }
    try {
        alreadyTried = JSON.parse(fs.readFileSync("./alreadytried.json"));
    }
    catch (e) {
        alreadyTried = {};
    }
    const first = await getJSON("https://e621.net/post/index.json?limit=1");
    let beforeID = alreadyTried.last ? alreadyTried.last : first[0].id;
    let previous;
    while (beforeID > 0) {

        if (previous === beforeID)
            break;
        previous = beforeID;
        const html = await getText(craftLink2(beforeID, 320));
        console.log("beforeID " + beforeID);
        const ids = getIdsFromHTML(html);

        for (let i = 0; i < ids.length; i++) {
            console.log("https://e621.net/post/show/" + ids[i]);
            alreadyTried.last = parseInt(ids[i]) + 1;
            const jsonExists = fs.existsSync("./json/" + ids[i] + ".json");
            let json;
            if (!jsonExists) {
                json = await getJSON(baseURL + ids[i]);
                fs.writeFileSync("./json/" + ids[i] + ".json", JSON.stringify(json, null, 4));
            }
            else {
                json = JSON.parse(fs.readFileSync("./json/" + ids[i] + ".json"))
            }
            if (json.md5) {
                console.log("Already found, skipping..");
                alreadyTried[json.id] = json.md5;
                continue;
            }
            let finished = false;
            let found = false;
            if (alreadyTried[json.id]) {
                console.log("Already tried, skipping..");
                continue;
            }


            const sources = await getSourcesFromId(json.id);
            let gotit = false;
            let reason;

            for (let j = 0; j < sources.length; j++) {
                let url;
                let ext;
                sources[j] = sources[j].replace("\r\n", "").replace("\n", "").replace("\r", "");
                try {
                    ext = sources[j].substr(sources[j].lastIndexOf('.') + 1).split(":")[0];
                } catch (e) { }
                if (validExtension(ext))
                    url = sources[j];
                else if (sources[j].includes("furaffinity.net/user/"))
                    continue;
                else if (sources[j].includes("furaffinity.net/view/") || sources[j].includes("furaffinity.net/full/"))
                    url = await getDirectDownloadLinkFurAffinity(sources[j]);
                else if (sources[j].includes("inkbunny.net/submissionview.php?id=") || sources[j].includes("inkbunny.net/s/"))
                    url = await getDirectDownloadLinkFromInkbunny(sources[j]);
                else if (sources[j].includes("weasyl.com/submission"))
                    url = await getDirectDownloadLinkFromWeasyl(sources[j]);
                else if (sources[j].includes("twitter.com") && sources[j].includes("status"))
                    url = await getDirectDownloadLinkFromTwitter(sources[j]);
                else if (sources[j].includes("www.sofurry.com/view/") || sources[j].includes("sofurryfiles.com/std/"))
                    url = "https://www.sofurryfiles.com/std/content?page=" + sources[j].match(/\d+/g).map(Number)[0];
                else if (sources[j].includes("pixiv.net/member_illust.php?mode="))
                    url = await getDirectDownloadLinkFromPixiv(sources[j]);
                else if (sources[j].includes("gfycat.com/") && sources[j].split("gfycat.com/")[1].split("/").length === 1)
                    url = "https://giant.gfycat.com/" + sources[j].split("gfycat.com/")[1] + ".webm";
                else if (sources[j].includes("deviantart.com/art/"))
                    url = await getDirectDownloadLinkFromDevinantArt(sources[j]);
                else if (sources[j].includes("tumblr.com/post/")) {
                    url = await getDirectDownloadLinkFromTumblr(sources[j]);
                    if (url !== undefined)//gets matched by first filter by watching ext at the end
                        sources.push(url.replace(/..\.media\.tumblr\.com/i, "s3.amazonaws.com/data.tumblr.com").replace(/_1280h*|_540h*|_500h*|_400h*|_250h*|_100h*/i, "_raw"));
                }
                else {
                    console.log("Skipping: " + sources[j]);
                    continue;
                }

                if (url === undefined) {
                    console.log(sources[j] + " no download link found, probably deleted");
                    continue;
                }
                console.log("Downloading " + url);
                if (!url.startsWith("https://") && !url.startsWith("http://"))
                    url = "https://" + url;
                const binary = await getBinary(url);
                if (binary === undefined) {
                    console.log("binary is undefined, " + sources[j] + " " + url);
                    continue;
                }
                else if (binary === "tryagain") {
                    console.log("Timeout, trying again...");
                    j--;
                    continue;
                }

                const hash = await getFileMD5(binary);
                let newJson = await getJSON("https://e621.net/post/show.json?md5=" + hash);
                if (Object.keys(newJson).length === 0) {
                    console.log("invalid hash " + hash);
                    continue;
                }
                if (!newJson.id) {
                    console.log("No id? " + json);
                    continue;
                }
                if (newJson.id != json.id) {
                    console.log("Id doens't equal original: " + ids[i] + " vs " + newJson.id);
                    continue;
                }
                console.log("Found original image with md5: " + hash + " id: " + ids[i] + " from: " + url + (url === sources[j] ? "" : " (" + sources[j] + ")"));
                json.md5 = hash;
                json.file_ext = url.substr(url.lastIndexOf('.') + 1).split(":")[0];
                if (!(json.file_ext === "png" || json.file_ext === "jpg" || json.file_ext === "gif" || json.file_ext === "webm" || json.file_ext === "swf")) {
                    console.log("Got right md5, but file extension messed up")
                    continue;
                }
                fs.writeFileSync("./json/" + ids[i] + ".json", JSON.stringify(json, null, 4));
                fs.writeFileSync("./downloaded/" + hash + "." + json.file_ext, binary, "binary");
                finishedIds[json.id] = hash;
                fs.writeFileSync("./finished.json", JSON.stringify(finishedIds, null, 4));
                console.log("Modified json with md5 property");
                gotit = true;
                j = sources.length;

            }
            if (!gotit) {
                if (sources.length === 0)
                    console.log("No sources found");
                alreadyTried[ids[i]] = sources.length === 0 ? "nosources" : "tried";
                fs.writeFileSync("./alreadytried.json", JSON.stringify(alreadyTried, null, 4));
            }
            else {
                alreadyTried[ids[i]] = json.md5;
                fs.writeFileSync("./alreadytried.json", JSON.stringify(alreadyTried, null, 4));
            }

        }
        beforeID = ids[ids.length - 1];
    }
}

function craftLink(page) {
    return "https://e621.net/post/index/" + page + "/status:deleted%20order:score";
}

function craftLink2(beforeID, limit) {
    return "https://e621.net/post?before_id=" + beforeID + "&tags=status%3Adeleted&limit=" + limit;
}

function getIdsFromHTML(html) {
    const regex = /class="thumb" id="p([0-9]+)"/g;
    let m;
    let results = [];
    while ((m = regex.exec(html)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            if (groupIndex === 1)
                results.push(match);
        });
    }
    return results;
}

async function getText(url) {
    let text = await getURL(url, "utf8");
    while (text === undefined)
        text = await getURL(url, "utf8");
    return text;
}
function getURL(url, formating) {
    return new Promise(function (resolve, reject) {
        //After 3 minutes, return undefined, probably didn't work
        let buffer = [];
        request.get({
            url: url, headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Encoding": "null",
                "Accept-Language": "en-US,en;q=0.5",
                "Cache-Control": "max-age=0",
                "Connection": "keep-alive",
                "Cookie": secrets.e621webcookie,
                "Host": "e621.net",
                "Upgrade-Insecure-Requests": "1",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0"
            }, encoding: formating
        }, (error, response, body) => {
            if (error)
                resolve(undefined)
            resolve(body);
        });
    });
}

async function getBinary(url) {
    return new Promise(async function (resolve, reject) {
        let r;
        const timer = setTimeout(() => {
            resolve("tryagain");
            r.abort();
        }, 150000);
        r = request.get({
            url: url, encoding: "binary"
        }, (error, response, body) => {
            clearTimeout(timer);
            resolve(body);
        });
    });
}

async function getFileMD5(file) {
    return new Promise(async (resolve, reject) => {
        var fd = fs.createReadStream(files[number]);
        var hash = crypto.createHash('md5');
        hash.setEncoding('hex');
        fd.on('end', function () {
            resolve(hash.end());
        });
        fd.pipe(hash);
    });
}

function getDirectDownloadLinkGeneric(url, regex, header, exceptions) {
    if (typeof exceptions === "string") {
        const temp = exceptions;
        exceptions = [];
        exceptions.push(temp);
    }
    else if (typeof exceptions === "undefined")
        exceptions = [];
    header["Accept-Encoding"] = "null";

    return new Promise(function (resolve, reject) {
        //After 3 minutes, return undefined, probably didn't work
        request.get({
            url: url, headers: header, encoding: "utf8"
        }, (error, response, body) => {
            let m;
            let results = [];
            while ((m = regex.exec(body)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }

                // The result can be accessed through the `m`-variable.
                m.forEach((match, groupIndex) => {
                    if (groupIndex === 1) {
                        resolve(exceptions.includes(match) ? undefined : match);
                        return;
                    }
                });
            }
            resolve(undefined);
        });
    });
}


async function getDirectDownloadLinkFurAffinity(url) {
    const regex = /\+Add to Favorites<\/a><\/b> \|[ \s]*<b><a href="\/\/([\s\S]*?)"/g;
    const headers = {
        "Cookie": secrets.furaffinitywebcookie
    }
    return await getDirectDownloadLinkGeneric(url, regex, headers);
}

async function getDirectDownloadLinkFromInkbunny(url) {
    const regex = /(https:\/\/nl\.ib\.metapix\.net\/files\/full\/[\s\S]*?)("|')/g;
    const headers = {
        "Cookie": secrets.inkbunnywebcookie
    }
    return await getDirectDownloadLinkGeneric(url, regex, headers);
}

async function getDirectDownloadLinkFromWeasyl(url) {
    const regex = /(cdn\.weasyl\.com\/static\/media[\s\S]*?)"/g;
    const headers = {
        "Cookie": secrets.weasylwebcookie
    }
    return await getDirectDownloadLinkGeneric(url, regex, headers);
}

async function getDirectDownloadLinkFromTwitter(url) {
    const regex = /og:image" content="([\s\S]*?)"/g;
    const headers = {};
    return await getDirectDownloadLinkGeneric(url, regex, headers);
}

async function getDirectDownloadLinkFromPixiv(url) {
    const regex = /data-src="([\s\S]*?)"/g;
    const headers = {
        "Cookie": secrets.pixivwebcookie
    }
    return await getDirectDownloadLinkGeneric(url, regex, headers);
}

async function getDirectDownloadLinkFromDevinantArt(url) {
    const regex = /og:image" content="([\s\S]*?)"/g;
    const headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Pragma": "no-cache",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0"
    }
    return await getDirectDownloadLinkGeneric(url, regex, headers);
}

async function getDirectDownloadLinkFromReddit(url) {
    const regex = /<meta property="og:image" content="([\s\S]*?)"/g;
    const headers = {};
    return await getDirectDownloadLinkGeneric(url, regex, headers);
}

async function getDirectDownloadLinkFromTumblr(url) {
    const regex = /og:image" content="([\s\S]*?)"/g;
    const headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Cookie": secrets.tumblrwebcookie,
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0"
    }
    const exceptions = [];
    exceptions.push("https://assets.tumblr.com/images/og/fb_landscape_share.png");
    exceptions.push("http://assets.tumblr.com/images/og/fb_landscape_share.png");
    return await getDirectDownloadLinkGeneric(url, regex, headers, exceptions);
}

async function getJSON(url) {
    let json = await getURL2(url, "utf8");
    while (json === undefined)
        json = await getURL2(url, "utf8");
    return JSON.parse(json);
}

function getURL2(url, formating, line) {
    return new Promise(function (resolve, reject) {
        //After 3 minutes, return undefined, probably didn't work
        const timer = setTimeout(() => {
            resolve(undefined);
            r.abort();
        }, 300000);
        try {
            r = request.get({ url: url, headers: { "User-Agent": "mirror" }, encoding: "utf8" }, async (error, response, body) => {
                if (error) {
                    clearTimeout(timer);
                    resolve(undefined);
                }
                else if (response.statusCode >= 500 && response.statusCode < 600) {
                    clearTimeout(timer);
                    resolve(undefined);
                }
                else {
                    if (response.statusCode !== 200 && response.statusCode !== 404) {
                        clearTimeout(timer);
                        resolve(undefined);
                    }
                    else {
                        clearTimeout(timer);
                        resolve(body);
                    }
                }
            });
        }
        catch (e) {
            clearTimeout(timer);
            resolve(undefined);
        }
    });
}

async function getSourcesFromId(id) {
    let html = await getURL2(openURL + id);
    let string;
    const regex = /<div class='sourcelink-url'>([\s\S]*?)<\/div/g;
    let m;
    let results = [];
    while ((m = regex.exec(html)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            if (groupIndex === 1)
                string = match;
        });
    }
    const hrefs = string ? string.split("a href=\"") : [];
    for (let i = 1; i < hrefs.length; i++)
        results.push(hrefs[i].split("\"")[0]);
    return results;
}

function validExtension(ext) {
    ext = ext.toLowerCase()
    return ext === "png" || ext === "jpg" || ext === "gif" || ext === "webm" || ext === "swf";
}