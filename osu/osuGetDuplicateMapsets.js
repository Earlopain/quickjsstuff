const fs = require('fs');
const readline = require("readline-sync");

const del = readline.keyInYN("Delete duplicates? ");
const folder = readline.question("Enter osu Songs folder ");
const files = fs.readdirSync(folder);

let paths = [];
let ids = [];
let errors = [];

files.forEach(element => {
    const id = element.split(" ")[0];
    if (!isNaN(parseInt(id)) && ids.indexOf(id) === -1) {
        ids.push(id);
        paths.push(element);
    }
    else if (!isNaN(parseInt(id))) {
        const prev = paths[ids.indexOf(id)];
		try{
			const toDelete = fs.statSync(folder + "/" + prev).birthtimeMs > fs.statSync(folder + "/" + element).birthtimeMs ? element :  prev;
			if (del) {
            try {
                deleteFolderRecursive(folder + "/" + toDelete);
            }
            catch (e) {
				console.log(e);
                errors.push(toDelete);
            }
        }

        console.log(element + "\n" + prev);
		}
		catch(e){
			
		}
    }
});
if(errors.length !== 0)
console.log("You need to delete these folders manualy: ");
errors.forEach(element => {
    console.log(element);
});


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