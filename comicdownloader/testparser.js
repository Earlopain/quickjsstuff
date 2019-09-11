const fs = require("fs");
const request = require("request");
const util = require("./util");

const availableParsers = fs.readdirSync(__dirname + "/parser/custom");
const compiledParser = [];

for (const parserFile of availableParsers) {
    const parser = require(__dirname + "/parser/custom/" + parserFile);
    parser.filename = parserFile;
    const validity = util.validateParserStatic(parser);
    if (validity !== "") {
        throw new Error(validity);
    }
    
    compiledParser[parser.shortName] = parser;
}


async function main() {
    for (const key of Object.keys(compiledParser)) {
        let validity = util.validateParserStatic(compiledParser[key]);
        if (validity !== "") {
            throw new Error(validity);
        }

        const parser = new compiledParser[key]({});   //first page
        validity = util.validateParser(parser);
        if (validity !== "") {
            throw new Error(validity);
        }
        let error = false;
        console.log("Checking " + parser.fullName);

        parser.lastPage = await parser.getActualLastURL();

        if (! await statusOK(parser.mainPage)) {
            error = error("Main page issue, skipping");
            continue;
        }
        if (! await statusOK(parser.firstPage)) {
            error = error("First Page issue");
        }
        if (! await statusOK(parser.lastPage)) {
            error = error("Last Page issue");
        }

        parser.document = (await util.generateDOM(parser.firstPage)).window.document;

        let nextPageURL = parser.getNextPageURL();

        if (!await statusOK(nextPageURL)) {
            error = error("No next page found on first page");
        }
        if (!parser.noPreviousPage()) {
            error = error("Found previous page on first page");
        }

        let imageURL = parser.getImageURL();

        if (imageURL === null) {
            error = error("No image found on first page");
        }

        if (! await statusOK(imageURL)) {
            error = error("First Page image issue");
        }

        parser.document = (await util.generateDOM(parser.lastPage)).window.document;

        nextPageURL = parser.getNextPageURL();
        previousPageURL = parser.getPreviousPageURL();

        if (!parser.noNextPage()) {
            error = error("Next page on last page");
        }
        if (! await statusOK(previousPageURL)) {
            error = error("Previous page on last page issue");
        }

        imageURL = parser.getImageURL();

        if (imageURL === null) {
            error = error("No image found on last page");
        }

        if (! await statusOK(imageURL)) {
            error = error("Last Page image issue");
        }

        if(!error){
            console.log("Check complete no issues");
        }
        else{
            console.log("Somethings not quite right");
        }
    }
}

function error(string){
    console.log(string);
    return true;
}

main();

async function statusOK(url) {
    const response = await getHeader(url);
    if (response === undefined)
        return false;
    return response.statusCode === 200;
}

async function getHeader(url) {
    return new Promise(function (resolve, reject) {
        request.head({ url: url, headers: { "User-Agent": 'test' } }, async (error, response, body) => {
            resolve(response);
        });
    });
}
