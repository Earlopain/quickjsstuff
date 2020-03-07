const fs = require("fs");
const request = require("request");

mkdir(__dirname + "/e621userfavs");
mkdir(__dirname + "/e621posts");

function tagsMatchesFilter(tagArrays, filterString) {
    const tags = [].concat.apply([], tagArrays);
    const tagString = tags.join(" ");
    const seperatedFilters = filterString.split(" ");
    const allTags = tagString.split(" ");
    let result = true;
    for (const filter of seperatedFilters) {
        const inverse = filter.startsWith("-");
        const filterNoMinus = inverse ? filter.substring(1) : filter;
        if (result === false) {
            break;
        }
        if (filterNoMinus.includes("*")) {
            const regex = escapeStringToRegex(filterNoMinus);
            result = regex.test(tagString);
        } else {
            //if there is no wildcard, the filter and tag must match
            let matchFound = false;
            for (const tag of allTags) {
                if (tag === filterNoMinus) {
                    matchFound = true;
                    break;
                }
            }
            result = matchFound;
        }
        result = result !== inverse;
    }
    return result;
}

const stringToRegex = /[-\/\\^$+?.()|[\]{}]/g;
const regexStar = /\*/g;
const regexCache = {};
function escapeStringToRegex(string) {
    if (regexCache[string]) {
        return regexCache[string];
    }
    const regex = new RegExp(string.replace(stringToRegex, "\\$&").replace(regexStar, "[\\s\\S]\*\?"));
    regexCache[string] = regex;
    return regex;
}

async function getAllUserFavs(username) {
    const userfavPath = __dirname + "/e621userfavs/" + username + ".json";
    if (fs.existsSync(userfavPath)) {
        return JSON.parse(fs.readFileSync(userfavPath));
    }
    let page = 1;
    const url = "https://e621.net/posts.json?tags=fav:" + username + "&limit=320&page=";
    let jsonArray;
    let favMd5 = [];
    do {
        console.log(page);
        if (page > 750) {
            break;
        }
        jsonArray = await getJSON(url + page);
        for (const json of jsonArray.posts) {
            favMd5.push(json.md5);
            savePost(json);
        }
        page++;
    } while (jsonArray.length === 320);

    fs.writeFileSync(userfavPath, JSON.stringify(favMd5));
    return favMd5;
}

function savePost(json) {
    const filepath = __dirname + "/e621posts/" + json.file.md5 + ".json";
    if (fs.existsSync(filepath)) {
        return;
    }
    fs.writeFileSync(filepath, JSON.stringify(json, null, 4));
}

function getJSON(url) {
    return new Promise(resolve => {
        request.get(url, {
            headers: {
                "User-Agent": "earlopain"
            }
        }, (error, response, body) => {
            resolve(JSON.parse(body));
        });
    });
}

function mkdir(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}

const username = "earlopain";
const tagGroups = {
    "gay": ["male/male -bisexual -male/female", "male solo -bisexual"],
    "straight": ["male/female -bisexual", "female solo"],
};

(async () => {
    let postMatches = {};
    const userfavs = (await getAllUserFavs(username)).reverse();
    for (const userfavMd5 of userfavs) {
        postMatches[userfavMd5] = {};
        const userfavJson = JSON.parse(fs.readFileSync(__dirname + "/e621posts/" + userfavMd5 + ".json"));
        for (const tagGroupKey of Object.keys(tagGroups)) {
            for (const filter of tagGroups[tagGroupKey]) {
                const matches = tagsMatchesFilter(userfavJson.tags, filter);
                postMatches[userfavMd5][tagGroupKey] = matches;
                if (matches) {
                    break;
                }
            }
        }
    }


    let csv = "date;straight;gay";
    let currentStraigt = 0;
    let currentGay = 0;

    const filestat = getAllStat();
    for (const md5 of Object.keys(postMatches).filter(a => filestat[a] !== undefined && filestat[a] > 1420070400000).sort((a, b) => {
        return filestat[a] - filestat[b];
    })) {
        if (filestat[md5] === undefined) {
            continue;
        }
        currentStraigt += postMatches[md5].straight;
        currentGay += postMatches[md5].gay;
        csv += "\n" + new Date(filestat[md5]).toISOString().split("T")[0] + ";" + currentStraigt + ";" + currentGay;
    }
    console.log(csv);
}
)();


function getAllStat(root = "/run/media/earlopain/plex/plexmedia/e621") {
    const folders = fs.readdirSync(root);
    let allFiles = [];
    for (const folder of folders) {
        allFiles = allFiles.concat(fs.readdirSync(root + "/" + folder).map(name => root + "/" + folder + "/" + name));
    }
    let result = {};
    for (const file of allFiles) {
        result[file.split("/").pop().split(".")[0]] = fs.statSync(file).mtimeMs;
    }
    return result;
}
