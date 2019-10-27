const fs = require("fs");
const glob = require("glob");
const sqlite = require("better-sqlite3");

const dbFilePath = "/media/plex/Plex Media Server/Plug-in Support/Databases/com.plexapp.plugins.library.db";
const path = "/media/plex/plexmedia/e621";
console.log("Collecting local files");
const localFiles = glob.sync(path + "/**/*", { nodir: true });
const allFiles = {};

const db = sqlite(dbFilePath, { fileMustExist: true });

const mediaParts = db.prepare('select * from media_parts').all();
const mediaItems = db.prepare('select * from media_items').all();
const metadataItems = db.prepare("select * from metadata_items").all();
//populate local file information. key is the filename
//it also gets the filepath and a datestring at which it was created
//this datestring will be written as is into the db
console.log("Getting local file dates. This might take a while");
for (let mediaPart of mediaParts) {
    if (!localFiles.includes(mediaPart.file))
        continue;
    let mediaItem = mediaItems.filter(element => {
        return element.id === mediaPart.media_item_id;
    })[0];
    let metadataItem = metadataItems.filter(element => {
        return element.id === mediaItem.metadata_item_id;
    })[0];

    let properties = {};
    const stats = fs.statSync(mediaPart.file);
    const date = new Date(stats.mtimeMs);
    const dateString = createDBDate(date);
    properties["created"] = dateString;
    properties["metadataItem"] = metadataItem;
    allFiles[mediaPart.file] = properties;
}

const clusterings = {};
let itemToCluster = {};

db.exec("BEGIN");
console.log("Fixing file dates");
updateFileDates();
console.log("Removing clusters");
removeItemClusers();
console.log("Generating new clusters");
generateNewClusters();
console.log("Adding files to clusters");
addItemsToCluster();
db.exec("COMMIT");
console.log("COMMITED");

function updateFileDates() {
    //update a items date information
    const preparedStatement = db.prepare("UPDATE metadata_items SET added_at = ?, originally_available_at = ?, created_at = ? WHERE id = ?");
    for (const key of Object.keys(allFiles)) {
        const dbFile = allFiles[key];
        const dbDateFull = dbFile.metadataItem.added_at;
        const localDateSplit = dbFile.created.split(" ")[0];
        if (clusterings[dbFile.metadataItem.library_section_id] === undefined) {
            clusterings[dbFile.metadataItem.library_section_id] = {};
        }
        //store items of section seperatly and also seperate section entries by the date it was added
        //this is important so we can later reconstruct the clusters in which they will be display (timeline view)
        if (clusterings[dbFile.metadataItem.library_section_id][localDateSplit] === undefined) {
            clusterings[dbFile.metadataItem.library_section_id][localDateSplit] = [];
        }
        clusterings[dbFile.metadataItem.library_section_id][localDateSplit].push(dbFile.metadataItem.id);

        if (dbDateFull !== dbFile.created) {
            preparedStatement.run(dbFile.created, dbFile.created, dbFile.created, dbFile.metadataItem.id.toString());
        }
    }
}

function removeItemClusers() {
    //simply remove all clusters of those sections, since we will rebuild them anyways
    //TODO still deleted all clusters for id, only delete if sure that no items will remain
    let preparedStatement = db.prepare("DELETE FROM metadata_item_clusters where library_section_id in (" + Object.keys(clusterings).join(",") + ")");
    preparedStatement.run();
}

function generateNewClusters(){
    for (const sectionID of Object.keys(clusterings)) {
        for (const clusterDate of Object.keys(clusterings[sectionID])) {
            const clusterCount = clusterings[sectionID][clusterDate].length;
            //since each cluster will contain one days items, add one for each with the info we stored in clusterings at updateFileDates()
            const start = clusterDate + " 00:00:00";
            const end = clusterDate + " 23:59:59";
            let preparedStatement = db.prepare("INSERT INTO metadata_item_clusters (zoom_level, library_section_id, title, count, starts_at, ends_at, extra_data) values(1, ?, ?, ?, ?, ?, '')")
            let a = preparedStatement.run(sectionID, clusterDate, clusterCount, start, end);
            //save for later which item will belong to which cluster
            for (const itemID of clusterings[sectionID][clusterDate]) {
                itemToCluster[itemID] = a.lastInsertRowid;
            }
        }
    }
}

function addItemsToCluster(){
    //Simply delete an entry if it already exists.
    //We will add it after anyways
    let preparedStatementDelete = db.prepare("DELETE FROM metadata_item_clusterings WHERE metadata_item_id = ?");
    let preparedStatementInsert = db.prepare("INSERT INTO metadata_item_clusterings (metadata_item_id, metadata_item_cluster_id, [index], version) values(?, ?, null, 2)");
    //add each item to its respective cluster
    for (const itemID of Object.keys(itemToCluster)) {
        const clusterID = itemToCluster[itemID];
        preparedStatementDelete.run(itemID);
        preparedStatementInsert.run(itemID, clusterID);
    }
}

function createDBDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return [year, month, day].map(e => e.toString().padStart(2, "0")).join("-") + " " + [hours, minutes, seconds].map(e => e.toString().padStart(2, "0")).join(":");
}
