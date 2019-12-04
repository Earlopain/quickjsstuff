const request = require("request");
const fs = require("fs");

const server = "http://192.168.178.97:32400";
const secrets = JSON.parse(fs.readFileSync("./secrets.json"));
const plexToken = secrets.plexservertoken;
const sectionName = "e621";

const onlineTagCutoff = 30;     //If the tag has less than this many entries, don't send it to the server
const localTagCutoff = 5;       //How often does it have to appear locally
const tagWhitelist = [];        //Those will not be filtered regardless of the above,
const tagOverwrites = { "cuntboy": "andromorph", "dickgirl": "gynomorph" };
//works like on e6, probably
if (!fs.existsSync(__dirname + "/previousFiles.txt"))
    fs.writeFileSync(__dirname + "/previousFiles.txt", "", "utf8")
if (!fs.existsSync(__dirname + "/e621posts"))
    fs.mkdirSync(__dirname + "/e621posts")
if (!fs.existsSync(__dirname + "/e621tags"))
    fs.mkdirSync(__dirname + "/e621tags")
async function main() {
    let plexServer = new PlexServer(server, plexToken);
    const sectionID = await plexServer.sectionNameToKey(sectionName);

    let previousFileKeys = fs.readFileSync(__dirname + "/previousFiles.txt", "utf8").split("\n");
    previousFileKeys.pop();
    let currentFiles = (await plexServer.getAllFromSectionID(sectionID)).files;
    if (previousFileKeys.length === currentFiles.length)
        return;
    let newFiles = [];
    for (const file of currentFiles) {
        if (!previousFileKeys.includes(file.key))
            newFiles.push(file);
    }
    console.log((currentFiles.length - previousFileKeys.length) + " new Files found, tagging...");
    const tagFilter = await getTagFilter(currentFiles);
    for (const file of newFiles) {
        if (file.title.length !== 32) {
            console.log("Key: " + file.key + "  Title: " + file.title + " File: " + 2);
            continue;
        }
        const e621json = await getE621Json(file.title);
        let tags = e621json.tags.split(" ").filter(tag => tagFilter.indexOf(tag) === -1);
        tags = prepareTagArray(tags);
        const originalFileTags = await file.getAllTags();
        if (originalFileTags.length !== 0)
            continue;
        await file.addTags(tags);
    }
    fs.appendFileSync(__dirname + "/previousFiles.txt", newFiles.map(file => file.key).join("\n") + "\n", "utf8")
}

let localTagCount = {};
let onlineTagCount = {};
let tagOverwriteKeys = Object.keys(tagOverwrites)
async function getTagFilter(files) {
    let filter = [];
    for (let i = 0; i < files.length; i++) {
        const postJson = await getE621Json(files[i].title);
        const tags = prepareTagArray(postJson.tags.split(" "));
        for (let onlineTagName of tags) {
            let offlineTagName = onlineTagName;
            for (const key of tagOverwriteKeys) {
                offlineTagName = offlineTagName.replace(new RegExp(tagOverwrites[key], "g"), key);
            }
            let isWhitelisted = false;
            for (const whitelisted of tagWhitelist) {
                if (new RegExp("^" + whitelisted.split("*").join(".*") + "$").test(offlineTagName))
                    isWhitelisted = true;
            }
            if (isWhitelisted)
                continue;
            if (onlineTagCount[offlineTagName] === undefined) {
                let json = getTagFromFile(offlineTagName);
                if (json === undefined) {
                    const url = "https://e621.net/tag/index.json?show_empty_tags=1&name=" + onlineTagName;
                    json = await getJSON(url);
                    saveTagToFile(offlineTagName, json);
                }
                if (!json[0] || json[1] || !(escapeTag(json[0].name) === offlineTagName || escapeTag(json[0].name) === onlineTagName)) {
                    console.log("Unexpected output for " + onlineTagName);
                    continue;
                }
                onlineTagCount[onlineTagName] = json[0].count;
            }
            localTagCount[offlineTagName] = localTagCount[offlineTagName] === undefined ? 1 : localTagCount[offlineTagName] + 1;
        }
    }
    for (const key of Object.keys(localTagCount)) {
        const a = localTagCount[key];
        if (localTagCount[key] < localTagCutoff)
            filter.push(key);
    }
    for (const key of Object.keys(onlineTagCount)) {      //ignore tags with 0 count, probably dnp
        if (onlineTagCount[key] < onlineTagCutoff && onlineTagCount[key] !== 0 && filter.indexOf(key) === -1)
            filter.push(key);
    }
    console.log("Total: " + Object.keys(localTagCount).length + " Left: " + (Object.keys(localTagCount).length + tagWhitelist.length - filter.length));
    return filter;
}

async function getE621Json(md5) {
    if (fs.existsSync(__dirname + "/e621posts/" + md5 + ".json"))
        return JSON.parse(fs.readFileSync(__dirname + "/e621posts/" + md5 + ".json"));

    const json = await getJSON("https://e621.net/post/show.json?md5=" + md5);
    fs.writeFileSync(__dirname + "/e621posts/" + md5 + ".json", JSON.stringify(json, null, 4));
    return json;
}

function prepareTagArray(array) {
    array = array.map(tag => escapeTag(tag))
    array = array.filter(tag => /^[\x00-\x25\x27-\x3a\x3c-\x7F]*$/.test(tag)).map(tag => {
        for (const key of tagOverwriteKeys) {
            tag = tag.replace(new RegExp(tagOverwrites[key], "g"), key);
        }
        return tag;
    });//allow only ascii minus & ; => no problems with wierd url chars, also overwrite tag if spefified
    return array;
}

function escapeTag(tag) {
    return tag.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
}

function getTagFromFile(tag) {
    tag = tag.replace(/\//g, "*");
    if (!fs.existsSync(__dirname + "/e621tags/" + tag + ".json"))
        return undefined;
    return JSON.parse(fs.readFileSync(__dirname + "/e621tags/" + tag + ".json"));
}

function saveTagToFile(tag, json) {
    tag = tag.replace(/\//g, "*");
    fs.writeFileSync(__dirname + "/e621tags/" + tag + ".json", JSON.stringify(json, null, 4));
}

function getJSON(url, itteration) {
    if (itteration > 5) {
        console.log("Error: " + url);
        console.log("Check plex token, internet or e6 , then continue");
        debugger;
    }
    return new Promise(resolve => {
        request.get({
            uri: encodeURI(url), headers: {     //enocdeURI takes care of chars like é which
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
            tagString += "tag[" + index + "].tag.tag=" + tag.replace(/_/g, " ") + "&";
        });
        tagString = tagString.slice(0, -1);
        await this.server.request("/library/sections/" + this.sectionID + "/all?type=13&id=" + this.key + "&" + tagString, "PUT");
    }

    async setTags(tagarray) {
        await removeAllTags();
        let tagString = "";
        tagarray.forEach((tag, index) => {
            tagString += "tag[" + index + "].tag.tag=" + tag.replace(/_/g, " ") + "&";
        });
        tagString = tagString.slice(0, -1);
        await this.server.request("/library/sections/" + this.sectionID + "/all?type=13&id=" + this.key + "&" + tagString, "PUT");
    }

    async removeTags(tagarray) {
        let tagString = "tag[].tag.tag-=";
        tagarray.forEach((tag, index) => {
            tagString += tag.replace(/_/g, " ") + ",";
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

class PlexAlbum extends PlexGenericFile {
    constructor(data, sectionID, server) {
        super(data, sectionID, server);
        this.songs = [];
        return new Promise(async resolve => {
            this.artist = data.parentTitle;
            const json = await server.request("/library/metadata/" + this.key + "/children");
            for (const song of json.MediaContainer.Metadata) {
                this.songs.push(new PlexSong(song, this.sectionID, this.server));
            }


            valueCheck(this);

            resolve(this);
        })
    }

    static async getAlbumsFromArtistData(data, sectionID, server) {
        let result = [];
        const allAlbums = await server.request("/library/metadata/" + data.key + "/children");
        for (const album of allAlbums.MediaContainer.Metadata) {
            result.push(await new PlexAlbum(album, sectionID, server))
        }
        return result;

    }
}

class PlexArtist extends PlexGenericFile {
    constructor(data, sectionID, server) {
        super(data, sectionID, server);
        this.genres = [];
        if (!data.Genre)
            this.genres = [];
        else {
            for (const genre of data.Genre) {
                this.genres.push(genre.tag);
            }
        }

        return new Promise(async resolve => {
            const data = await this.server.request("/library/metadata/" + this.key + "/children");
            this.albums = await PlexAlbum.getAlbumsFromArtistData(data.MediaContainer, this.sectionID, this.server);
            valueCheck(this);

            resolve(this);
        })
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

    async getImage(x, y) {
        let undefCount = 0;
        undefCount += x === undefined;
        undefCount += y === undefined;
        if (undefCount === 1)
            throw new Error("Either specify none or both values");
        if (undefCount === 2)
            return await this.server.request(this.filepath, "GET");
        return await this.server.request("/photo/: /transcode?width=" + x + "&height=" + y + "&minSize=1&url=" + this.filepath, "GET");
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
                case "artist":
                    for (const file of json.MediaContainer.Metadata) {
                        this.files.push(await new PlexArtist(file, this.id, server));
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
                method: method, uri: encodeURI(url), headers: {     //enocdeURI takes care of chars like é which
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

class PlexSong extends PlexFileContent {
    constructor(data, sectionID, server) {
        super(data, sectionID, server);
        this.duration = data.duration;
        this.filepath = data.Media[0].Part[0].key;
        this.filesize = data.Media[0].Part[0].size;
        
        valueCheck(this);
    }
}

function valueCheck(that) {
    for (const key of Object.keys(that)) {
        if (key === "thumbpath" && that[key] === undefined)
            that[key] = "/";        //TODO find blank image
        if (that[key] === undefined)
            debugger;
    }
}

main();
