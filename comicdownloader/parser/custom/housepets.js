const ParserBase = require("../parserBase");

class Parser extends ParserBase {
    constructor(options) {
        super(options);
        this.cssSelectorNext = ".navi-next";
        this.cssSelectorPrevious = ".navi-prev";
        this.cssSelectorImage = ["#comic > a:nth-child(1) > img:nth-child(1)", "#comic > img:nth-child(1)"];
        this.mainPage = "http://www.housepetscomic.com";
        this.firstPage = this.mainPage + "/comic/2008/06/02/when-boredom-strikes/";
        this.lastPage = this.mainPage;
    }

    noNextPage() {
        return this.getNextPageURL().href !== undefined;
    }

    noPreviousPage() {
        return this.getPreviousPageURL().href !== undefined;
    }
}

Parser.fullName = "Housepets!";
Parser.shortName = "housepets";

module.exports = Parser;