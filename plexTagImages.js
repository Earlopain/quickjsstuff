const request = require("request");
const fs = require("fs");

const server = "http://192.168.178.97:32400";
const plexToken = "fpJx4zeYwyou3KWv4BNX";
const sectionName = "e621explicit";

const localTagCutoff = 10;       //How often does it have to appear locally
const tagOverwrites = { "cuntboy": "andromorph", "dickgirl": "gynomorph" };
//works like on e6, probably
if (!fs.existsSync(__dirname + "/e621posts"))
    fs.mkdirSync(__dirname + "/e621posts")

async function main() {
    let plexServer = new PlexServer(server, plexToken);
    const sectionID = await plexServer.sectionNameToKey(sectionName);

    let previousFileKeys = fs.existsSync(__dirname + "/previousFiles.json") ? JSON.parse(fs.readFileSync(__dirname + "/previousFiles.json", "utf8")) : [];
    let currentFiles = (await plexServer.getAllFromSectionID(sectionID)).files;
    if (previousFileKeys.length === currentFiles.length)
        return;
    let newFiles = [];
    for (const file of currentFiles) {
        if (!previousFileKeys.includes(file.key))
            newFiles.push(file);
    }
    console.log((currentFiles.length - previousFileKeys.length) + " new Files found, tagging...");
    const allowedTags = await getTagFilter(currentFiles);
    for (const file of newFiles) {
        if (file.title.length !== 32) {
            console.log("Key: " + file.key + "  Title: " + file.title + " File: " + 2);
            continue;
        }
        const postJson = await getE621Json(file.title);
        if (postJson.id === undefined) {
            continue;
        }
        let tags = prepareTagArray([].concat.apply([], Object.values(postJson.tags)));
        tags = tags.filter(tag => allowedTags.indexOf(tag) !== -1);
        const originalFileTags = await file.getAllTags();
        if (originalFileTags.length !== 0)
            continue;
        await file.addTags(tags);
    }
    fs.writeFileSync(__dirname + "/previousFiles.json", JSON.stringify(previousFileKeys.concat(newFiles.map(e => e.key))), "utf8");
}

let tagCounter = {};
let tagOverwriteKeys = Object.keys(tagOverwrites)
async function getTagFilter(files) {
    let filter = [];
    for (let i = 0; i < files.length; i++) {
        const postJson = await getE621Json(files[i].title);
        if (postJson.id === undefined) {
            continue;
        }
        const tags = prepareTagArray([].concat.apply([], Object.values(postJson.tags)));
        for (let tagName of tags) {
            tagCounter[tagName] = tagCounter[tagName] === undefined ? 1 : tagCounter[tagName] + 1;
        }
    }
    for (const key of Object.keys(tagCounter)) {
        if (tagCounter[key] >= localTagCutoff) {
            filter.push(key);
        }
    }
    console.log("Total tags: " + Object.keys(tagCounter).length + " Left: " + filter.length);
    return filter;
}

async function getE621Json(md5) {
    if (fs.existsSync(__dirname + "/e621posts/" + md5 + ".json"))
        return JSON.parse(fs.readFileSync(__dirname + "/e621posts/" + md5 + ".json"));

    const result = await getJSON("https://e621.net/posts.json?tags=status:any%20md5:" + md5);
    const json = result.posts.length === 0 ? [] : result.posts[0];
    fs.writeFileSync(__dirname + "/e621posts/" + md5 + ".json", JSON.stringify(json, null, 4));
    return json;
}

function prepareTagArray(array) {
    array = array.map(tag => {
        for (const key of tagOverwriteKeys) {
            tag = tag.replace(new RegExp(tagOverwrites[key], "g"), key);
        }
        return tag;
    });
    return array;
}

function getJSON(url, itteration) {
    if (itteration > 5) {
        console.log("Error: " + url);
        console.log("Check plex token, internet or e6 , then continue");
        debugger;
    }
    return new Promise(resolve => {
        request.get({
            uri: url, headers: {
                "Accept": "application/json",   //would otherwise result in malfored requests
                "User-Agent": "tagger"
            }
        }, async (error, response, body) => {
            try {
                resolve(JSON.parse(body));
            }
            catch (e) {
                const json = await getJSON(url, itteration === undefined ? 2 : itteration + 1);
                resolve(json);
            }
        });
    });
}

class PlexGenericFile {
    constructor(data, sectionID, server) {
        if (!sectionID || !server)
            throw new Error("Forgot to put section id/server");
        this.addedAt = data.addedAt === undefined ? -1 : data.addedAt;
        this.updatedAt = data.updatedAt === undefined ? -1 : data.updatedAt;
        this.key = data.ratingKey === undefined ? data.key : data.ratingKey;
        this.title = data.title ? data.title : data.title2;
        this.sectionID = sectionID;
        this.thumbpath = data.thumb;
        this.server = server;
        valueCheck(this);
    }

    async getThumbnail(x, y) {
        let undefCount = 0;
        undefCount += x === undefined;
        undefCount += y === undefined;
        if (undefCount === 1)
            throw new Error("Either specify none or both values");
        if (undefCount === 2)
            return await this.server.request(this.thumbpath, "GET");
        return await this.server.request("/photo/: /transcode?width=" + x + "&height=" + y + "&minSize=1&url=" + this.thumbpath, "GET");
    }

    async addTags(tagarray) {
        let tagString = "";
        tagarray.forEach((tag, index) => {
            tagString += "tag[" + index + "].tag.tag=" + encodeURIComponent(tag.replace(/_/g, " ")) + "&";
        });
        tagString = tagString.slice(0, -1);
        await this.server.request("/library/sections/" + this.sectionID + "/all?type=13&id=" + this.key + "&" + tagString, "PUT");
    }

    async setTags(tagarray) {
        await removeAllTags();
        let tagString = "";
        tagarray.forEach((tag, index) => {
            tagString += "tag[" + index + "].tag.tag=" + encodeURIComponent(tag.replace(/_/g, " ")) + "&";
        });
        tagString = tagString.slice(0, -1);
        await this.server.request("/library/sections/" + this.sectionID + "/all?type=13&id=" + this.key + "&" + tagString, "PUT");
    }

    async removeTags(tagarray) {
        let tagString = "tag[].tag.tag-=";
        tagarray.forEach((tag) => {
            tagString += encodeURIComponent(tag.replace(/_/g, " ")) + ",";
        });
        await this.server.request("/library/sections/" + this.sectionID + "/all?type=12,13&id=" + this.key + "&" + tagString, "PUT");
    }

    async getAllTags() {
        const json = await this.getMetadata();
        if (!json.MediaContainer.Metadata[0].Tag)
            return [];
        return json.MediaContainer.Metadata[0].Tag.map(element => { return element.tag })
    }
    async removeAllTags() {
        const removeThis = await this.getAllTags();
        await this.removeTags(removeThis)
    }

    async getMetadata() {
        return await this.server.request("/library/metadata/" + this.key, "GET");
    }
}

class PlexFileContent extends PlexGenericFile {
    constructor(data, sectionID, server) {
        super(data, sectionID, server);
        this.filepath = data.Media[0].Part[0].key;
        this.filesize = data.Media[0].Part[0].size;
    }
}

class PlexPicture extends PlexFileContent {
    constructor(data, sectionID, server) {
        super(data, sectionID, server);
        this.height = data.Media[0].height;
        this.width = data.Media[0].width;
        valueCheck(this);
    }
}

class PlexSection {
    constructor(json, server) {
        if (!server)
            throw new Error("Forgot to put server");
        return new Promise(async resolve => {
            this.title = json.MediaContainer.librarySectionTitle;
            this.id = json.MediaContainer.librarySectionID;
            this.size = json.MediaContainer.size;
            this.type = json.MediaContainer.viewGroup;
            this.files = [];
            this.server = server;
            switch (this.type) {
                case "photo":
                    for (const file of json.MediaContainer.Metadata) {
                        this.files.push(new PlexPicture(file, this.id, server));
                    }
                    break;
                default:
                    break;
            }
            valueCheck(this);
            resolve(this);
        })

    }
}

class PlexServer {
    constructor(server, token) {
        this.server = server;
        this.token = token;
    }

    request(url, method) {
        if (!method)
            method = "GET";
        method = method.toUpperCase();
        if (!url.includes("?"))
            url = this.server + url + "?X-Plex-Token=" + this.token;
        else
            url = this.server + url + "&X-Plex-Token=" + this.token;
        return new Promise(resolve => {
            request({
                method: method, uri: url, headers: {
                    "Accept": "application/json"                   //would otherwise result in malfored requests
                }
            }, (error, response, body) => {
                if (response.statusCode === 401)
                    throw new Error("Check Plex Token");
                if (method === "PUT" && body !== "")
                    debugger;
                try {
                    resolve(JSON.parse(body));
                }
                catch (e) {
                    resolve(body)
                }

            });
        });
    }

    async sectionNameToKey(string) {
        const json = await this.request("/library/sections");
        for (const dir of json.MediaContainer.Directory) {
            if (dir.title === string)
                return dir.key;
        }
        throw new Error("Section not found");
    }

    async getAllFromSectionID(section) {
        let json = await this.request("/library/sections/" + section + "/all", "GET");
        return await new PlexSection(json, this);
    }
}

function valueCheck(that) {
    for (const key of Object.keys(that)) {
        if (key === "thumbpath" && that[key] === undefined) {
            that[key] = "/";        //TODO find blank image
        }
    }
}

main();
