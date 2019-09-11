class ParserAbstract {

    constructor() {
        this.cssSelectorNext = "";
        this.cssSelectorPrevious = "";
        this.cssSelectorImage = "";
        this.mainPage = "";
    }
    getStartURL() {
    }
    getCurrentURL() {
    }
    noNextPage() {
    }
    noPreviousPage() {
    }
}

ParserAbstract.fullName = "";
ParserAbstract.shortName = "";

module.exports = ParserAbstract;