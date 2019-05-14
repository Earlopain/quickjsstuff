const { execFile } = require('child_process');
let date = addHours(new Date(), 8);
date = date.toISOString().slice(0, 19).replace('T', '%20');
const secrets = JSON.parse(require("fs").readFileSync("./secrets"));
const url = "https://osu.ppy.sh/api/get_beatmaps?k=" + secrets.osuapikey + "&since=" + date;
const request = require("request");
let ranked = [];

var t = setInterval(check, 5000);

function check() {
    request.post(url, (error, response, body) => {
        try {
            body = JSON.parse(body);
            for (let i = 0; i < body.length; i++) {

                if ((body[i].approved === "1" || body[i].approved === "2" || body[i].approved === "3") && ranked.indexOf(body[i].beatmapset_id) === -1) {
                    ranked.push(body[i].beatmapset_id);
                    console.log("https://osu.ppy.sh/s/" + body[i].beatmapset_id);
                    execFile("C:/Program Files/MPC-HC/mpc-hc64.exe", ["F:/Programmieren/quickjsstuff/sound.mp3"]);
                }
            }
        } catch (e) {
        }
    })
}

function addHours(date, hours) {
    return new Date(date.getTime() + (hours * 60 * 60 * 1000));
}