const PostDownloader = require("./post.js").PostDownloader;
const GetNewPosts = require("./getnewposts.js").GetNewPosts;
const SavePosts = require("./saveposts.js").SavePosts;
const readline = require('readline');
const util = require("./util.js");
const network = require("./network.js");
const terminal = require("./terminal.js");

let downloader = [];
let finishedCount = 0;

let countDestroyed = 0;
let countDeleted = 0;
let countActive = 0;
let countNew = 0;
let countSaved = 0;
let countTotal = 0
let countTookTooLong = 0;
let countServerFault = 0;
let countConnectionLost;
let first = true;

let startTime = new Date().getTime();

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {
    keyHandler(key);
});

async function keyHandler(key) {
    if (key.ctrl && key.name === "s")
        terminal.log("Missed: " + countActive + " Destroyed: " + countDestroyed + " New: " + countNew +
            "TookToLong: " + countTookTooLong + " Runtime: " + (new Date().getTime() - startTime) / 1000 + "s Serverfault: " + countServerFault);

    else if (key.ctrl && key.name === "c") {
        for (let i = 0; i < downloader.length; i++)
            downloader[i].stop();
        while (finishedCount !== downloader.length)
            await util.sleep(1000);
        process.exit(0);
    }
}

async function start(start, count) {
    let l;
    network.notifier.on("serveroffline", (statuscode, statusmessage) => { terminal.setLastLine("Servers seem to be having problems: " + statuscode + " " + statusmessage); countServerFault++ });
    network.notifier.on("connectionoff", () => { l = terminal.setLastLine("Connection lost"); countConnectionLost++ });
    network.notifier.on("backup", () => { terminal.setLastLine("") });
    //downloader.push(new GetNewPosts());
    downloader.push(new SavePosts());
    for (let i = 0; i < count; i++) {
        downloader.push(new PostDownloader(start - i, 1, count));
    }

    for (let i = 0; i < downloader.length; i++) {
        downloader[i].on("stop", () => { finishedCount++ });
        downloader[i].on("destroyed", (id, line) => { log(id, "destroyed", line); countDestroyed++ });
        downloader[i].on("deleted", (id, line) => { log(id, "deleted", line); countDeleted++ });
        downloader[i].on("active", (id, size, line) => { log(id, "active", line, size); countActive++ });
        downloader[i].on("new", (id, size, line) => { log(id, "new", line, size); countNew++ });
        downloader[i].on("saved", (id, size, line) => { log(id, "saved", line, size); countNew++ });
    }
}

function log(id, status, line, size) {
    countTotal++;
    line.update(id + " " + ((new Date().getTime() - startTime) / countTotal / 1000).toFixed(5).slice(0, 7) + "s " + status + " " + (size ? (size / 1024).toFixed(2) + "kb" : ""));
    line.finalize();
}

start(1508684, 0);
