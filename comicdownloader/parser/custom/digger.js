const ParserBase = require("../parserBase");

class Parser extends ParserBase {
    constructor(options) {
        super(options);
        this.cssSelectorNext = ".nav-next > a:nth-child(1)";
        this.cssSelectorPrevious = ".nav-previous > a:nth-child(1)";
        this.cssSelectorImage = "#comic > img:nth-child(1)";
        this.mainPage = "http://diggercomic.com";
        this.firstPage = this.mainPage + "/blog/2007/02/01/wombat1-gnorf/";
        this.lastPage = this.mainPage;
    }

    noNextPage() {
        return this.getNextPageURL() === null;
    }

    noPreviousPage() {
        return this.getPreviousPageURL() === null;
    }
}

Parser.fullName = "Digger";
Parser.shortName = "digger";

module.exports = Parser;