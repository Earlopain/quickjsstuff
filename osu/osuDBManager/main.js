const Reader = require("./reader.js").Reader;
const OsuDB = require("./osudb").OsuDB;
const collections = require("./collections.js");
const options = require("./option.js");
const request = require("request");
const fs = require("fs");

const dbPath = "D:/osu!/osu!.db";
const collectionPath = "F:/Downloads/scores.db";
//const oldCollectionPath = "D:/osu!/collection.db";
//const newCollectionPath = "D:/osu!/collection.db";
//const optionsString = "rank=A:A&&rank=B:B&&rank=C:C&&rank=D:D";

const secrets = JSON.parse(fs.readFileSync("./secrets.json"))
const apiKey = secrets.osuapikey;
//const namePrefix = "";

//let merge = fs.existsSync(oldCollectionPath);
//let o = new options.Options(optionsString);

main();

async function main() {
    let hash = new Reader(collectionPath).readCollection();
    hash = hash.filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
    let ids = [];
    let string = "";
    for (let i = 0; i < hash.length; i++) {
        console.log(i + " out of " + hash.length);
        const start = new Date().getTime();
        const json = await getJSON("https://osu.ppy.sh/api/get_beatmaps?k=" + apiKey + "&h=" + hash[i]);
        if (json.length === 0)
            continue;
        ids.push(json[0].beatmapset_id);
        await sleep(1000 - (new Date().getTime() - start));
    }
    for (let i = 0; i < ids.length; i++) {
        string += "https://osu.ppy.sh/d/" + ids[i] + "n\n";
    }
    fs.writeFileSync("downloadlist.txt", string);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getJSON(url) {
    return new Promise(resolve => {
        request.get(url, (error, response, body) => {
            resolve(JSON.parse(body));
        });
    });
}


//let collection = await o.constructCollection(db, apiKey, namePrefix);
//if (merge)
//    collection.merge(collections.read(oldCollectionPath));
//collection.write(newCollectionPath);
// const old = collections.read("D:/osu!/collection_bak.db");
// const neww = collections.read("D:/osu!/collection.db");

// neww.merge(old);
// neww.write("D:/osu!/collection.db");

// let newCollection = new collections.Collections();
// newCollection.add(new collections.Collection("loved"));
// db.beatmaps.forEach(bm => {
//     if (bm.status === 7) {
//         newCollection.getIndex(0).add(bm.md5);
//     }
// });
// newCollection.merge(old);

// newCollection.write("D:/osu!/collection.db", old);