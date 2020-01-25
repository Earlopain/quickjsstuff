const Collections = require("./collections.js").Collections;
const Collection = require("./collections.js").Collection;
const Writer = require("./writer.js").Writer;
const Reader = require("./reader.js");

const fs = require("fs");

const fileName = "./onlinestats.db";

const operands = ["<=", ">=", "=", "<", ">"];

const offlineOptions = ["ar", "cs", "hp", "od", "sr", "bpm", "length", "gm", "status", "rank", "alreadyplayed"];
const onlineOptions = ["genre", "language", "favs"];
const optionsInt = [offlineOptions[0], offlineOptions[1], offlineOptions[2], offlineOptions[3], offlineOptions[4], offlineOptions[5], offlineOptions[6], onlineOptions[2]];
const optionsBool = [offlineOptions[10]];

const gamemodes = ["standart", "taiko", "ctb", "mania"];
const ranks = ["s+", "s+", "ss", "s", "a", "b", "c", "d", "none"];
const status = ["ranked", "approved", "loved", "unranked"]
const genres = ["anime", "videogame", "novelity", "electronic", "pop", "rock", "hiphop", "other"];
const languages = ["japanese", "instrumental", "english", "korean", "german", "spanish", "italian", "frensh", "other"];

const seperatorOption = "&";
const seperatorCollection = "&&";

class Options {
    constructor(string) {
        this.options = [];
        this.fetchOnline = false;
        const collectionDefinitions = string.split(seperatorCollection);
        for (let h = 0; h < collectionDefinitions.length; h++) {
            const name = collectionDefinitions[h].split(":")[1];
            if (name === undefined || name === "")
                throw new Error("Collection needs a name: " + collectionDefinitions[h]);
            const parts = collectionDefinitions[h].split(":")[0].replace(" ", "").toLowerCase().split(seperatorOption);
            let containsGM = false;
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].startsWith(offlineOptions[7]))
                    containsGM = true;
            }
            if (!containsGM) {
                parts.push(offlineOptions[7] + "=" + gamemodes[0]);
            }
            let singleCollection = new SingleCollection(name);
            let fetchOnline = false;
            for (let i = 0; i < parts.length; i++) {
                let found = false;

                for (let j = 0; j < operands.length; j++) {
                    if (parts[i].indexOf(operands[j]) !== -1) {
                        found = true;
                        const split = parts[i].split(operands[j]);
                        if (split.length !== 2)
                            throw new Error("Invalid option " + parts[i]);
                        for (let k = 0; k < operands.length; k++) {
                            if (split[1].startsWith(operands[k]))
                                throw new Error("Invalid option " + parts[i]);
                        }
                        if (onlineOptions.indexOf(split[0]) !== -1) {
                            this.fetchOnline = true;
                            fetchOnline = true;
                        }
                        singleCollection.addSingeOption(new SingleOption(split[0], operands[j], split[1]), fetchOnline);
                        break;
                    }
                }
                if (!found) {
                    throw new Error("Invalid option " + parts[i]);
                }
            }
            this.options.push(singleCollection);
        }
    }

    verifyKey(key) {

    }

    async constructCollection(db, key, prefix) {
        let collections = new Collections();
        if (this.fetchOnline) {
            console.log("Fetching online stuff...");
            let fileExists = fs.existsSync(fileName);
            let mapsetsAlreadyFetched = [];
            this.verifyKey(key);
            let count = 0;
            let writer;
            let reader;
            let onlineStuffFromDisk = [];
            if (!fileExists)
                writer = new Writer(fileName);

            else {
                reader = new Reader.Reader(fileName);
                while (!reader.endReached())
                    onlineStuffFromDisk.push({ setID: reader.readInt(), genre: reader.readByte(), language: reader.readByte(), favs: reader.readInt() });
            }
            let prevText = "";
            let nextText = "";
            for (let i = 0; i < db.beatmaps.length; i++) {
                if (db.beatmaps[i].beatmapId !== 0 && db.beatmaps[i].beatmapSetId !== 0) {
                    try {
                        if (mapsetsAlreadyFetched.indexOf(db.beatmaps[i].beatmapSetId) !== -1) {
                            db.beatmaps[i].setOnlineStuff(db.getBeatmapAlreadyFinishedFromMapsetId(db.beatmaps[i].beatmapSetId));
                        }
                        else {
                            if (!fileExists) {
                                await db.beatmaps[i].addOnlineStuff(key);
                                writer.writeInt(db.beatmaps[i].beatmapSetId);
                                writer.writeByte(db.beatmaps[i].genre);
                                writer.writeByte(db.beatmaps[i].language);
                                writer.writeInt(db.beatmaps[i].favorites);
                                mapsetsAlreadyFetched.push(db.beatmaps[i].beatmapSetId);
                            }
                            else {
                                for (let j = 0; j < onlineStuffFromDisk.length; j++) {
                                    if (db.beatmaps[i].beatmapSetId === onlineStuffFromDisk[j].setID) {
                                        db.beatmaps[i].genre = onlineStuffFromDisk[j].genre;
                                        db.beatmaps[i].language = onlineStuffFromDisk[j].language;
                                        db.beatmaps[i].favorites = onlineStuffFromDisk[j].favs;
                                        mapsetsAlreadyFetched.push(db.beatmaps[i].beatmapSetId);
                                    }
                                }
                            }
                        }

                    }
                    catch (e) {
                        console.log("error at " + i + " beatmapid " + db.beatmaps[i].beatmapId + "\n" + e);
                    }
                    finally {
                        count++;
                    }
                }
                if (!fileExists) {
                    nextText = count + " out of " + db.folderCount;
                    if (prevText !== nextText) {
                        console.log(nextText);
                        prevText = nextText;
                    }
                }
            }
            if (!fileExists)
                writer.end();
        }

        for (let i = 0; i < this.options.length; i++) {
            let singleCollection = new Collection(prefix + this.options[i].name);
            let possibleBeatmaps = db.beatmaps;
            for (let j = 0; j < this.options[i].options.length; j++) {
                let currentOption = this.options[i].options[j];
                possibleBeatmaps = removeWrongBeatmaps(possibleBeatmaps, currentOption);
            }
            for (let j = 0; j < possibleBeatmaps.length; j++) {
                singleCollection.add(possibleBeatmaps[j].md5);
            }
            collections.add(singleCollection);
        }
        return collections;
    }
    toString() {
        let result = "\n" + this.options.length + " collections";
        for (let i = 0; i < this.options.length; i++) {
            result += this.options[i].toString();
        }
        return result;
    }
}

class SingleCollection {
    constructor(name, onlineStuff) {
        this.name = name;
        this.onlineStuff = onlineStuff;
        this.options = [];
    }

    addSingeOption(option) {
        this.options.push(option);
    }

    toString() {
        let result = "\n" + this.name;
        for (let i = 0; i < this.options.length; i++) {
            result += this.options[i].toString();
        }
        return result;
    }
}

class SingleOption {
    constructor(first, symbol, second) {
        this.first = first;
        this.symbol = symbol;
        this.second = second;
        this.numerical;
        this.validate();

        this.second = this.second == "true" ? 1 : this.second == "false" ? 0 : this.second;

        if (this.first === offlineOptions[7]) {//const gamemodes = ["standart", "taiko", "ctb", "mania"];

            switch (this.second) {
                case gamemodes[0]:
                    this.second = 0
                    break;
                case gamemodes[1]:
                    this.second = 1;
                    break;
                case gamemodes[2]:
                    this.second = 2;
                    break;
                case gamemodes[3]:
                    this.numerical = 3;
                    break;

                default:
                    throw new Error("Invalid gamemode " + this.second + " even after precheck");
            }
        }
        if (this.first === offlineOptions[8]) {
            switch (this.second) {//const status = ["ranked", "approved", "loved"]
                case status[0]:
                    this.second = 4;
                    break;
                case status[1]:
                    this.second = 5;
                    break;
                case status[2]:
                    this.second = 7;
                    break;
                case status[3]:
                    this.second = 2;
                    break;

                default:
                    throw new Error("Invalid gamemode " + this.second + " even after precheck");
            }
        }
        if (this.first === offlineOptions[9]) {
            switch (this.second) {//const ranks = ["SS+", "S+", "SS", "S", "A", "B", "C", "D", "none"];
                case ranks[0]:
                    this.second = 0;
                    break;
                case ranks[1]:
                    this.second = 1;
                    break;
                case ranks[2]:
                    this.second = 2;
                    break;
                case ranks[3]:
                    this.second = 3;
                    break;
                case ranks[4]:
                    this.second = 4;
                    break;
                case ranks[5]:
                    this.second = 5;
                    break;
                case ranks[6]:
                    this.second = 6;
                    break;
                case ranks[7]:
                    this.second = 7;
                    break;
                case ranks[8]:
                    this.second = 9;
                    break;

                default:
                    throw new Error("Invalid gamemode " + this.second + " even after precheck");
            }
        }
        if (this.first === onlineOptions[0]) {
            switch (this.second) {//const genres = ["anime", "videogame", "novelity", "electronic", "pop", "rock", "hiphop", "other"];
                case genres[0]:
                    this.second = 0;
                    break;
                case genres[1]:
                    this.second = 1;
                    break;
                case genres[2]:
                    this.second = 2;
                    break;
                case genres[3]:
                    this.second = 3;
                    break;
                case genres[4]:
                    this.second = 4;
                    break;
                case genres[5]:
                    this.second = 5;
                    break;
                case genres[6]:
                    this.second = 6;
                    break;
                case genres[7]:
                    this.second = 7;
                    break;

                default:
                    throw new Error("Invalid genre " + this.second + " even after precheck");
            }
        }
        if (this.first === onlineOptions[1]) {
            switch (this.second) {//const languages = ["japanese", "instrumental", "english", "korean", "german", "spanish", "italian", "frensh", "other"];
                case languages[0]:
                    this.second = 0;
                    break;
                case languages[1]:
                    this.second = 1;
                    break;
                case languages[2]:
                    this.second = 2;
                    break;
                case languages[3]:
                    this.second = 3;
                    break;
                case languages[4]:
                    this.second = 4;
                    break;
                case languages[5]:
                    this.second = 5;
                    break;
                case languages[6]:
                    this.second = 6;
                    break;
                case languages[7]:
                    this.second = 7;
                    break;
                case languages[8]:
                    this.second = 8;
                    break;

                default:
                    throw new Error("Invalid genre " + this.second + " even after precheck");
            }
        }
    }

    validate() {
        if (offlineOptions.indexOf(this.first) === -1 && onlineOptions.indexOf(this.first) === -1)
            throw new Error("Invalid option " + this.first + this.symbol + this.second);
        if (optionsInt.indexOf(this.first) !== -1 && (isNaN(parseFloat(this.second)) || isNaN(parseInt(this.second))))
            throw new Error(this.first + " expects a number");
        if (optionsBool.indexOf(this.first) !== -1 && this.symbol !== "=" && (this.second !== "true" || this.second !== "false"))
            throw new Error(this.first + " expects a boolean");
        if (this.first === offlineOptions[7] && gamemodes.indexOf(this.second) === -1)
            throw new Error("Unknown gamemode: " + this.second);
        if (this.first === offlineOptions[8] && status.indexOf(this.second) === -1)
            throw new Error("Unknown status: " + this.second);
        if (this.first === offlineOptions[9] && ranks.indexOf(this.second) === -1)
            throw new Error("Unknown rank: " + this.second);
        if (this.first === onlineOptions[0] && genres.indexOf(this.second) === -1)
            throw new Error("Unknown genre: " + this.second);
        if (this.first === onlineOptions[0] && languages.indexOf(this.second) === -1)
            throw new Error("Unknown language: " + this.second);
        this.second = this.second === "true" ? 1 : this.second === "false" ? 0 : this.second;
    }

    toString() {
        return "\n" + this.first + " " + this.symbol + " " + this.second;
    }
}

exports.Options = Options;
exports.offline = offlineOptions;
exports.online = onlineOptions;

function removeWrongBeatmaps(beatmaps, option) {
    let result = [];
    const length = beatmaps.length;
    for (let i = 0; i < beatmaps.length; i++) {
        let currentBeatmap = beatmaps[i];
        const value = currentBeatmap.getProperty(option.first);
        const isValid = compare(option, value);
        if (isValid) {
            result.push(currentBeatmap);
        }
    }
    return result;
}


function compare(option, numberBM) {
    switch (option.symbol) {
        case operands[0]://const operands = ["<=", ">=", "=", "<", ">"];
            return parseFloat(numberBM) <= option.second;
            break;
        case operands[1]:
            return parseFloat(numberBM) >= option.second;
            break;
        case operands[2]:
            return parseFloat(numberBM) == option.second;
            break;
        case operands[3]:
            return parseFloat(numberBM) < option.second;
            break;
        case operands[4]:
            return parseFloat(numberBM) > option.second;
            break;

        default:
            throw new Error("Invalid operand " + option.symbol + " even after precheck");
    }
}
