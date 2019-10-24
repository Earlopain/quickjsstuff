const fs = require("fs");
const sqlite = require("better-sqlite3");

const dbFilePath = "/media/earlopain/External/Programmieren/quickjsstuff/com.plexapp.plugins.library.db";
const mountPath = "/media/earlopain/plex";
const folders = ["plexmedia/Pictures/e621", "plexmedia/Pictures/e621animation", "plexmedia/Pictures/e621safe"];
const librarySections = ["e621", "e621safe", "e621animation"];

const allFiles = {};

//populate local file information. key is the filename
//it also gets the filepath and a datestring at which it was created
//this datestring will be written as is into the db
for (let folder of folders) {
    folder = mountPath + "/" + folder;
    const files = fs.readdirSync(folder);
    for (const file of files) {
        const filePath = folder + "/" + file;
        let properties = {};
        properties["filepath"] = filePath;
        const stats = fs.statSync(filePath);
        const date = new Date(stats.mtimeMs);
        const dateString = createDBDate(date);
        properties["created"] = dateString;
        allFiles[file.split(".")[0]] = properties;
    }
}

const db = sqlite(dbFilePath, { fileMustExist: true });
//get all sectionIds where the name is in librarySections
//we do not want to operate in all sections
const sectionIDs = db.prepare('select id from library_sections where name in ("' + librarySections.join('","') + '")').all().map(e => e.id);
//get all items from those sections which did not get deleted
const allDBFiles = db.prepare('SELECT id, library_section_id, title, added_at FROM metadata_items WHERE deleted_at is NULL AND library_section_id in (' + sectionIDs.join(",") + ');').all()
//update a items date information
const preparedStatement = db.prepare("UPDATE metadata_items SET added_at = ?, originally_available_at = ?, created_at = ? WHERE id = ?");

const clusterings = {};
let itemToCluster = {};
for (const id of sectionIDs) {
    clusterings[id] = {};
}

db.exec("BEGIN");
updateFileDates();
removeItemClusers();
generateNewClusters();
addItemsToCluster();
db.exec("COMMIT");

function updateFileDates(){
    for (const dbFile of allDBFiles) {
        const dbTile = dbFile.title;
        const localFile = allFiles[dbTile];
        const dbDateFull = dbFile.added_at;
        const localDateSplit = localFile.created.split(" ")[0];
        //store items of section seperatly and also seperate section entries by the date it was added
        //this is important so we can later reconstruct the clusters in which they will be display (timeline view)
        if(clusterings[dbFile.library_section_id][localDateSplit] === undefined){
            clusterings[dbFile.library_section_id][localDateSplit] = [];
        }
        clusterings[dbFile.library_section_id][localDateSplit].push(dbFile.id);
    
        if (dbDateFull !== localFile.created) {
            preparedStatement.run(localFile.created, localFile.created, localFile.created, dbFile.id.toString());
        }
    }
}

function removeItemClusers() {
    //simply remove all clusters of those sections, since we will rebuild them anyways
    let preparedStatement = db.prepare("DELETE FROM metadata_item_clusters where library_section_id in (" + sectionIDs.join(",") + ")");
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
