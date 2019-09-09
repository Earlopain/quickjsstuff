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
        if (this.options.updateOnly === true) {
            this.options.startFromBeginning = false;
            this.options.continueOnAlreadyDownloaded = false;
        }
        this.currentPage = 0;
        this.currentDOM;
        this.logFile;
        this.actualCurrentURL;
        this.fullName = this.__proto__.constructor.fullName;
        this.getLogfile();
    }

    async getFollowingPage() {
        let nextPageURL;
        if (this.currentDOM === undefined) {
            if (this.options.startFromBeginning)
                nextPageURL = this.getStartURL();
            else
                nextPageURL = await this.getActualCurrentURL();
        } else {
            if ((this.options.startFromBeginning && this.noNextPage()) || (!this.options.startFromBeginning && this.noPreviousPage()))
                return "stop";
            if (this.options.startFromBeginning)
                nextPageURL = this.getNextPageURL();
            else
                nextPageURL = this.getPreviousPageURL();
        }
        if (this.options.continueOnAlreadyDownloaded === false && this.logFile.downloaded[nextPageURL] !== undefined)
            return "stop";

        const pageHTML = await util.getHTML(nextPageURL);
        this.currentDOM = new JSDOM(pageHTML);
        this.document = this.currentDOM.window.document;
        const imageURL = this.getImageURL();
        let comicPage;
        if (this.options.startFromBeginning) {
            comicPage = new comicClass.ComicPage(this.currentPage, imageURL, nextPageURL);
        }
        else {
            comicPage = new comicClass.ComicPage(-this.currentPage - 1, imageURL, nextPageURL);
        }
        const status = await comicPage.download(this.fullName, this.options);
        if (status === "stop" && this.options.continueOnAlreadyDownloaded === false) {
            console.log(currentPage.index + " already downloaded");
            return "stop";
        }
        this.downloadTracker(comicPage);
        this.currentPage++;
        return "downloaded";
    }

    async getActualCurrentURL() {
        if (this.actualCurrentURL !== undefined)
            return this.actualCurrentURL;
        const currentURL = this.getCurrentURL();
        const pageHTML = await util.getHTML(currentURL);
        const backupDOM = this.currentDOM;
        const backupDoc = this.document;
        this.currentDOM = new JSDOM(pageHTML);
        this.document = this.currentDOM.window.document;
        const previousURL = this.getPreviousPageURL();
        const pageHTMLPrevious = await util.getHTML(previousURL);
        this.currentDOM = new JSDOM(pageHTMLPrevious);
        this.document = this.currentDOM.window.document;
        this.actualCurrentURL = this.getNextPageURL();
        this.currentDOM = backupDOM;
        this.document = backupDoc;
        return this.actualCurrentURL;
    }

    downloadTracker(comicPage) {
        const comicFolder = this.fullName;//"index": comicPage.index, "imageOrigin": comicPage.imageOrigin, "imageURL": comicPage.imageURL
        this.logFile.downloaded[comicPage.imageOrigin] = { "index": comicPage.index, "imageURL": comicPage.imageURL };
        this.logFile.lastDownloaded = comicFolder.imageOrigin;
        this.saveLogFile();
    }

    orderFiles() {
        const comicFolder = this.options.downloadFolder + "/" + this.fullName;
        const imageFiles = fs.readdirSync(comicFolder);

        while (containsNegative(this.logFile)) {
            const highest = getHighestNumber(this.logFile);
            const lowest = getLowestNumber(this.logFile);

            const highestIndex = this.logFile.downloaded[highest].index;
            const lowestIndex = this.logFile.downloaded[lowest].index;

            let currentFileName;
            for (const file of imageFiles) {
                if (file.startsWith(lowestIndex + ".")) {
                    currentFileName = file;
                    break;
                }
            }
            const newFileName = (highestIndex + 1) + "." + currentFileName.split(".").pop();
            fs.renameSync(comicFolder + "/" + currentFileName, comicFolder + "/" + newFileName);
            this.logFile.downloaded[lowest].index = highestIndex + 1;
        }

        this.saveLogFile();

        function getLowestNumber(logFile) {
            let lowest = Number.MAX_SAFE_INTEGER;
            let result;
            for (const key of Object.keys(logFile.downloaded)) {
                if (logFile.downloaded[key].index < lowest) {
                    result = key;
                    lowest = logFile.downloaded[key].index;
                }
            }
            return result;
        }

        function getHighestNumber(logFile) {
            let highest = Number.MIN_SAFE_INTEGER;
            let result;
            for (const key of Object.keys(logFile.downloaded)) {
                if (logFile.downloaded[key].index > highest) {
                    result = key;
                    highest = logFile.downloaded[key].index;
                }
            }
            return result;
        }

        function containsNegative(logFile) {
            for (const key of Object.keys(logFile.downloaded)) {
                if (logFile.downloaded[key].index < 0)
                    return true;
            }
            return false;
        }

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
                "downloaded": {},
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