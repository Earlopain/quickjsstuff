const request = require("request");
const fs = require('fs');

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const baseURLFav = "https://e621.net/favorite/create.json?login=earlopain&password_hash=" + secrets.e621passwordhash + "&id=";
const baseURLId = "https://e621.net/post/show.json?md5="

let folder = "/media/earlopain/External/Pictures/e621";
folder = folder.replace(/\\/g, "/");
if (!folder.endsWith("/"))
    folder = folder + "/";

const files = fs.readdirSync(folder);
next(0);

function next(number) {
    if (number > files.length - 1)
        return;
	if(files[number].split(".")[0].length !== 32){
		next(number +1);
	}
	else{
		let md5 = files[number].split(".")[0];
		getURL(baseURLId + md5).then(resolve => {
			console.log(baseURLId + md5);
            const id = resolve.id;
            if(resolve.status === "deleted")
                console.log(md5 + " https://e621.net/post/show/" + id);
			postURL(baseURLFav + id).then(resolve => {
			 	next(number + 1);
			});
		});
	}
}

function getURL(url) {
    return new Promise(function (resolve, reject) {
        request.post(url, { headers: { 'User-Agent': "favsync/1.0 (earlopain)" } }, (error, response, body) => {
            resolve(JSON.parse(body));
        })
    });
}

function postURL(urll) {
    const options = {
        url: urll,
        method: 'POST',
        headers: {
            'User-Agent': 'favsync/1.0 (earlopain)'        }
    };
    return new Promise(function (resolve, reject) {
        request(options, (error, response, body) => {
            resolve(JSON.parse(body));
        })
    });

}
