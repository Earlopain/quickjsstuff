const ParserBase = require("../parserBase");

class ParserLackADaisy extends ParserBase {
    constructor(options){
        super(options);
    }

    getStartURL(){
        return "https://lackadaisycats.com/comic.php?comicid=1";
    }

    getCurrentURL(){
        return "https://lackadaisycats.com/comic.php";
    }

    getNextPageURL(){
        return "https://lackadaisycats.com" + this.document.getElementsByClassName("next")[0].children[0].href;
    }

    getPreviousPageURL(){
        return "https://lackadaisycats.com" + this.document.getElementsByClassName("prev")[0].children[0].href;
    }

    noNextPage(){
        return this.document.getElementsByClassName("next")[0].children.length === 0;
    }

    noPreviousPage(){
        return this.document.getElementsByClassName("prev")[0].children.length === 0;
    }

    getImageURL(){
        return "https://lackadaisycats.com/" + this.document.getElementById("content").children[1].src;
    }
}

ParserLackADaisy.fullName = "LackADaisy";
ParserLackADaisy.shortName = "lackadaisy";

module.exports = ParserLackADaisy;