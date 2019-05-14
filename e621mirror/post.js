const EventEmitter = require('events');
const network = require("./network.js");
const fs = require("fs");
const util = require("./util.js");
const terminal = require("./terminal.js");

const baseURL = "https://e621.net/post/show.json?id=";

class PostDownloader extends EventEmitter {

    constructor(beginning, end, step) {
        super();
        this.exit = false;
        this.beginning = beginning;
        this.end = end;
        this.step = step;
        this.start();
    }

    async start() {
        main:
        for (let i = this.beginning; i >= this.end; i -= this.step) {
            try {
                if (this.exit) {
                    this.emit("stop");
                    return;
                }

                if (await util.alreadyFinished(i))
                    continue;
                let line = new terminal.Line(i + " getting ");
                let stats = await downloadPost(i, line);
                while (stats === undefined) {
                    line.update(i + " Stuck in async, trying again");
                    await util.sleep(1000);
                    stats = await downloadPost(i, line);
                }
                if (stats.status === "destroyed")
                    this.emit("destroyed", i, line);
                else if (stats.status === "deleted")
                    this.emit("deleted", i, line);
                else
                    this.emit("active", i, stats.fileSize, line);
            }
            catch (e) {
                terminal.log(e);
                i += this.step;
            }
        }
        this.exit = true;
    }
    stop() {
        if (this.exit)
            this.emit("stop");
        this.exit = true;
    }
}

/**
 * Downloads the json and the coresponding file into their respective folder
 * @param {Number} id 
* @returns The filesize of the imagefile downloaded
 */
async function downloadPost(id, line) {
    const timer = setTimeout(() => {
        return undefined;
    }, 300000);
    line.prefix = line.getText();
    line.id = id;
    const json = await network.getJSON(baseURL + id, line);
    line.update(line.getText() + " got json");
    line.maxSize = json.file_size ? json.file_size : 0;
    if (json.id !== undefined)
        fs.writeFileSync("./json/" + id + ".json", JSON.stringify(json, null, 4));
    const downloadImage = json.file_url && !json.file_url.startsWith("/");
    if (downloadImage) {
		const path = "./files/" + json.md5.substr(0,2) + "/" + json.md5.substr(2,2) + "/" + json.md5 + "." + json.file_ext;
        fs.writeFileSync(path, await network.getBinary(json.file_url, line), "binary");
        const file = fs.statSync(path);
        fileSize = file.size;
    }
    clearTimeout(timer);
    return { fileSize: line.maxSize, status: Object.keys(json).length === 0 ? "destroyed" : downloadImage ? "active" : "deleted" };
}

/**
 * Latest postid, to know when to stop
 * @returns Promise: The postid from the newest post
 */
async function getLatestPostId() {
    const url = "https://e621.net/post/index.json?limit=1";
    const json = await network.getJSON(url);
    return json[0].id;
}

exports.PostDownloader = PostDownloader;
exports.downloadPost = downloadPost;
exports.getLatestPostId = getLatestPostId;