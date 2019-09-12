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
        this.document;
        this.logFile;
        this.nextPageURL;
        this.fullName = this.__proto__.constructor.fullName;
        this.getLogfile();
    }

    async init() {
        this.orderFiles();
        this.lastPage = await this.getActualLastURL();
        const validity = util.validateParser(this);
        if (validity !== "") {
            throw new Error(validity);
        }
    }

    getNextPageURL() {
        return this.constructURL(this.cssSelectorNext, "href");
    }

    getPreviousPageURL() {
        return this.constructURL(this.cssSelectorPrevious, "href");
    }

    getImageURL() {
        return this.constructURL(this.cssSelectorImage, "src");
    }

    constructURL(cssSelectors, property) {
        if (typeof cssSelectors === "string")
            cssSelectors = [cssSelectors];
        for (const selector of cssSelectors) {
            const selected = this.document.querySelector(selector);
            if (selected === null)
                continue;
            const url = selected[property];
            if (url.startsWith("http"))
                return url;
            else
                return (this.document.location.hostname + url).replace(/\/\//g, (i => m => !i++ ? m : '/')(0));   //remove double slashes exept the one after http(s)
        }
        return null;
    }

    async getFollowingPage() {
        if (this.document === undefined) {
            if (this.options.startFromBeginning)
                this.nextPageURL = this.firstPage;
            else
                this.nextPageURL = await this.lastPage;
        } else {
            if ((this.options.startFromBeginning && this.noNextPage()) || (!this.options.startFromBeginning && this.noPreviousPage()))
                return "stop";
            if (this.options.startFromBeginning)
                this.nextPageURL = this.getNextPageURL();
            else
                this.nextPageURL = this.getPreviousPageURL();
        }
        if (this.options.continueOnAlreadyDownloaded === false && this.logFile.downloaded[this.nextPageURL] !== undefined)
            return "stop";

        this.document = (await util.generateDOM(this.nextPageURL)).window.document;
        const imageURL = this.getImageURL();
        let comicPage;
        if (this.options.startFromBeginning) {
            comicPage = new comicClass.ComicPage(this.currentPage, imageURL, this.nextPageURL);
        }
        else {
            comicPage = new comicClass.ComicPage(-this.currentPage - 1, imageURL, this.nextPageURL);
        }
        const status = await comicPage.download(this.fullName, this.options);
        if (status === "stop" && this.options.continueOnAlreadyDownloaded === false) {
            console.log(imageURL + " already downloaded");
            return "stop";
        }
        this.downloadTracker(comicPage);
        this.currentPage++;
        return "downloaded";
    }

    async getActualLastURL() {
        const backupDoc = this.document;
        this.document = (await util.generateDOM(this.lastPage)).window.document;
        this.document = (await util.generateDOM(this.getPreviousPageURL())).window.document;
        const actualLastURL = this.getNextPageURL();
        this.document = backupDoc;
        return actualLastURL;
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