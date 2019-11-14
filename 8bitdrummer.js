const request = require("request");

async function main() {
    const urlDates = "https://www.the8bitdrummer.com/json/calendar_streams.php";
    const data = JSON.parse(await requestURL(urlDates)).data;
    const cache = [];
    for (const year of Object.keys(data)) {
        const months = data[year];
        for (const month of Object.keys(months)) {
            const days = data[year][month];
            for (const day of Object.keys(days)) {
                const url = "https://www.the8bitdrummer.com/json/song_list_archive.php?data=%7B%22year%22%3A%22" + year + "%22%2C%22month%22%3A%22" + month + "%22%2C%22day%22%3A%22" + day + "%22%7D";
                const response = JSON.parse(await requestURL(url)).data;
                for (const key of Object.keys(response)) {
                    const song = response[key].song;
                    const blacklist = ["shared?", "playlist?", "?feature", "?reload"];
                    if (!song.link.includes("youtu"))
                        continue;
                    let flag = false;
                    for (const string of blacklist) {
                        if (song.link.includes(string))
                            flag = true;
                    }
                    if (flag)
                        continue;
                    if (song.link.length !== 28) {
                        if (song.link.includes("https://youtu.be/")) {
                            song.link = song.link.split("?")[0];
                        }
                        else {
                            song.link = "https://youtu.be/" + song.link.split("?v=")[1].split("&")[0];
                        }
                        if (song.link.length > 28) {
                            debugger;
                            song.link = song.link.substring(0, 28);
                        }
                        else if (song.link.length < 28) {
                            continue;
                        }
                        const id = song.link.substring(17);
                        if (cache.includes(id)) {
                            continue;
                        }
                        cache.push(id);
                        console.log("%s => %s", song.link, song.title);
                    }
                }
            }
        }
    }
    console.log(cache.join(","));
}
main();

function requestURL(url) {
    return new Promise(resolve => {
        request.get({
            url: url, headers: {
                "User-Agent": "earlopain"
            }
        }, (error, response, body) => {
            resolve(body);
        });
    });
}
