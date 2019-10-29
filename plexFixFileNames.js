const sqlite = require("better-sqlite3");

const dbFilePath = "/media/plex/Plex Media Server/Plug-in Support/Databases/com.plexapp.plugins.library.db";
const sections = ["musicvideos", "shortmovies"];

const db = sqlite(dbFilePath, { fileMustExist: true });
const sectionID = db.prepare("select * from library_sections where name in ('" + sections.join("','") + "')").all().map(element => element.id);

const items = db.prepare("select * from metadata_items where library_section_id in ('" + sectionID.join("','") + "')").all();
db.exec("BEGIN");
console.log("Updating");
let preparedUpdate = db.prepare("UPDATE metadata_items SET title = ? WHERE id = ? ");

for (const item of items) {
    const newName = item.title.replace(/_/g, " ");
    preparedUpdate.run(newName, item.id);
}

db.exec("COMMIT");
