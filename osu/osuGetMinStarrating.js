const fs = require('fs');
const opn = require('opn');
const request = require('request');
const readlineSync = require("readline-sync");

let link = "http://osusearch.com/query/?statuses=Unranked&modes=Standard&star=(";
const minFavs = 50;
const downloadLink = "https://osu.ppy.sh/d/";

let offset = 0;

const folder = readlineSync.question("Enter osu folder: ");
const divmax = readlineSync.question("Enter min diff to download, e.g 5.60 or 7.90: ");
link = link + divmax + ",10.00)";
const files = fs.readdirSync(folder);

let ids = [];

files.forEach(element => {
    if (element.split(" ").length > 1 && !isNaN(parseInt(element.split(" ")[0]))) {
        ids.push(parseInt(element.split(" ")[0]));
    }
    //else
    //console.log("Wrong format: " + element);
});

let newIds = [];
let doit = false;
getNextPage();
function getNextPage() {
    if (!doit) {
        const url = link + minFavs + "&offset=" + offset;
        request(url, (error, response, body) => {
            //console.log(url);
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
        console.log(newIds.length);
        opn(downloadLink + newIds.pop());
        if (newIds.length === 0){
            console.log("Finished");
            process.exit(0);
        }
    }
}, 1000);
