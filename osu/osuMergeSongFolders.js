const fs = require('fs');

const folder = "F:/datahording/osubeatmaps/standard/unranked";
const origFolder = "D:/osu!/Songs"

const files = fs.readdirSync(folder);
const origFiles = fs.readdirSync(origFolder);

let alreadyExisting = [];
let newSongs = [];

origFiles.forEach(element => {
    const id = element.split(" ")[0];
    if (!isNaN(parseInt(id))) {
        alreadyExisting.push(id);
    }
    else {
        alreadyExisting.push(element);
    }
});

files.forEach(element => {
    let id = element.split(".")[0];
    if (isNaN(parseInt(id))) {
        id = element;
    }
    console.log(id);
    if (alreadyExisting.indexOf(id) === -1) {
        newSongs.push(id);
    }
    else{
        console.log("Deleting " + element);
        //deleteFolderRecursive(folder + "/" + element);
    }
});
console.log(newSongs.length + " new beatmaps");

function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};