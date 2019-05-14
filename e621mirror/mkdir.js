const fs = require("fs");

const dic = "0123456789abcdef";

for(let i = 0; i < dic.length; i++){
for(let j = 0; j < dic.length; j++){
		fs.mkdirSync("./files/" + dic[i] + dic[j]);
		console.log(dic[i] + dic[j]);
}
}

for(let i = 0; i < dic.length; i++){
for(let j = 0; j < dic.length; j++){
for(let k = 0; k < dic.length; k++){
for(let l = 0; l < dic.length; l++){
		fs.mkdirSync("./files/" + dic[i] + dic[j] + "/" + dic[k] + dic[l]);
		console.log(dic[i] + dic[j] + "/" + dic[k] + dic[l]);
}
}}}