const Twit = require("twitter-lite");
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

const secrets = JSON.parse(require("fs").readFileSync("./secrets.json"));

const client = new Twit(secrets.twitter);


const twitterUserIds = ["309527440"];

let stream = client.stream('statuses/filter', { follow: twitterUserIds.join(",") });

stream.on('data', function (tweet) {
    if (!tweet.text)
        return;
    const promocodeRegex = /[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/gmi;
    let message = tweet.text.toLowerCase();
    if (!message.includes("pc:"))
        return
    var prc = spawn('vlc', ['/media/earlopain/External/Programmieren/quickjsstuff/sound.mp3']);
    while ((m = promocodeRegex.exec(message)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === promocodeRegex.lastIndex) {
            promocodeRegex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            var prc = spawn('firefox', ["warframe.com/promocode?code=" + match.toUpperCase()]);
            var post = exec(`curl 'https://www.warframe.com/promocode' -H 'User-Agent: Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:66.0) Gecko/20100101 Firefox/66.0' -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' -H 'Accept-Language: en-US,en;q=0.5' --compressed -H 'Referer: https://www.warframe.com/promocode' -H 'Content-Type: application/x-www-form-urlencoded' -H 'Connection: keep-alive' -H 'Cookie: ` + secrets.warframewebcookie +`' -H 'Upgrade-Insecure-Requests: 1' --data 'code=` + match.toUpperCase() + `&_token=` + secrets.warframetoken + `'`)
            console.log(match.toUpperCase());
        });
    }
})
