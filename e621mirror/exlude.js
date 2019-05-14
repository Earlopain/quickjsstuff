const fs = require("fs");
const folder = "F:/Programmieren/quickjsstuff/e621mirror/json";

const files = fs.readdirSync(folder);


for(let i = 0; i < files.length; i++){
	files[i] = files[i].split(".")[0];
}

console.log(files.join(","));