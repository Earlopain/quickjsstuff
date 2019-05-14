const readline = require("readline");
const util = require("./util.js");

const updateRate = 250;
const bufferSize = 200;

let lineNumber = 0;
let allLines = [];
let newLines = [];
let ending = "";

async function posFixed() {
    while (true) {
        buffer();
        let skipCount = getSkipCount();
        readline.moveCursor(process.stdout, 0, -(allLines.length + 1 - skipCount));
        readline.clearScreenDown(process.stdout);
        for (let i = skipCount; i < allLines.length; i++) {
            if (allLines[i].finished)
                allLines[i].drawAgain = false;
            console.log(allLines[i].string);
        }
        for (let i = 0; i < newLines.length; i++) {
            allLines.push(newLines[i]);
            console.log(newLines[i].string);
        }
        console.log(ending);
        newLines = [];
        await util.sleep(updateRate);
    }
}

async function posRelative() {
    let finished = [];
    let drawnCount = 0;
    while (true) {
        buffer2();
        
        readline.moveCursor(process.stdout, 0, -drawnCount - 1);
        readline.clearScreenDown(process.stdout);

        for (let i = 0; i < finished.length; i++)
            console.log(finished[i].string);
        finished = [];
        drawnCount = 0;
        for (let i = 0; i < newLines.length; i++) {
            if (newLines[i].drawAgain) {
                if (newLines[i].finished) {
                    newLines[i].drawAgain = false;
                    finished.push(newLines[i]);
                }
                drawnCount++;
                console.log(newLines[i].string);
            }
        }
        console.log(ending);
        await util.sleep(updateRate);
    }
}

function getSkipCount() {
    let skipCount = 0;
    for (let i = 0; i < allLines.length; i++) {
        if (!allLines[i].drawAgain) {
            skipCount++;
        }
        else
            break;
    }
    return skipCount
}

function buffer() {
    if (!(allLines.length + newLines.length > bufferSize))
        return 0;
    return allLines.splice(0, bufferSize - newLines.length - allLines.length).length;
}
function buffer2() {
    if (!(newLines.length > bufferSize))
        return 0;
    return newLines.splice(0, newLines.length - bufferSize).length;
}

function log(object) {
    new Line(object, true);
}

function setLastLine(object) {
    ending = object;
}

posRelative();

class Line {
    constructor(string = "", final = false) {
        this.string = string;
        this.finished = final;
        this.drawAgain = true;
        newLines.push(this);
    }

    update(string) {
        if (this.finished)
            return;
        this.string = string;
    }

    getText() {
        return this.string;
    }

    finalize() {
        this.finished = true;
    }
}

exports.Line = Line;
exports.log = log;
exports.setLastLine = setLastLine;
//set();
// async function set() {
//     let lines = [];
//     for (let i = 0; i < 10; i++) {
//         lines.push(new Line());
//     }
//     lines[0].finalize();
//     while (true) {
//         for (let i = 0; i < 10; i++) {
//             lines[i].update(Math.random() * 100);
//         }
//         await util.sleep(00);
//     }
// }