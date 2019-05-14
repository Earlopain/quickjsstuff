const Writer = require("./writer.js").Writer;
const Reader = require("./reader.js");

const options = require("./option.js");

class Collections {
    constructor() {
        this.version = 20171227;
        this.counter = 0;
        this.collections = [];
    }

    add(c) {
        this.collections.push(c);
        this.counter++;
    }

    getIndex(index) {
        return this.collections[index];
    }
    getString(string) {
        let found = undefined;
        this.collections.forEach(collection => {
            if (collection.name === string)
                found = collection;
        });
        return found;
    }
    getIndexOf(string) {
        for (let i = 0; i < this.collections.length; i++) {
            if (this.collections[i].name === string)
                return i;
        }
        return undefined;
    }

    write(path, old) {
        let w = new Writer(path);
        w.writeInt(this.version);
        w.writeInt(this.counter);
        for(let i = 0; i < this.collections.length; i++)  {
            w.writeString(this.collections[i].name);
            w.writeInt(this.collections[i].md5s.length);
            for(let j = 0; j < this.collections[i].md5s.length; j++){
                w.writeString(this.collections[i].md5s[j]);
            }
        }
        w.end();
    }

    merge(otherCollections) {
        for(let i = 0; i < otherCollections.collections.length; i++){
            if (this.getString(otherCollections.collections[i].name) !== undefined) {
                const index = this.getIndexOf(otherCollections.collections[i].name);
                let joined = this.collections[index].md5s.concat(otherCollections.collections[i].md5s);
                this.collections[index].md5s = joined.filter(function (item, pos) {
                    return joined.indexOf(item) === pos;
                });
            }
            else {
                this.add(otherCollections.collections[i]);
            }
        }
    }

    toString() {
        let result = "\nCollection count: " + this.counter;
        this.collections.forEach(element => {
            result += element.toString();
        });
        return result;
    }

}

function read(path) {
    let c = new Collections();
    let r = new Reader.Reader(path);
    r.readInt();
    const amount = r.readInt();
    for (let i = 0; i < amount; i++) {
        let sc = new Collection(r.readString());
        const count = r.readInt();
        for (let j = 0; j < count; j++) {
            sc.add(r.readString());
        }
        c.add(sc);
    }
    return c;
}

class Collection {
    constructor(name) {
        this.name = name;
        this.md5s = [];
        this.counter = 0;
    }
    add(md5) {
        this.md5s.push(md5);
        this.counter++;
    }

    merge(collection) {
        collection.md5.forEach(element => {
            this.add(element);
        });
    }

    toString() {
        let result = "\n\nCollection " + this.name + ": " + this.counter;
        this.md5s.forEach(element => {
            result += "\n" + element;
        });
        return result;
    }
}
exports.Collections = Collections;
exports.Collection = Collection;
exports.read = read;