const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const comicClass = require("./../comic.js");
const util = require("./../util.js");
const fs = require("fs");

class ParserBase {
    constructor(downloadOptions) {
        if (this.constructor === ParserBase) {
            throw new Error("Abstract Class");
        }
        this.options = downloadOptions;
        this.currentPage = 0;
        this.currentDOM;
        this.logFile;
        this.getLogfile();
    }

    async getFollowingPage() {
        let nextPageURL;
        if (this.currentDOM === undefined) {
            if (this.options.startFromBeginning)
                nextPageURL = this.getStartURL();
            else
                nextPageURL = this.getCurrentURL();
        } else {
            if ((this.options.startFromBeginning && this.noNextPage()) || (!this.options.startFromBeginning && this.noPreviousPage))
                return "stop";
            if (this.options.startFromBeginning)
                nextPageURL = this.getNextPageURL();
            else
                nextPageURL = this.getPreviousURL();
        }
        const pageHTML = await util.getHTML(nextPageURL);
        this.currentDOM = new JSDOM(pageHTML);
        this.document = this.currentDOM.window.document;
        const imageURL = this.getImageURL();
        let comicPage;
        if (this.options.startFromBeginning) {
            comicPage = new comicClass.ComicPage(this.currentPage, imageURL, nextPageURL);
        }
        else {
            comicPage = new comicClass.ComicPage(-this.currentPage, imageURL, nextPageURL);
        }
        this.downloadTracker(comicPage);
        this.currentPage++;
        return comicPage;
    }

    downloadTracker(comicPage) {
        const comicFolder = this.constructor.fullName;
        this.logFile.downloaded.push({ "index": comicPage.index, "imageOrigin": comicPage.imageOrigin, "imageURL": comicPage.imageURL });
        this.logFile.lastDownloaded = comicFolder.imageOrigin;
        this.saveLogFile();
    }

    getLogfile() {
        if (this.logFile !== undefined)
            return this.logFile;
        if (!fs.existsSync(util.logDir)) {
            fs.mkdirSync(util.logDir);
        }
        let logFile;
        if (!fs.existsSync(util.logDir + "/" + this.constructor.shortName + ".json")) {
            logFile = {
                "downloaded": [],
                "justUpdate": false,
                "lastDownloaded": ""
            };
        }
        else
            logFile = JSON.parse(fs.readFileSync(util.logDir + "/" + this.constructor.shortName + ".json"));
        this.logFile = logFile;
        return this.logFile;

    }

    saveLogFile() {
        fs.writeFileSync(util.logDir + "/" + this.constructor.shortName + ".json", JSON.stringify(this.logFile, null, 4), "utf8");
    }
}

module.exports = ParserBase;