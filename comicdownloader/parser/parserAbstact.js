class ParserAbstract {

    constructor() {
        this.cssSelectorNext = "";
        this.cssSelectorPrevious = "";
        this.cssSelectorImage = "";
        this.mainPage = "";
        this.firstPage = "";
        this.lastPage = "";
    }
    noNextPage() {
    }
    noPreviousPage() {
    }
}

ParserAbstract.fullName = "";
ParserAbstract.shortName = "";

module.exports = ParserAbstract;