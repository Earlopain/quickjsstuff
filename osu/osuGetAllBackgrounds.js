const fs = require("fs");
const crypto = require('crypto');
const imageSize = require('image-size');    //npm install image-size

const songsFolder = "/media/earlopain/4TB/osu!/Songs";
const outputFolder = "/media/earlopain/4TB/Random images/osu!"
const minWidth = 1920;
const minHeight = 1080;

const regex = /0,0,"([\s\S]*?.(jpg|png))",0,0/m;
const allSongFolders = fs.readdirSync(songsFolder);
let allBackgrounds = [];
let writeThis;
let previousConsoleWrite;

console.log("Searching for backgrounds...");
allSongFolders.forEach((songPath, index) => {
    writeThis = (Math.floor(index / allSongFolders.length * 10) * 10 + 10) + "%";
    if (writeThis !== previousConsoleWrite) {
        console.log(writeThis);
        previousConsoleWrite = writeThis;
    }
    const files = fs.readdirSync(songsFolder + "/" + songPath);
    const dotOsuFiles = files.filter(filename => filename.endsWith(".osu"));
    dotOsuFiles.forEach(mapfile => {
        const content = fs.readFileSync(songsFolder + "/" + songPath + "/" + mapfile);
        let m;
        while ((m = regex.exec(content)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            if (m[1] && allBackgrounds.indexOf(songsFolder + "/" + songPath + "/" + m[1]) === -1)
                allBackgrounds.push(songsFolder + "/" + songPath + "/" + m[1]);
            break;
        }
    });
});
console.log("Done parsing");
console.log("Checking image dimensions...");
let backgroundsRightSize = [];
let totalWidth = 0;
let totalHeight = 0;
allBackgrounds.forEach((path, index) => {
    writeThis = (Math.floor(index / allSongFolders.length * 10) * 10 + 10) + "%";
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
    } catch (error) { /*ENOENT*/ }

});
console.log("Done");
console.log("Copying to output...");
let md5List = [];
backgroundsRightSize.forEach((path, index) => {
    writeThis = (Math.floor(index / allSongFolders.length * 10) * 10 + 10) + "%";
    if (writeThis !== previousConsoleWrite) {
        console.log(writeThis);
        previousConsoleWrite = writeThis;
    }
    const image = fs.readFileSync(path);
    const md5 = crypto.createHash('md5').update(image).digest('hex');
    if (md5List.indexOf(md5) === -1)
        md5List.push(md5);
    fs.copyFileSync(path, outputFolder + "/" + md5 + "." + path.split(".")[path.split(".").length - 1]);
});

console.log("Total Backgrounds   => " + allBackgrounds.length);
console.log("Right Size          => " + backgroundsRightSize.length);
console.log("Unique Backgropunds => " + md5List.length);
console.log("Average Width       => " + Math.floor(totalWidth / backgroundsRightSize.length))
console.log("Average Height      => " + Math.floor(totalHeight / backgroundsRightSize.length));
