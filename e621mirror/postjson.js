const fs = require("fs");

class Post {
    constructor(json) {
        this.id = json.id;
        this.author = json.author;
        this.creator_id = json.creator_id;
        this.created_at = json.created_at.s;
        this.tags = json.tags;
        this.artists = json.artist;
        this.sources = json.sources;
        this.status = json.status;
        this.description = json.description;
        this.fav_count = json.fav_count;
        this.score = json.score;
        this.rating = json.rating;
        this.children = json.children;
        this.parent_id = json.parent_id;
        this.has_notes = json.has_notes;
        this.has_comments = json.has_comments;
        this.md5 = json.md5;
        this.file_extension = json.file_ext;
        this.file_size = json.file_size;
        this.width = json.width;
        this.height = json.height;
        this.del_reason = json.delreason;
        //this.locked_tags = json.locked_tags;
        this.normalize();
    }

    valuesToInsertString() {
        let result = "";
        Object.keys(this).forEach(key => {
            result += this[key] + ",";
        });
        return result.slice(0, -1);
    }

    normalize() {
        let bool = true;
        Object.keys(this).forEach(key => {
            if (typeof this[key] === "boolean")
                this[key] = this[key] ? 1 : 0;
            else if (key === "has_children")
                this[key] = 0;
            else if (this[key] == undefined)
                this[key] = null;
            else if (key === "children")
                this[key] = this[key].replace(/,/g, " ");
            else if (this[key] === "")
                this[key] = null;
            else if (Array.isArray(this[key]))
                this[key] = this[key].join(" ");

        });
        if (this["sources"] === null)
            this["sources"] = "";
        if (this["artists"] === null)
            this["artists"] = "";
        if (this["tags"] === null)
            this["tags"] = "";
        if (this["has_comments"] === null)
            this["has_comments"] = 0;
        if (this["locked_tags"] === null)
            this["locked_tags"] = "";
        if (this["children"] === null)
            this["children"] = "";
        if (this["height"] === null)
            this["heigth"] = 0;
        if (this["width"] === null)
            this["width"] = 0;
    }
}

function main() {
    const files = fs.readdirSync("./json");
    for (let i = 0; i < files.length; i++) {
        const json = new Post(JSON.parse(fs.readFileSync("./json/" + files[i])));
        if (json.width === null)
            console.log(i);
    }
}
//main();
exports.Post = Post;