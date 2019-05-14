const fs = require('fs');
const opn = require('opn');
const request = require('request');
const readline = require("readline-sync");
const folder = readline.question("Enter osu \'Songs\' folder: ");

let doit = false;

if (process.argv.length !== 6)
    throw new Error("Please proved map status, min favs, min starrating if you want to download with video or not. Example: Ranked 50, 3.30 true");
const status = process.argv[2];
const validStatus = ["Ranked", "Loved", "Unranked", "Qualified"];
const minFavs = process.argv[3];
const minStarRating = process.argv[4];
const downloadVideo = process.argv[5];
if (downloadVideo !== "true" && downloadVideo !== "false")
    throw new Error("download video must be either true or false");
if (validStatus.indexOf(status) === -1)
    throw new Error("Invalid status");
if (minFavs < 0)
    throw new Error("Favs must be 0 or more");

const link = "http://osusearch.com/query/?modes=Standard&statuses=" + status + "&min_favorites=" + minFavs + "&star=(" + minStarRating + ",10.00)";
const downloadLink = "https://osu.ppy.sh/d/";

let offset = 0;

const files = fs.readdirSync(folder);

let ids = [];

files.forEach(element => {
    if (element.split(" ").length > 1 && !isNaN(parseInt(element.split(" ")[0]))) {
        ids.push(parseInt(element.split(" ")[0]));
    }
    else
        console.log("Wrong format: " + element);
});

let newIds = [];

getNextPage();
function getNextPage() {
    if (!doit) {
        const url = link + "&offset=" + offset;
        //const url = link + "&offset=" + offset;
        request(url, (error, response, body) => {
            try {
                offset++;
                body = JSON.parse(body);
                if (body.beatmaps.length === 0) {
                    console.log(newIds.length + " new maps found");
                    console.log("Opening links...");
                    doit = true;
                    return
                }
                let count = 0;
                for (let i = 0; i < body.beatmaps.length; i++) {
                    const id = body.beatmaps[i].beatmapset_id;
                    if (ids.indexOf(id) === -1) {
                        console.log(downloadLink + id);
                        count++;
                        newIds.push(id);
                    }
                }
                //console.log(count + " new maps found");
                getNextPage();
            }
            catch (e) {
                //console.log("Error at offset " + (offset - 1));
                getNextPage();
            }

        });
    }

}

setInterval(function () {
    if (doit) {
        if (newIds.length === 0) {
            console.log("Finished");
            process.exit(0);

        }
        console.log(newIds.length);
        if (downloadVideo === "true")
            opn(downloadLink + newIds.pop());
        else
            opn(downloadLink + newIds.pop() + "n");
    }
}, 1000);
