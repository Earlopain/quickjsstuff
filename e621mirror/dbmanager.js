const Database = require("better-sqlite3");
const network = require("./network.js");
const fs = require("fs");
const postJson = require("./postjson.js");
let db = new Database("e621.db");

const startTransaction = db.prepare("BEGIN");
const endTransaction = db.prepare("COMMIT");

const saveSteps = 1;

const jsondir = "./json/";
/**
 * status: 0 active 1 flagged 2 pending 3 deleted
 * rating: 0 s 1 q 2 e
 * fileext: 0 png 1 jpg 2 gif 3 webm 4 swf
 */

main()
async function main() {
    init();
    await start();
}

async function start() {
    let files = fs.readdirSync(jsondir);
    let statement = db.prepare(createStatement(new postJson.Post(JSON.parse(fs.readFileSync(jsondir + files[0])))));
    let prev = "";
    startTransaction.run();
    for (let i = 0; i < files.length; i++) {
        const now = (i / files.length).toFixed(0);
        if (prev !== now && now % saveSteps === 0) {
            prev = now;
            endTransaction.run();
            console.log(now);
            startTransaction.run();
        }
        const json = Object.values(new postJson.Post(JSON.parse(fs.readFileSync(jsondir + files[i]))));
        statement.run(json);
    }
}

function createStatement(json) {
    let result = "INSERT INTO posts VALUES(";
    Object.keys(json).forEach(element => {
        result += "?,";
    });
    return result.slice(0, -1) + ")";
}

function init() {
    db.prepare(`CREATE TABLE posts (
        id	INTEGER NOT NULL,
        author	TEXT,
        creator_id	INTEGER,
        created_at	INTEGER,
        tags TEXT,
        artists TEXT,
        sources TEXT,
        status	TEXT,
        description	TEXT,
        fav_count	INTEGER,
        score	INTEGER,
        rating	TEXT,
        children TEXT,
        parent_id	INTEGER,
        has_notes	INTEGER NOT NULL,
        has_comments	INTEGER NOT NULL,
        md5	TEXT,
        file_extension	TEXT,
        file_size	INTEGER NOT NULL,
        width	INTEGER NOT NULL,
        height	INTEGER NOT NULL,
        del_reason	TEXT,
        PRIMARY KEY(id)
    );`).run();
}