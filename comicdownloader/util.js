const request = require("request");
const fs = require("fs");


async function getBinary(url) {
    return await getURL(url, "binary");
}

async function getHTML(url) {
    const html = await getURL(url, "utf8");
    return html;
}

async function getURL(url, formating) {
    return new Promise(function (resolve, reject) {
        request.get({ url: url, headers: { "User-Agent": 'test' }, encoding: formating }, async (error, response, body) => {
            if (error)
                debugger;
            if (response.statusCode !== 200 && response.statusCode !== 404)
                debugger;
            resolve(body);
        });
    });
}

const logDir = __dirname + "/persist";

exports.getBinary = getBinary;
exports.getHTML = getHTML;
exports.getURL = getURL;
exports.logDir = logDir;