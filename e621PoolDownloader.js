const request = require("request");
const fs = require("fs");
const crypto = require("crypto");

const poolFile = __dirname + "/pools.json";
const poolMapperFile = __dirname + "/poolmapper.json";

const pools = fs.existsSync(poolFile) ? [...new Set(JSON.parse(fs.readFileSync(poolFile)))] : [];
const poolMapper = fs.existsSync(poolMapperFile) ? JSON.parse(fs.readFileSync(poolMapperFile)) : {};
const downloadFolder = "/media/plex/plexmedia/e621/pools/";
if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder);
}

class Pool {
    constructor(id) {
        this.id = id;
    }

    async init() {
        const poolJson = await getJSON("https://e621.net/pools/" + this.id + ".json");
        if (poolMapper[this.id] === undefined) {
            poolMapper[this.id] = poolJson.name.replace(/_/g, " ").replace(/\//g, "\\");
            fs.writeFileSync(poolMapperFile, JSON.stringify(poolMapper, null, 4), "utf8");
        }
        this.name = poolMapper[this.id];
        this.size = poolJson.post_count;
        this.images = [];
        this.isActive = poolJson.is_active;
        if (this.size === 0)
            return;
        const blueprint = poolJson.post_ids;
        let page = 1;
        let json;
        do {
            json = await getJSON("https://e621.net/posts.json?tags=pool:" + this.id + "&limit=320&page=" + page);
            for (const post of json.posts) {
                this.images[blueprint.indexOf(post.id)] = `https://static1.e621.net/data/${post.file.md5.substring(0, 2)}/${post.file.md5.substring(2, 4)}/${post.file.md5}.${post.file.ext}`;
            }
            page++;
        } while (json.posts.length === 320);
        console.log("Pool %s(%s) has %s posts", this.id, this.name, this.size)
    }
}

class LocalFile {
    constructor(filepath) {
        this.filepath = filepath;
        this.filename = filepath.split("/").pop()
    }

    async init() {
        this.md5 = await fileHash(this.filepath);
    }
}


async function getBinary(url, line) {
    return await getURL(url, "binary", line);
}

async function getJSON(url, line) {
    let json = await getURL(url, "utf8");
    return JSON.parse(json);
}

async function getURL(url, formating, line) {
    return new Promise(function (resolve, reject) {
        request.get({ url: url, headers: { "User-Agent": 'earlopain/pooldownloader' }, encoding: formating }, async (error, response, body) => {
            if (error) {
                console.log(error);
                process.exit();
            }
            if (response.statusCode !== 200 && response.statusCode !== 404) {
                console.log(response.statusCode);
                console.log(body);
                process.exit();
            }
            resolve(body);
        });
    });
}

function fileHash(filepath) {
    return new Promise((resolve, reject) => {
        let shasum = crypto.createHash("md5");
        try {
            let s = fs.ReadStream(filepath)
            s.on('data', function (data) {
                shasum.update(data)
            })
            // making digest
            s.on('end', function () {
                const hash = shasum.digest('hex')
                return resolve(hash);
            })
        } catch (error) {
            return reject('calc fail');
        }
    });
}

let tempFolderRemaining = [];
async function main() {
    const totalPools = pools.length;
    let totalDownloaded = 0;
    let totalRemoved = 0;
    for (const poolid of pools) {
        const pool = new Pool(poolid);
        await pool.init();
        if (pool.images.length === 0) {
            console.log("Pool %s(%s) is deleted", pool.id, pool.name)
            continue;
        }
        if (!fs.existsSync(downloadFolder + pool.name)) {
            fs.mkdirSync(downloadFolder + pool.name);
        }
        if (fs.existsSync(downloadFolder + pool.name + "/tmp")) {
            tempFolderRemaining.push(downloadFolder + "removed/" + pool.name + "TMP");
            fs.renameSync(downloadFolder + pool.name + "/tmp", downloadFolder + "removed/" + pool.name + "TMP");
        }
        const filePaths = fs.readdirSync(downloadFolder + pool.name).map(element => downloadFolder + pool.name + "/" + element);
        let localFiles = [];
        for (const localFilePath of filePaths) {
            const localFile = new LocalFile(localFilePath);
            await localFile.init();
            localFiles.push(localFile);
        }

        console.log("%s files locally available", localFiles.length)

        //check if there is any update, so files don't get moved around needlessly
        let updateNeeded = false;
        for (let i = 0; i < pool.images.length; i++) {
            const imageURL = pool.images[i];
            const md5 = imageURL.substr(36, 32);
            let alreadyFound = false
            for (let j = 0; j < localFiles.length; j++) {
                if (localFiles[j].md5 === md5 && i + 1 == localFiles[j].filename.split(".")[0]) {
                    alreadyFound = true;
                    break;
                }
            }
            if (!alreadyFound)
                updateNeeded = true;
        }
        if (!updateNeeded) {
            console.log("No update needed");
            continue;
        }


        fs.mkdirSync(downloadFolder + pool.name + "/tmp")
        for (const localFile of localFiles) {   //move all local files to tmp directory
            const localFilePath = localFile.filepath;
            fs.renameSync(localFilePath, downloadFolder + pool.name + "/tmp/" + localFile.filename);
        }
        let downloadedFilesCount = 0
        for (let i = 0; i < pool.images.length; i++) {
            const imageURL = pool.images[i];
            const md5 = imageURL.substr(36, 32);
            let alreadyFound = false
            for (let j = 0; j < localFiles.length; j++) {
                if (localFiles[j].md5 === md5) { //file already exists, move to apropriate new location
                    fs.renameSync(downloadFolder + pool.name + "/tmp/" + localFiles[j].filename, downloadFolder + pool.name + "/" + (i + 1) + "." + imageURL.substr(69));
                    alreadyFound = true;
                    break;
                }
            }
            if (alreadyFound)
                continue;
            downloadedFilesCount++;
            totalDownloaded++;
            const bin = await getBinary(imageURL);
            fs.writeFileSync(downloadFolder + pool.name + "/" + (i + 1) + "." + imageURL.substr(69), bin, "binary");
        }
        //remove tmp dir
        const removedFiles = fs.readdirSync(downloadFolder + pool.name + "/tmp").map(element => downloadFolder + pool.name + "/tmp/" + element)
        if (removedFiles.length !== 0) { //create folder to store files
            if (!fs.existsSync(downloadFolder + "removed/" + pool.name)) {
                fs.mkdirSync(downloadFolder + "removed/" + pool.name);
            }
        }
        for (const file of removedFiles) {
            const hash = await fileHash(file);
            fs.renameSync(file, downloadFolder + "removed/" + pool.name + "/" + hash + "." + file.split(".").pop());
        }
        totalRemoved += removedFiles.length;
        console.log("%s local files removed", removedFiles.length);
        console.log("%s files fetched", downloadedFilesCount);
        fs.rmdirSync(downloadFolder + pool.name + "/tmp")
        localFiles = fs.readdirSync(downloadFolder + pool.name);
        if (!pool.isActive && localFiles.length === pool.size) {  //nothing will change, remove from file
            console.log("pool is inactive, please remove manually");
            continue;
        }
    }
    console.log("%s total pools", totalPools);
    console.log("%s images downloaded", totalDownloaded);
    console.log("%s images removed", totalRemoved);
    if (tempFolderRemaining.length > 0) {
        console.log("Previous run was interupted. These folders were not cleaned up");
        console.log(tempFolderRemaining.join("\n"));
    }
}

main();
