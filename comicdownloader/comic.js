const util = require("./util.js");
const fs = require("fs");
const ParserAbstract = require("./parser/parserAbstact");

class WebComic {
    constructor(Parser, options) {
        this.parser = new Parser(options);
        for (const functionName of Object.getOwnPropertyNames(ParserAbstract.prototype)) {
            if (this.parser["__proto__"][functionName] === undefined) {
                throw new Error("The parser must implement the function " + functionName);
            }
        }
        this.name = Parser.fullName;
        this.options = options;
        if (!fs.existsSync(this.options.downloadFolder + "/" + this.name)) {
            fs.mkdirSync(this.options.downloadFolder + "/" + this.name);
            console.log("Comic folder created")
        }
    }

    async getFollowingPage() {
        return await this.parser.getFollowingPage();
    }

    async download() {
        this.parser.orderFiles();
        console.log("Downloading " + this.name);
        while (await this.getFollowingPage() !== "stop") { }
        this.parser.orderFiles();
        this.parser.logFile.justUpdate = true;
        this.parser.saveLogFile();
    }
}

class ComicPage {
    constructor(index, imageURL, imageOrigin) {
        this.index = index;
        this.imageURL = imageURL;
        this.imageOrigin = imageOrigin;
    }

    async download(comicName, options) {
        const downloadFolder = options.downloadFolder;
        const bin = await util.getBinary(this.imageURL);
        const ext = this.imageURL.split(".").pop();
        if (fs.existsSync(downloadFolder + "/" + comicName + "/" + this.index + "." + ext)) {
            if (this.index >= 0)
                return "stop";
        }
        console.log(this.imageURL + " downloaded");
        fs.writeFileSync(downloadFolder + "/" + comicName + "/" + this.index + "." + ext, bin, "binary");
    }
}

exports.ComicPage = ComicPage;
exports.WebComic = WebComic