const fs = require("fs");
const readlineSync = require("readline-sync");
const deleteEmpty = require("delete-empty");
const logFile = "./cleanup.log";

const allFilesInExeDir = fs.readdirSync("./");
let logFileAlreadyExists = false;
let logFiles = [];


for (let i = 0; i < allFilesInExeDir.length; i++) {
    if (allFilesInExeDir[i].startsWith("cleanup.log")) {
        logFiles.push(allFilesInExeDir[i]);
        if (allFilesInExeDir[i] === "cleanup.log")
            logFileAlreadyExists = true;

    }

}
if (logFileAlreadyExists) {
    for (let i = logFiles.length - 1; i >= 0; i--) {
        if (i === 0)
            fs.renameSync(logFiles[i], logFiles[i] + "1");
        else {
            fs.renameSync(logFiles[i], logFiles[i].slice(0, -1) + (i + 1));
        }
    }
}
var logger = fs.createWriteStream(logFile);


process.stdout.write("Programm written by earlopain. It should probalby work," +
    "but there is always a chance that something breaks. I recommend to " +
    "make a copy of your songs folder, just to be sure. Kind of defeats the" +
    " purpose of this tool, but at least I warned you. If you have many beatmaps, " +
    "this will probably take a while. Some stats:\n" +
    "Different mapsets:     15,760    Time:         87s (on an ssd)\n" +
    "Files before:          361,036   Size before:  140GB\n" +
    "Files after:           94,984    Size after:   70.47GB\n" +
    "Difference:            291,247   Difference:   69.53GB\n\n\n");

let dryRun = true;
if (readlineSync.keyInYN("The program defaults to not deleting files. It will only show you what would have happened. Press y if you want to delete the files\n")) {
    dryRun = false;
}
process.stdout.write("You selected " + (dryRun ? "only watch" : "to clean up your songs folder"));

let validFolder = false;
while (!validFolder) {
    rootFolder = readlineSync.question("\nPlease enter you osu! songs folder\n");
    rootFolder = rootFolder.replace(/\\/g, "/");
    try {
        if (rootFolder === ".")
            throw new Error();
        fs.statSync(rootFolder);
        validFolder = true;
    } catch (error) {
        process.stdout.write("This is either not a valid folder or you don't have permissions\n");
    }
}
if (!rootFolder.endsWith("/"))
    rootFolder = rootFolder + "/";

try {
    let osuExePath = "";
    const splitted = rootFolder.split("/");
    for (let i = 0; i < splitted.length - 2; i++) {
        osuExePath += splitted[i] + "/";
    }
    osuExePath += "osu!.exe";
    fs.statSync(osuExePath);
} catch (error) {
    process.stdout.write("osu!.exe was not found one directory lower in your folder. This is ok if your songs folder is not in your osu! folder");
    if (!dryRun)
        process.stdout.write("\nAre you ABSOLUTLY sure you got the right folder?\n" +
            "You may loose important files, they will not apear in your recycle bin");

    if (!readlineSync.keyInYN("\nDid you select the right folder?")) {
        process.exit(1);
    }
}

if (!dryRun && !readlineSync.keyInYN("\n\nAre you sure you want to do this? There may be errors. Consider making a backup\n")) {
    process.exit(1);
}

rootFolder = rootFolder;

logger.write("root folder: " + rootFolder);
logger.write("\r\nGetting mapsets...");

let foldersAndFiles = fs.readdirSync(rootFolder);
logger.write("\r\nFinished!");
logger.write("\r\nSorting out files...");
let songs = [];
foldersAndFiles.forEach(element => {
    if (fs.statSync(rootFolder + element).isDirectory())
        songs.push(rootFolder + element);
    else {
        logger.write("\r\nNot a mapset: " + rootFolder + element);
    }
});
logger.write("\r\nFinished!");
let percentage = 0;
let counter = 0;

let totalFiles = 0;
let deletedFiles = 0;
let spaceSaved = 0;

const startTime =
    Date.now() / 1000;
let previousWrite = "";

logger.write("\r\n\r\nStart itterating over the mapsets...");
try {
    songs.forEach(folder => {
        logger.write("\r\n\r\nParsing " + folder);
        counter++;
        const writing = "" + Number.parseFloat(counter / songs.length * 100).toFixed(1) + "% " + (Math.round(Date.now() / 1000 - startTime)) + "s";
        if (writing !== previousWrite) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(writing);
            previousWrite = writing;
        }
        let filesToDelete = getAllFilesInFolder(folder);
        totalFiles += filesToDelete.length;
        const dotOsuFiles = getOsuFiles(filesToDelete)

        let musicFiles = [];

        let uniqueSoundFiles = [];
        let uniqueBackgrounds = [];

        for (let i = 0; i < dotOsuFiles.length; i++) {
            const content = fs.readFileSync(dotOsuFiles[i], "utf8");
            const lines = content.split("\r\n");

            let backgroundImage;
            let soundFile;

            let inGeneral = false;
            let inEvents = false;
            let generalFinished = false;
            let eventsFinsished = false;
            const regex = /"([^"])*\.jpg"|"([^"])*\.jpeg"|"([^"])*\.png"/g;
            for (let j = 0; j < lines.length; j++) {
                if (eventsFinsished && generalFinished) {
                    break;
                }

                if (inEvents) {
                    if (lines[j].charAt[0] === "[") {
                        inEvents = false;
                        eventsFinsished = true;
                    }

                    let m;
                    while ((m = regex.exec(lines[j])) !== null) {
                        if (m.index === regex.lastIndex) {
                            regex.lastIndex++;
                        }
                        backgroundImage = folder + "/" + m[0].slice(1, -1);


                        if (uniqueBackgrounds.indexOf(backgroundImage) === -1) {
                            uniqueBackgrounds.push(backgroundImage);
                            logger.write("\r\nFound background " + m[0].slice(1, -1));
                        }
                        inEvents = false;
                    }
                }

                if (inGeneral) {
                    if (lines[j].charAt[0] === "[") {
                        inGeneral = false;
                        generalFinished = true;
                    }

                    const splitted = lines[j].split(/:(.+)/);
                    if (splitted[0] === "AudioFilename") {
                        soundFile = folder + "/" + splitted[1].substr(1);

                        if (uniqueSoundFiles.indexOf(soundFile) === -1) {
                            uniqueSoundFiles.push(soundFile);
                            logger.write("\r\nFound soundFile " + splitted[1].substr(1));
                        }
                        inGeneral = false;
                    }
                }

                if (lines[j] === "[General]")
                    inGeneral = true;
                if (lines[j] === "[Events]")
                    inEvents = true;
            }
        }

        if (uniqueBackgrounds.length === 0) {
            logger.write("\r\nNo background found");
        }

        if (uniqueSoundFiles.length === 0) {
            logger.write("\r\nNot deleting, no sound found");
        } else {
            filesToDelete = filterArray(filesToDelete, uniqueBackgrounds);
            filesToDelete = filterArray(filesToDelete, uniqueSoundFiles);
            filesToDelete = filterArray(filesToDelete, dotOsuFiles);

            for (let i = 0; i < filesToDelete.length; i++) {
                const stats = fs.statSync(filesToDelete[i]);
                logger.write("\r\nDeleting " + filesToDelete[i].split(folder + "/")[1]);
                if (!dryRun)
                    fs.unlinkSync(filesToDelete[i]);
                spaceSaved += stats.size;
            }

            deletedFiles += filesToDelete.length;
        }
    });
    nextStep();
} catch (error) {
    logger.write("\r\n\r\n\r\n" + error.stack);

    logger.on("close", function () {
        process.stdout.write("\r\nPress any key to exit");
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", process.exit.bind(process, 0));
    });

    process.stdout.write("\r\n" + error.stack);
    process.stdout.write("\r\n\r\nSorry about that, please send me the logfile so I can fix the problem");
    process.stdout.write("\r\n\r\nWriting logfile...\n");
    logger.end();
}

function nextStep() {
    process.stdout.write("\nDeleting empty folders...\n");
    if (!dryRun) {
        const orphaned = deleteEmpty.sync(rootFolder, { verbose: false });
        let temp = "";
        for (let i = 0; i < orphaned.length; i++) {
            temp += "\r\nRemoved empty dir " + orphaned[i];
        }
        logger.write(temp);
    }


    logger.write("\r\n\r\nTotal: " + totalFiles + ", deleted " + deletedFiles + ", saved: " + humanFileSize(spaceSaved) + ", runtime: " + Math.round(Date.now() / 1000 - startTime) + "s");
    process.stdout.write("\n\nFinished! From a total of " + totalFiles + " files you deleted " + deletedFiles + ", saving you " + humanFileSize(spaceSaved) + ".\n");
    process.stdout.write("And it only took you " + (Math.round(Date.now() / 1000 - startTime) < 180 ? Math.round(Date.now() / 1000 - startTime) + " seconds" : (Math.round(Math.round(Date.now() / 1000 - startTime) / 60)) + " minutes"));
    process.stdout.write("\nThanks for using this tool.");
    process.stdout.write("\nWriting logfile...");

    logger.on("close", function () {
        process.stdout.write("\n\nFinished. Press any key to exit\n");
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on("data", process.exit.bind(process, 0));
    });
    logger.end();
}

function humanFileSize(size) {
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + " " + ["B", "kB", "MB", "GB", "TB"][i];
};

function getOsuFiles(files) {
    let results = [];
    for (let i = 0; i < files.length; i++) {

        if (files[i].split(".")[files[i].split(".").length - 1] === "osu") {
            results.push(files[i]);
        }
    }
    return results;
}

function filterArray(original, remove) {
    return original.filter(function (x) {
        return remove.indexOf(x) < 0;
    })
}


function getAllFilesInFolder(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + "/" + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) results = results.concat(getAllFilesInFolder(file));
        else results.push(file);
    })
    return results;
}
