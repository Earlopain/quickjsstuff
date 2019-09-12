const util = require("./util.js");
const fs = require("fs");

class WebComic {
    constructor(parser) {
        this.parser = parser;
        const validity = util.validateParser(this.parser);
        if (validity !== "") {
            throw new Error(validity);
        }
        this.name = parser.fullName;
        if (!fs.existsSync(this.parser.options.downloadFolder + "/" + this.name)) {
            fs.mkdirSync(this.parser.options.downloadFolder + "/" + this.name);
            console.log("Comic folder created")
        }
    }

    async getFollowingPage() {
        return await this.parser.getFollowingPage();
    }

    async download() {
        await this.parser.init();
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
        return "";
    }
}

exports.ComicPage = ComicPage;
exports.WebComic = WebComic