const EventEmitter = require('events');
const network = require("./network.js");
const fs = require("fs");
const util = require("./util.js");
const post = require("./post.js");
const terminal = require("./terminal.js");
const exclude = fs.readFileSync("./excludes.txt", "utf8").toString().split(",");
console.log(exclude.length);

class SavePosts extends EventEmitter {
    constructor() {
        super();
        this.exit = false;
        this.start();
    }
    async start() {
        while (true) {
            const json = await network.getJSON("https://e621.net/post/index.json?tags=status:flagged&limit=320");
            if (this.exit) {
                this.emit("stop");
                return;
            }
            for (let i = 0; i < json.length; i++) {
                try {
                    if (!exclude.includes(json[i].id) && !await util.alreadyFinished(json[i].id)) {
                        let line = new terminal.Line(json[i].id + " saving ");
                        let stats = await post.downloadPost(json[i].id, line);
                        while (stats === undefined) {
                            line.update(json[i].id + " Stuck in async, trying again");
                            await util.sleep(1000);
                            stats = await post.downloadPost(json[i].id, line);
                        }
                        this.emit("saved", json[i].id, stats.fileSize, line);
                    }
                } catch (e) {
                    terminal.log(e);
                    i--
                }

            }
            await util.sleep(30000);
        }
    }
    stop() {
        this.exit = true;
    }
}

exports.SavePosts = SavePosts;
