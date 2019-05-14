const fs = require("fs");

const folder = "./files/";
const filesfolders = fs.readdirSync(folder);
const files = [];
for(let i = 0; i < filesfolders.length; i++){
	if(filesfolders[i].length > 32)
		files.push(filesfolders[i]);
}

for(let i = 0; i < files.length; i++){
	if(i % 10000 === 0)
	console.log(i);
	fs.renameSync(folder + files[i], folder + files[i].substr(0, 2) + "/" + files[i].substr(2, 2) + "/" + files[i]);
	
}
console.log("Finished");