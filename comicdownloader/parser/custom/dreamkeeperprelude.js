const ParserBase = require("../parserBase");

class Parser extends ParserBase {
    constructor(options) {
        super(options);
        this.cssSelectorNext = "#next";
        this.cssSelectorPrevious = "#prev";
        this.cssSelectorImage = ".Preludecomic > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > a:nth-child(1) > img:nth-child(1)";
        this.mainPage = "http://www.dreamkeeperscomic.com";
        this.firstPage = this.mainPage + "/Prelude.php?pg=0001";
        this.lastPage = this.mainPage + "/Prelude.php";
    }

    noNextPage() {
        return this.getNextPageURL().includes("PreludeArchive");
    }

    noPreviousPage() {
        return this.getPreviousPageURL().includes("PreludeArchive")
    }
}

Parser.fullName = "DreamkeepersPrelude";
Parser.shortName = "dkprelude";

module.exports = Parser;