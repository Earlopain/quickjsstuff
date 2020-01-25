const fs = require("fs");
const path = require('path');
const crypto = require('crypto');
const imageSize = require('image-size');    //npm install image-size

const imageFolder = "/media/earlopain/4TB/Downloads/Mega background dump"
const minWidth = 1920;
const minHeight = 1080;

const allImages = walk(imageFolder);
let writeThis;
let previousConsoleWrite;

let backgroundsRightSize = [];
let totalWidth = 0;
let totalHeight = 0;
allImages.forEach((path, index) => {
    writeThis = (Math.floor(index / allImages.length * 10) * 10 + 10) + "%";
    if (writeThis !== previousConsoleWrite) {
        console.log(writeThis);
        previousConsoleWrite = writeThis;
    }
    try {
        const dimensions = imageSize(path);
        if (dimensions.width >= minWidth && dimensions.height >= minHeight) {
            backgroundsRightSize.push(path);
            totalWidth += dimensions.width;
            totalHeight += dimensions.height;
        }
        else
            fs.unlinkSync(path);
    } catch (error) { /*ENOENT*/ }

});
console.log("Done");
console.log("Copying to output...");
let md5List = [];
backgroundsRightSize.forEach((path, index) => {
    writeThis = (Math.floor(index / allImages.length * 10) * 10 + 10) + "%";
    if (writeThis !== previousConsoleWrite) {
        console.log(writeThis);
        previousConsoleWrite = writeThis;
    }
    const image = fs.readFileSync(path);
    const md5 = crypto.createHash('md5').update(image).digest('hex');
    if (md5List.indexOf(md5) === -1)
        md5List.push(md5);
    //fs.copyFileSync(path, imageFolder + "/" + md5 + "." + path.split(".")[path.split(".").length - 1]);
});

console.log("Total Backgrounds   => " + allImages.length);
console.log("Right Size          => " + backgroundsRightSize.length);
console.log("Unique Backgropunds => " + md5List.length);
console.log("Average Width       => " + Math.floor(totalWidth / backgroundsRightSize.length))
console.log("Average Height      => " + Math.floor(totalHeight / backgroundsRightSize.length));



function walk(directoryName) {
    let result = [];
    const files = fs.readdirSync(directoryName);
    for (let i = 0; i < files.length; i++) {
        const fullPath = path.join(directoryName, files[i]);
        const file = fs.statSync(fullPath);
        if (file.isDirectory()) {
            const dirFiles = walk(fullPath);
            if (dirFiles)
                dirFiles.forEach(element => {
                    result.push(element);
                });
        } else {
            result.push(fullPath);
        }
    }
    return result
};
