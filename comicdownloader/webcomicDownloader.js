const fs = require("fs");
const comicClass = require("./comic.js");

const downloadFolder = "/media/earlopain/plex/plexmedia/Pictures/Webcomics";

const availableParsers = fs.readdirSync(__dirname + "/parser/custom");

const compiledParser = [];

const options = { "updateOnly" : true, "downloadFolder" : downloadFolder, "startFromBeginning" : false};

for (const parserFile of availableParsers) {
    const parser = require(__dirname + "/parser/custom/" + parserFile)
    compiledParser[parser.shortName] = parser;
}

const downloadThese = ["lackadaisy"];

async function main() {
    for (const comic of downloadThese) {
        const parser = compiledParser[comic];
        if (parser === undefined) {
            console.log("Comic " + comic + " has no parser");
            continue;
        }
        const webcomic = new comicClass.WebComic(parser, options);
        await webcomic.download();
    }
}

main();