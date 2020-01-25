const fs = require('fs');

let path = "F:/Download/bitwarden_export_20171104181825.csv";

let file = fs.readFileSync(path);
file = file.toString();

file = file.substr(file.indexOf('\n') + 1);
let results = [];
let temp = "";
let counter = 0;
let inpassword = false;
let first = true;
for (let i = 0; i < file.length; i++) {
    if (file.charAt(i) === "\"") {
        inpassword = !inpassword;
    }
    if (file.charAt(i) === "," && !inpassword) {
        counter++;
    }
    if (counter === 9) {
        counter = 0;
        let password = ""
        temp = temp.split(",");
        for (let i = 8; i < temp.length; i++) {
            password = password + temp[i] + ",";
        }
        password = password.slice(0, -1);
        results.push(temp[6] + "," + temp[7] + "," + password + "," + temp[4] + "," + temp[3] + "," + (first ? temp[0] : temp[0].slice(2)) + "," + (temp[1] === "" ? "0" : "1") + "\n");
        first = false;
        temp = "";
    }
    else {
        temp = temp + file.charAt(i);
    }
}
let result = "url,username,password,extra,name,grouping,fav\n";
results.forEach(function (element) {
    result = result + element
});


path = path.split("/");
let newpath = "";
path.forEach(function (element, index) {
    if (index !== path.length - 1) {
        newpath = newpath + element + "/";
    }
});
fs.writeFileSync(newpath + "lastpass.csv", result);
