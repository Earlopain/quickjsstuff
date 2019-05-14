const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let folder = "/media/earlopain/4TB/Downloads/Mega background dump/Background_Dump";
folder = folder.replace(/\\/g, "/");
if (!folder.endsWith("/"))
    folder = folder + "/";

const files = walk(folder);
next(0);

function next(number) {
    if (number > files.length - 1) {
        console.log("Finished");
        return;
    }
    var fd = fs.createReadStream(files[number]);
    var hash = crypto.createHash('md5');
    hash.setEncoding('hex');

    fd.on('end', function () {
        hash.end();
        fs.renameSync(files[number], path.dirname(files[number]) + "/"+ hash.read() + "." + files[number].split(".")[files[number].split(".").length - 1]);
        next(number + 1);
    });

    // read all file and pipe it (write it) to the hash object
    fd.pipe(hash);
}

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
