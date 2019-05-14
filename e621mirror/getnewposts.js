const EventEmitter = require('events');
const network = require("./network.js");
const util = require("./util.js");
const post = require("./post.js");
const terminal = require("./terminal.js");

class GetNewPosts extends EventEmitter {
    constructor() {
        super();
        this.exit = false;
        this.start();
    }
    async start() {
        let start = await util.lastDownloaded();
        while (true) {
            let end = await post.getLatestPostId();
            while (start <= end) {
                try {
                    if (this.exit) {
                        this.emit("stop");
                        return;
                    }
                    let line = new terminal.Line(start + " new ");
                    let stats = await post.downloadPost(start, line);
                    while (stats === undefined) {
                        line.update(start + " Stuck in async, trying again");
                        await util.sleep(1000);
                        stats = await post.downloadPost(start, line);
                    }
                    this.emit("new", start, stats.fileSize, line);
                    start++;

                }
                catch (e) {
                    terminal.log(e.message);
                }
            }
            start = end + 1;
            await util.sleep(60000);
        }
    }
    stop() {
        this.exit = true;
    }
}

exports.GetNewPosts = GetNewPosts;