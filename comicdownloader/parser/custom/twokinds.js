const ParserBase = require("../parserBase");

class Parser extends ParserBase {
    constructor(options) {
        super(options);
        this.cssSelectorNext = "a.navarrow:nth-child(4)";
        this.cssSelectorPrevious = "a.navarrow:nth-child(2)";
        this.cssSelectorImage = [".comic > a:nth-child(2) > img:nth-child(1)", ".comic > img:nth-child(2)"];
        this.mainPage = "http://twokinds.keenspot.com";
        this.firstPage = this.mainPage + "/comic/1/";
        this.lastPage = this.mainPage;
    }

    noNextPage() {
        return this.document.querySelector(this.cssSelectorNext) === null;
    }

    noPreviousPage() {
        return this.document.querySelector(this.cssSelectorPrevious) === null;
    }
}

Parser.fullName = "Twokinds";
Parser.shortName = "twokinds";

module.exports = Parser;