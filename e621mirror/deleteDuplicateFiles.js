const fs = require("fs");
const crypto = require("crypto");

const folder = "F:/Programmieren/quickjsstuff/e621mirror/yiff.party/";

const filesAndFolders = fs.readdirSync(folder);
const files = [];

console.log("Checking if file/folder");

for(let i = 0; i < filesAndFolders.length; i++){
    if(fs.statSync(folder + filesAndFolders[i]).isFile)
    files.push(folder + filesAndFolders[i]);
}

let map = [];

console.log("Generating md5s");
console.log("");

let string = "";

for(let i = 0; i < files.length; i++){
	if(string !== (i / files.length * 100).toFixed(2)){
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write((i / files.length * 100).toFixed(2));
		string = (i / files.length * 100).toFixed(2);
	}
    const md5 = createMd5FromPath(files[i]);
    map.push({"file": files[i], "md5": md5});
}

let encountered = [];

console.log("Checking for duplicates");

let test = 0;

for(let i = 0; i < map.length; i++){
    if(encountered.includes(map[i].md5)){
		test++;
		fs.unlinkSync(map[i].file);
	}
    encountered.push(map[i].md5);
}

console.log("Deleted" + test + " files");

function createMd5FromPath(path) {
    const data = fs.readFileSync(path);
    return crypto.createHash("md5").update(data).digest("hex");
}
