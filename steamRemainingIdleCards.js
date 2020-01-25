const request = require("request");

const regex = /progress_info_bold">([\s\S]*?)</g;
const regexCount = /Showing ([\s\S]*?) of ([\s\S]*?) badges/g;
const userid = "76561198069428143";
let url;
if (userid.length === 17 && !isNaN(parseInt(userid)))
    url = "https://steamcommunity.com/profiles/" + userid + "/badges/?p=";
else
    url = "https://steamcommunity.com/id/" + userid + "/badges/?p=";

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));
const cookie = secrets.steamwebcookie;

async function main() {
    let page = 1;
    let result = 0;
    while (true) {
        console.log("Page " + page);
        const html = await getURL(url + page);

        let m;
        while ((m = regex.exec(html)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            if (!isNaN(parseInt(m[1])))
                result += parseInt(m[1]);
        }

        while ((m = regexCount.exec(html)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            if (m[1].split("-")[1] === m[2]) {
                console.log(result + " remaining card drops");
                console.log("If you get 0 but are sure you got more, check your cookie");
                return;
            }
        }
        page++;
    }
}

main();


function getURL(url) {
    return new Promise(resolve => {
        request.get({
            url: url, headers: {
                "Cookie": cookie
            }
        }, (error, response, body) => {
            resolve(body);
        });
    });
}
