const fs = require("fs");
const sqlite = require("better-sqlite3");

const dbFilePath = "/media/earlopain/External/Programmieren/quickjsstuff/com.plexapp.plugins.library.db";
const mountPath = "/media/earlopain/plex";
const folders = ["plexmedia/Pictures/e621", "plexmedia/Pictures/e621animation", "plexmedia/Pictures/e621safe"];
const librarySections = ["e621", "e621safe", "e621animation"];

const allFiles = {};

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

const sectionIDs = db.prepare('select id from library_sections where name in ("' + librarySections.join('","') + '")').all().map(e => e.id);
const allDBFiles = db.prepare('SELECT id, library_section_id, title, added_at FROM metadata_items WHERE deleted_at is NULL AND library_section_id in (' + sectionIDs.join(",") + ');').all()
const preparedStatement = db.prepare("UPDATE metadata_items SET added_at = ?, originally_available_at = ?, created_at = ? WHERE id = ?");

const clusterings = {};
let itemToCluster = {};
for (const id of sectionIDs) {
    clusterings[id] = {};
}

db.exec("BEGIN");
for (const dbFile of allDBFiles) {
    const dbTile = dbFile.title;
    const localFile = allFiles[dbTile];
    const dbDateFull = dbFile.added_at;
    const localDateSplit = localFile.created.split(" ")[0];
    if(clusterings[dbFile.library_section_id][localDateSplit] === undefined){
        clusterings[dbFile.library_section_id][localDateSplit] = [];
    }
    clusterings[dbFile.library_section_id][localDateSplit].push(dbFile.id);

    if (dbDateFull !== localFile.created) {
        const a = preparedStatement.run(localFile.created, localFile.created, localFile.created, dbFile.id.toString());
    }
}

removeItemClusers();
generateNewClusters();
addItemsToCluster();
db.exec("COMMIT");

function removeItemClusers() {
    let preparedStatement = db.prepare("DELETE FROM metadata_item_clusters where library_section_id in (" + sectionIDs.join(",") + ")");
    let a = preparedStatement.run();
}

function generateNewClusters(){
    for (const sectionID of Object.keys(clusterings)) {
        for (const clusterDate of Object.keys(clusterings[sectionID])) {
            const clusterCount = clusterings[sectionID][clusterDate].length;
            const start = clusterDate + " 00:00:00";
            const end = clusterDate + " 23:59:59";
            let preparedStatement = db.prepare("INSERT INTO metadata_item_clusters (zoom_level, library_section_id, title, count, starts_at, ends_at, extra_data) values(1, ?, ?, ?, ?, ?, '')")
            let a = preparedStatement.run(sectionID, clusterDate, clusterCount, start, end);
            for (const itemID of clusterings[sectionID][clusterDate]) {
                itemToCluster[itemID] = a.lastInsertRowid;
            }
        }
    }
}

function addItemsToCluster(){
    let a = db.prepare("DELETE FROM metadata_item_clusterings where id > 0").run();
    let preparedStatementInsert = db.prepare("INSERT INTO metadata_item_clusterings (metadata_item_id, metadata_item_cluster_id, [index], version) values(?, ?, null, 2)");
    let preparedStatementDelete = db.prepare("DELETE FROM metadata_item_clusterings WHERE metadata_item_id = ?");
    let updated = 0;
    for (const itemID of Object.keys(itemToCluster)) {
        const clusterID = itemToCluster[itemID];
        let a = preparedStatementDelete.run(itemID);
        if(a.changes !== 0)
        debugger;
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
