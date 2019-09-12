const ParserBase = require("../parserBase");

class Parser extends ParserBase {
    constructor(options) {
        super(options);
        this.cssSelectorNext = "#nav1 > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(3) > a:nth-child(1)";
        this.cssSelectorPrevious = "#nav1 > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > a:nth-child(3)";
        this.cssSelectorImage = "#page > img:nth-child(1)";
        this.mainPage = "http://www.minnasundberg.fi";
        this.firstPage = this.mainPage + "/comic/page00.php";
        this.lastPage = this.mainPage + "/comic/recent.php"
    }

    noNextPage() {
        return this.getNextPageURL().includes("sssscomic");
    }

    noPreviousPage() {
        return this.getPreviousPageURL() === null;
    }
}

Parser.fullName = "ARedtailsDream";
Parser.shortName = "artd";

module.exports = Parser;