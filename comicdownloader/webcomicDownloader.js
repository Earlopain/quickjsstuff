const fs = require("fs");
const util = require("./util");
const comicClass = require("./comic");

const downloadFolder = "/media/earlopain/plex/plexmedia/Pictures/Webcomics";

const availableParsers = fs.readdirSync(__dirname + "/parser/custom");

const compiledParser = [];

const options = { "updateOnly": false, "downloadFolder": downloadFolder, "startFromBeginning": true, "continueOnAlreadyDownloaded": false };

for (const parserFile of availableParsers) {
    const parser = require(__dirname + "/parser/custom/" + parserFile);
    parser.filename = parserFile;
    const validity = util.validateParserStatic(parser);
    if (validity !== "") {
        throw new Error(validity);
    }
    compiledParser[parser.shortName] = parser;
}

const downloadThese = ["dkprelude"];

async function main() {
    for (const comic of downloadThese) {
        const Parser = compiledParser[comic];
        if (Parser === undefined) {
            console.log("Comic " + comic + " has no parser");
            continue;
        }
        const parserInstance = new Parser(options);
        parserInstance.filename = Parser.filename;
        const webcomic = new comicClass.WebComic(parserInstance);
        await webcomic.download();
    }
}

main();