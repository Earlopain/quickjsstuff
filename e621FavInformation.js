const fs = require("fs");
const request = require("request");
const gm = require("gm").subClass({ imageMagick: true });

const imageFolder = "/run/media/earlopain/plex/plexmedia/e621/explicit";
const extraInfoFolder = "./e621extra"
const username = "earlopain";
const invalidateLocalUserFavs = false;
const autoDownloadNotDownloaded = false;

const ignoreNotDownloaded = [];

const ignoreList = `05ec5512f7264682769c3322318c8224:d9087000a1678673f1748a52c70a64b2
0a7ee8a03762e21371a76f566345e8aa:298aedf9ce0eabd85ec8e07108172801
0e137a0797b7232a78ec271faf143da1:ae11ef4c9bb257d286286281d27fa58a
1217fb22d927d8f22cce6bd2ebe9cc50:55db07b136271c2aba47907f543c98b5
1522769f1548b17c5359103e91fb5f9f:14b490ceef188a253e1a118ff7fa5186
1c44dd228088b1cb3f51c6851a1bff8f:b3b66b12f875d81d6ede5181b144ebc6
2b36d1b5610dd46132cde21eebe097f7:032d764e041da1266684332c23bb64bd
2b3c6e02fc953f07369c6ace57baa709:8d7379dc78eeaf8558abe478365bc45f
341941193ff383ad1c2ec6b28e4ea4c8:f533f0a6e904b6a837e495f2294b2163
37db33f5f06cc06a0e627b529119b508:f562e74a9762cf1749585e8b8d873b84
3b0c98b17ffd2e7d4a97849da3c95759:4209a226b3e522750bca4e316caaf60c
3b0c98b17ffd2e7d4a97849da3c95759:f34072cede89369e320850734be0cc6d
3ce564434b4d0c1bc2630e6105d4a3af:0e137a0797b7232a78ec271faf143da1
3ce564434b4d0c1bc2630e6105d4a3af:ae11ef4c9bb257d286286281d27fa58a
3edd912e9de12d7e924d5a67f87184cd:934698287b31b2b63f0e18cd08369476
4113f706993793e0cc1003c10715962f:3c8da45f85cbe482ea8d86fcab4e7c29
4209a226b3e522750bca4e316caaf60c:f34072cede89369e320850734be0cc6d
44262b0449274d8e60245fccbabab417:673f6357b74472ee7272e20f8bf9038b
442abdad18283dab7f222e4b74b79f7a:a24b30568957e57c2691f619e52e8506
4696980f18df5ea4fc811bd3f12d1f4c:0509e4eab1816d5af643aa5dd27b0e6d
4814c3ed5b51ac93410bc5fe5dc520e8:19ed0a2904d07a782c57f2ff0fedc8cc
49eb7ebdb7ec331774de70f57cb47f08:70c60770d64b9e82577365d648df159a
53d24f676f090fc087d613736bc9375b:946a87eab645bfe352d5c3b2961a5ec3
56addd0d9b25ce227d6ffc04575b756c:cc5ebd4bde1bf6bacaa9fa0abd07e4a2
5f08275c675c9f24a5f1554017207a79:4e75236daafc3b292c7d1dc809a6efd0
601bf93be08ffe5deee99a5fae178876:51f4747d392d3fca8cd37bd1323d4adc
7129b1678498a0e85352a42aa887e48e:2e9061c3686481caf0557a6990069bc9
760001953f96c008e5cc6fcb4c116095:f416a410a3965a9b0c559df3b5d45bff
80bec61773bd4afda45e60935646c8e0:6d7e105e71e489de6f1042350f23bbe4
85ed6e33333d8e958913331da4f1f4ef:169b5a67c5e3ca9b48b954e074ac4cbf
8a35455121a30b26efdac13f690de980:e1e541ec7a76a07fafc895dfd9b06498
8e44d7dcd69c6b57f37d2ae1819edf00:f3142d75cf6183fc9fde26b1452cd75d
9df76e3edcc5725da601aad4a83a4c49:9d12a9bca0ecc09cb87d668c3856bc19
a352f7640f99883a957ed20c259f22b9:fe801f965132fe914cf04b24bd502ab6
a8f6de1090743648d8346a462e8de1ca:ec36d3c3dcacd17168394963c9c33448
aa7cf7d26ba9759c79a914cc2b3261c5:e76f23cf6dc3b8e192a99547567b2ca0
acab674f4ef5ae19b9da5a0ac7a2bb7d:62d99083d208f84e99b24fb920130765
afe1340a167351ec42de0eaa3c5e6e3f:f857108a5d1b64e23cac28896f6246d1
b28f31a95aaa4a975f35fe93fa31ab78:d5850e769bf0aee7a64e5a0b41acb7dd
c1a242c81ec5a21d9f10d5a67ec5e733:99e5a57f802123333bae7d752f4973ee
c1dbaac165b4000feb12861a39889ce7:13895fc5380b64a1c52da467831d317c
d03d215a9b4fb766606a6bee5f9474ee:9a63252ed820f196d028e2c15e493ba0
d33d39574cf8ae1e713770dd94763fb6:41df413c6c0cde0435c38c05ac5322e9
d5a784bdc2397b2987e624385608b411:3b0c98b17ffd2e7d4a97849da3c95759
d5a784bdc2397b2987e624385608b411:4209a226b3e522750bca4e316caaf60c
dfb86430cdaddc5ad47e2178e343a68d:3f899a25095836311ec18649cfbacb58
e4644ac236563396f6f77c6ccc2b5d81:f4af8b36195d516d6fe2ac25a449d8ef
e4644ac236563396f6f77c6ccc2b5d81:f8b0714fdc6fd907f1afcbdaa652bf01
efdf8c5f66813496a25665c17fa86e39:bcbca25a8c4ad7383eb04f8845f78da2
f9219a4bdd7257f96ca9265b5f59b84a:784301565c4d4da75d8071fc9a09e25c
fff26919495acd94e68be4e449707ab3:14c4dc54417fdd360e11891e358f95ea`;

let timeTracker = {};

async function main() {
    timeStart("Total");
    const favJSON = await getJSONFromFavorites(username);
    timeStart("Get parent/child relation")
    const blacklist = ignoreList.split("\n");
    let result = [];
    for (const json1 of favJSON) {
        for (const json2 of favJSON) {
            if (json1.children === undefined || json1.children === "" || json2.parent_id === undefined || json2.parent_id === null)
                continue;
            if (json1.id === json2.id)
                continue;
            const children = json1.children.split(",");
            const parent = parseInt(json2.parent_id);
            for (const child of children) {
                if (child === parent.toString() || child === json2.id.toString()) {
                    if (!blacklist.includes(json1.md5 + ":" + json2.md5))
                        result.push(json1.md5 + ":" + json2.md5);
                }
            }
        }
    }
    result = result.sort();
    timeStop("Get parent/child relation");
    timeStop("Total");
    if (result.length > 0)
        console.log(result.join("\n") + "\nAll done");
    else
        console.log("Already all done");
}

main()

async function getJSONFromFavorites(username) {
    const favIDs = await getAllFavIdsFromUser(username);
    timeStart("get favjson")
    timeStart("json processing")
    let files = [];
    if (fs.existsSync(extraInfoFolder + "/posts.json"))
        files = JSON.parse(fs.readFileSync(extraInfoFolder + "/posts.json"));
    const localImages = fs.readdirSync(imageFolder).filter(element => { const split = element.split("."); return split.length === 2 && split[0].length === 32 }).map(element => { const split = element.split("."); return { "md5": split[0], "ext": split[1] } });
    const extraDownload = [];
    let jsonToSave = [];
    for (const image of localImages) {
        if (files.indexOf(image.md5 + ".json") === -1)
            extraDownload.push(image.md5);
    }
    let keyPairJSON = {};
    files.forEach(json => {
        if (json.id)
            keyPairJSON[json.id] = json;
        if (json.md5)
            keyPairJSON[json.md5] = json;
    });
    let sizeJSON = {};
    if (fs.existsSync(extraInfoFolder + "/imageSize.json")) {
        //get only keys for files downloaded
        sizeJSON = JSON.parse(fs.readFileSync(extraInfoFolder + "/imageSize.json"));
        const localImageMd5 = localImages.map(element => { return element.md5 });
        Object.keys(sizeJSON).filter(element => { return localImageMd5.includes(element) });
    }
    timeStop("json processing");
    for (const localImage of localImages) {
        let size;
        if (sizeJSON[localImage.md5])
            size = sizeJSON[localImage.md5];
        else {
            size = await getImageSize(imageFolder + "/" + localImage.md5 + "." + localImage.ext);
            sizeJSON[localImage.md5] = size;
        }
    }
    fs.writeFileSync(extraInfoFolder + "/imageSize.json", JSON.stringify(sizeJSON, null, 4));
    let onlineFavsJSON = [];
    for (const id of favIDs) {
        if (keyPairJSON[id]) {
            onlineFavsJSON.push(keyPairJSON[id]);
            gotJSONFromDisk = true;
        }
        else {
            let apiJSON = JSON.parse(await getURL("https://e621.net/post/show.json?id=" + id));
            if (!apiJSON.id) {
                //Should not happen975313
                debugger;
                continue;
            }
            //Get additional info from html page
            if (apiJSON.status === "deleted")
                apiJSON = await addDeletedStuff(apiJSON);
            if (apiJSON.id)
                keyPairJSON[apiJSON.id] = apiJSON;
            if (apiJSON.md5)
                keyPairJSON[apiJSON.md5] = apiJSON
            onlineFavsJSON.push(apiJSON);
            saveToDisk(getJSONToSave(apiJSON));
        }
    }

    const notUploaded = [];
    const notFaved = [];
    const notFavedIsInferior = [];
    const notFavedDeleted = [];
    let notDownloaded = [];
    const faved = [];
    const betterVersionOnDisk = [];
    const betterVersionInferior = {};
    const inferiorSuperiorPair = [];
    const notDownloadedIgnored = [];

    for (const md5 of extraDownload) {
        if (!keyPairJSON[md5]) {
            let apiJSON = JSON.parse(await getURL("https://e621.net/post/show.json?md5=" + md5));
            if (!apiJSON.id) {
                notUploaded.push(md5);
                continue;
            }
            //Get additional info from html page
            if (apiJSON.status === "deleted") {
                apiJSON = await addDeletedStuff(apiJSON);
            }
            apiJSON.md5 = md5;
            keyPairJSON[apiJSON.md5] = apiJSON;
            keyPairJSON[apiJSON.id] = apiJSON;
            saveToDisk(getJSONToSave(apiJSON));
        }
    }
    finalSave();
    let onlineFavsMd5 = onlineFavsJSON.filter(element => { return element.md5 !== undefined }).map(element => { if (!element.md5) debugger; return element.md5 });

    const localImagesMd5Only = localImages.map(element => { return element.md5 })
    timeStart("favIDs loop")
    for (const favID of favIDs) {
        const jsonImage = keyPairJSON[favID];
        if (localImagesMd5Only.includes(jsonImage.md5))
            continue;
            //check if better version is on disk
        let betterOnDisk = false;
        let betterID;
        for (const post of Object.keys(keyPairJSON).map(key => { return keyPairJSON[key] })) {
            if (post.parent_id === null && post.delreason !== undefined) {
                const split = post.delreason.split("Inferior version/duplicate of post #");
                if (post.delreason.startsWith("Inferior version/duplicate of post") && parseInt(split[1]).toString().length === split[1].length)
                    post.parent_id = split[1];
            }
            if (post.parent_id === favID || jsonImage.parent_id === post.id) {
                if (post.status === "active" && jsonImage.status === "active")
                    continue;
                betterOnDisk = true;
                betterID = post.id;
                break;
            }
        }
        if (betterOnDisk) {
            betterVersionOnDisk.push(jsonImage);
            betterVersionInferior[betterID] = jsonImage.md5;
            continue;
        }
        if (ignoreNotDownloaded.includes(jsonImage.md5))
            notDownloadedIgnored.push(jsonImage.md5);
        else {
            if (autoDownloadNotDownloaded && jsonImage.md5) {
                const fileContent = await new Promise(resolve => {
                    request({
                        method: "GET", uri: encodeURI("https://static1.e621.net/data/" + jsonImage.md5.slice(0, 2) + "/" + jsonImage.md5.slice(2, 4) + "/" + jsonImage.md5 + "." + jsonImage.file_ext), headers: {
                        }, encoding: null
                    }, (error, response, body) => {
                        if (error)
                            debugger;
                        resolve(body);
                    });
                });
                if (fs.existsSync(imageFolder + "/" + jsonImage.md5 + "." + jsonImage.file_ext))
                    debugger;
                else
                    fs.writeFileSync(imageFolder + "/" + jsonImage.md5 + "." + jsonImage.file_ext, fileContent, "binary");
            }
            else
                notDownloaded.push(jsonImage.md5 || jsonImage.id);
        }
    }
    timeStop("favIDs loop");
    timeStart("localImages loop")
    for (const localImage of localImages) {
        if (onlineFavsMd5.includes(localImage.md5))
            faved.push(keyPairJSON[localImage.md5]);
        else {
            if (keyPairJSON[localImage.md5]) {
                const json = keyPairJSON[localImage.md5];
                if (json.status === "deleted") {
                    const split = json.delreason.split("Inferior version/duplicate of post #");
                    if (json.delreason.startsWith("Inferior version/duplicate of post") && parseInt(split[1]).toString().length === split[1].length)
                        notFavedIsInferior.push({ inferior: json, supperior: split[1] });
                    else {
                        if (!Object.keys(betterVersionInferior).includes(json.id.toString()))
                            notFavedDeleted.push(json);
                        else
                            inferiorSuperiorPair.push({ superior: json, inferior: keyPairJSON[betterVersionInferior[json.id]] })
                    }
                }
                else
                    notFaved.push(json);
            }
            else
                debugger;
        }
    }
    timeStop("localImages loop");
    timeStart("notDownloaded loop")
    const deletedJSONs = notFavedDeleted.concat(betterVersionOnDisk).map(element => { return element.id });
    for (const notDownloadedMD5 of notDownloaded) {
        const notDownloadedJSON = keyPairJSON[notDownloadedMD5];
        if (notDownloadedJSON && notDownloadedJSON.delreason) {
            const split = notDownloadedJSON.delreason.split("Inferior version/duplicate of post #");
            if (notDownloadedJSON.delreason.startsWith("Inferior version/duplicate of post") && parseInt(split[1]).toString().length === split[1].length) {
                const superiorID = parseInt(split[1]);
                if (!deletedJSONs.includes(superiorID))
                    notDownloaded.push(keyPairJSON[notDownloadedMD5]);
            }
            else
            notDownloaded.push(keyPairJSON[notDownloadedMD5]);
        }
    }
    timeStop("notDownloaded loop");

    const logging = false;
    if (logging) {
        for (const obj of notFavedIsInferior) {
            console.log((obj.inferior.md5 | obj.inferior.id) + " post is inferior, supperior " + (obj.supperior.md5 || obj.supperior.id));
        }
        for (const md5 of notUploaded) {
            console.log("No json for " + md5);
        }
        for (const json of notFavedDeleted) {
            console.log((json.md5 || json.id) + " is not faved, but deleted");
        }
        for (const obj of inferiorSuperiorPair) {
            console.log(obj.superior.md5 + " local version deleted, online version faved " + obj.inferior.md5);
        }
        for (const json of notFaved) {
            console.log(json.md5 + " not faved");
        }
        for (const notDownloadedMD5 of notDownloaded) {
            console.log(notDownloadedMD5 + " not downloaded");
        }
    }

    console.log(localImages.length + " local files");
    console.log("   " + notFaved.length + " of those are not faved");
    console.log("   " + notFavedIsInferior.length + " of those are not faved, but there is an superior version available");
    console.log("   " + notFavedDeleted.length + " of those are deleted from e621");
    console.log("");
    console.log((favIDs.length) + " online favorites");
    console.log("   " + notDownloaded.length + " of those don't have a local copy");
    console.log("   " + betterVersionOnDisk.length + " of those are higher quality than available online");
    timeStop("get favjson");
    return faved.concat(notFavedDeleted).concat(inferiorSuperiorPair.map(element => { return element.superior }));

    function saveToDisk(json) {
        jsonToSave.push(json);
        if (jsonToSave.length < 50)
            return;
        files = files.concat(jsonToSave);
        fs.writeFileSync(extraInfoFolder + "/posts.json", JSON.stringify(files, null, 4));
        jsonToSave = [];
    }

    function finalSave() {
        files = files.concat(jsonToSave);
        fs.writeFileSync(extraInfoFolder + "/posts.json", JSON.stringify(files, null, 4));
    }

    async function addDeletedStuff(json) {
        const id = json.id;
        const html = await getURL("https://e621.net/post/show/" + id);
        const children = getChildren(html);
        if (children === "")
            json.has_children = false;
        else
            json.has_children = true
        json.children = children;
        const sources = getSources(html);
        if (sources.length === 0) {
            json.source = null;
        }
        else {
            json.source = sources[0];
            json.sources = sources;
        }
        const md5 = await getMD5FromLocalImage(json);
        if (md5)
            json.md5 = md5;
        return json;

        async function getMD5FromLocalImage(json) {
            const width = json.width;
            const height = json.height;
            const canidates = [];
            for (const key of Object.keys(sizeJSON)) {
                const pair = sizeJSON[key];
                if (pair.width === width && pair.height === height) {
                    if (!keyPairJSON[key]) {
                        canidates.push(key);
                    }
                }
            }
            for (const md5 of canidates) {
                const canidateJSON = JSON.parse(await getURL("https://e621.net/post/show.json?md5=" + md5));
                if (canidateJSON.id === json.id)
                    return md5;

            }
        }

        function getChildren(html) {
            let result = [];
            const regexGetChildPart = /Child posts[\s\S]*?class="thumb" id="p[0-9]*"[\s\S]*?<span class='searchhelp'>/gm;
            const match = regexGetChildPart.exec(html);
            if (match === null)
                return "";
            let string = match[0]
            const regexGetIds = /"thumb" id="p([0-9]*)">/gm;
            let m;
            while ((m = regexGetIds.exec(string)) !== null) {
                if (m.index === regexGetIds.lastIndex) {
                    regexGetIds.lastIndex++;
                }
                result.push(m[1]);

            }

            return result.join(",");
        }
        function getSources(html) {
            return [];
            let result = [];
            const regexGetSourcesPart = /<div class='sourcelink-url'>[\s\S]*?<\/div>[\s\S]*?<\/li>/gm;
            const match = regexGetSourcesPart.exec(html);
            if (match === null)
                return result;
            let string = match[0];
            const regexGetSources = /a href="([\s\S]*?)"/gm;
            let m;

            while ((m = regexGetSources.exec(string)) !== null) {
                if (m.index === regexGetSources.lastIndex) {
                    regexGetSources.lastIndex++;
                }
                result.push(m[1]);
            }
            return result;
        }

    }

}

function getImageSize(imagePath) {
    return new Promise(resolve => {
        gm(imagePath)
            .size(function (err, size) {
                if (!err) {
                    resolve(size);
                }
                if (err)
                    resolve({ width: 0, height: 0 });
            });
    });
}

function getJSONToSave(json) {
    const newJSON = {};
    newJSON.id = json.id;
    newJSON.status = json.status
    newJSON.children = json.children;
    newJSON.parent_id = json.parent_id;
    if (json.md5) {
        newJSON.md5 = json.md5;
        newJSON.file_ext = json.file_ext;
    }
    if (json.delreason)
        newJSON.delreason = json.delreason;
    return newJSON;
}

async function getAllFavIdsFromUser(username) {
    if (!invalidateLocalUserFavs)
        if (fs.existsSync(extraInfoFolder + "/" + username + ".json"))
            return JSON.parse(fs.readFileSync(extraInfoFolder + "/" + username + ".json"));
    let result = [];
    let lastID = 90000000
    //Gets active posts
    while (true) {
        const json = JSON.parse(await getURL("https://e621.net/post/index.json?tags=fav:" + username + "&limit=320&before_id=" + lastID));
        for (const post of json) {
            result.push(post.id);
        }
        if (json.length !== 320)
            break;
        lastID = json[json.length - 1].id;
    }
    let page = 1;
    const regex = /span class="thumb" id="p([0-9]*)"/gm;
    //Get deleted posts directly from html because api doesn't return them
    while (true) {
        const html = await getURL("https://e621.net/post/index/" + page + "/fav:" + username + "%20status:deleted");
        let m;
        let matchCounter = 0;
        while ((m = regex.exec(html)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            result.push(parseInt(m[1]));
            matchCounter++;
        }
        if (matchCounter !== 75)
            break;
        page++;
    }
    fs.writeFileSync(extraInfoFolder + "/" + username + ".json", JSON.stringify(result, null, 4))
    return result;
}

function getURL(url) {
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

function timeStart(identifier) {
    timeTracker[identifier] = new Date().getTime() / 1000;
}
let profileDuration = false;
let profiler = {};

function timeStop(identifier) {
    if (!timeTracker[identifier])
        console.log("Logging: No identifier " + identifier);
    else {
        const duration = new Date().getTime() / 1000 - timeTracker[identifier];
        if (profileDuration) {
            if (profiler[identifier]) {
                profiler[identifier].push(duration);
            }
            else
                profiler[identifier] = [duration]
        }
        else
            console.log(identifier + ": " + duration);
    }
}

function logProfiler() {
    for (const key of Object.keys(profiler)) {
        const array = profiler[key];
        let total = 0;
        array.forEach(number => {
            total += number;
        });
        console.log("Identifier: " + key);
        console.log("Median: " + total / array.length);
        console.log("Max: " + Math.max(...array));
        console.log("Min: " + Math.min(...array));
    }
}
