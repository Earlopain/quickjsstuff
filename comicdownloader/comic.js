const util = require("./util.js");
const fs = require("fs");
const ParserAbstract = require("./parser/parserAbstact");

class WebComic {
    constructor(Parser, options) {
        this.parser = new Parser(options);
        for (const functionName of Object.getOwnPropertyNames(ParserAbstract.prototype)) {
            if(this.parser["__proto__"][functionName] === undefined){
                throw new Error("The parser must implement the function " + functionName);
            }
        }
        this.name = Parser.fullName;
        this.options = options;
    }

    async getFollowingPage() {
        return await this.parser.getFollowingPage();
    }

    async download() {
        console.log("Downloading " + this.name);
        let currentPage;
        while((currentPage = await this.getFollowingPage()) !== "stop"){
            const status = await currentPage.download(this.name, this.options);
            if(status === "stop"){
                console.log(currentPage.index + " already downloaded");
                return;
            }
        }
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
        if (!fs.existsSync(downloadFolder + "/" + comicName)) {
            fs.mkdirSync(downloadFolder + "/" + comicName);
            console.log("Comic folder created")
        }
        if (fs.existsSync(downloadFolder + "/" + comicName + "/" + this.index + "." + ext)) {
            return "stop";
        }
        console.log(this.imageURL + " downloaded");
        fs.writeFileSync(downloadFolder + "/" + comicName + "/" + this.index + "." + ext, bin, "binary");
    }
}

exports.ComicPage = ComicPage;
exports.WebComic = WebComic