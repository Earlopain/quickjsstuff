const ParserBase = require("../parserBase");

class Parser extends ParserBase {
    constructor(options) {
        super(options);
        this.cssSelectorNext = "div.comicnav:nth-child(4) > div:nth-child(3) > a:nth-child(1)";
        this.cssSelectorPrevious = "div.comicnav:nth-child(4) > div:nth-child(1) > a:nth-child(1)";
        this.cssSelectorImage = "#content > img:nth-child(2)";
        this.mainPage = "https://lackadaisycats.com/";
    }

    getStartURL() {
        return "https://lackadaisycats.com/comic.php?comicid=1";
    }

    getCurrentURL() {
        return "https://lackadaisycats.com/comic.php";
    }

    noNextPage() {
        return this.getNextPageURL() === null;
    }

    noPreviousPage() {
        return this.getPreviousPageURL === null;
    }
}

Parser.fullName = "LackADaisy";
Parser.shortName = "lackadaisy";

module.exports = Parser;