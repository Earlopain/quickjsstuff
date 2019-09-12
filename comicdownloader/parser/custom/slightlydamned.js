const ParserBase = require("../parserBase");

class Parser extends ParserBase {
    constructor(options) {
        super(options);
        this.cssSelectorNext = ".cc-next";
        this.cssSelectorPrevious = ".cc-prev";
        this.cssSelectorImage = "#cc-comic";
        this.mainPage = "http://www.sdamned.com";
        this.firstPage = this.mainPage + "/comic/prologue";
        this.lastPage = this.mainPage;
    }

    noNextPage() {
        return this.getNextPageURL() === null;
    }

    noPreviousPage() {
        return this.getPreviousPageURL() === null;
    }
}

Parser.fullName = "SlightlyDamned";
Parser.shortName = "sdamned";

module.exports = Parser;