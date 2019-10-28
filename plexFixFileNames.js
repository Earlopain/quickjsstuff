const sqlite = require("better-sqlite3");

const dbFilePath = "/media/plex/Plex Media Server/Plug-in Support/Databases/com.plexapp.plugins.library.db";
const section = "Music Videos";

const db = sqlite(dbFilePath, { fileMustExist: true });
const sectionID = db.prepare("select * from library_sections where name= ?").get(section).id;
const items = db.prepare("select * from metadata_items where library_section_id = ?").all(sectionID);

db.exec("BEGIN");


let preparedUpdate = db.prepare("UPDATE metadata_items SET title = ? WHERE id = ? ");

for (const item of items) {
    const newName = item.title.replace(/_/g, " ");
    if(newName === item.title){
        continue;
    }
    preparedUpdate.run(newName, item.id);
}

db.exec("COMMIT");
