const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const request = require("request");
const ParserBase = require("./parser/parserAbstact");

async function getBinary(url) {
    return await getURL(url, "binary");
}

async function getHTML(url) {
    const html = await getURL(url, "utf8");
    return html;
}

async function getURL(url, formating) {
    return new Promise(function (resolve, reject) {
        request.get({ url: url, headers: { "User-Agent": 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/69.0' }, encoding: formating }, async (error, response, body) => {
            if (error)
                debugger;
            if (response.statusCode !== 200 && response.statusCode !== 404)
                debugger;
            resolve(body);
        });
    });
}

const baseClass = new ParserBase();

function validateParser(parser) {
    let result = "";
    const parserMembers = Object.keys(parser);
    for (const member of Object.keys(baseClass)) {
        if (parserMembers.indexOf(member) === -1) {
            result += "    " + member + " missing (member)\n";
        }
    }

    const parserMethods = Object.getOwnPropertyNames(parser.__proto__);
    for (const method of Object.getOwnPropertyNames(baseClass.__proto__)) {
        if (parserMethods.indexOf(method) === -1) {
            result += "    " + method + " missing (method)\n";
        }
    }

    if (result !== "")
        result = parser.filename + "\n" + result;
    return result;
}

function validateParserStatic(parser) {
    let result = "";
    const a = ParserBase;
    const parserStatic = Object.keys(parser);
    for (const static of Object.keys(ParserBase)) {
        if (parserStatic.indexOf(static) === -1) {
            result += "    " + static + " missing (static)\n";
        }
    }

    if (result !== "")
        result = parser.filename + "\n" + result;
    return result;
}

async function generateDOM(url){
    const html = await getHTML(url);
    return new JSDOM(html, {url: url})
}

const logDir = __dirname + "/persist";

exports.getBinary = getBinary;
exports.getHTML = getHTML;
exports.getURL = getURL;
exports.logDir = logDir;
exports.validateParser = validateParser;
exports.validateParserStatic = validateParserStatic;
exports.generateDOM = generateDOM;