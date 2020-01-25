const fs = require("fs");

const IntDoublePair = require("./intdoublepair.js").IntDoublePair;
const TimingPoint = require("./timingpoint.js").TimingPoint;
const OsuDB = require("./osudb.js").OsuDB;
const Beatmap = require("./beatmap.js").Beatmap;

class Reader {
    constructor(path) {
        this.file = fs.readFileSync(path);
        this.offset = 0;
    }
    //no need to reverse one element
    readByte() {
        //read first byte, store it, convert it to hex and then convert hex to int
        const byte = parseInt(this.file.slice(this.offset, this.offset + 1).toString("hex"), 16);
        //cut first byte of
        this.offset += 1;
        return byte;
    }

    readShort() {
        //same as with byte, except cut 2 off, because short and reverse it cause of little endian
        const short = parseInt(this.file.slice(this.offset, this.offset + 2).reverse().toString("hex"), 16);
        this.offset += 2;
        return short;
    }
    //4bytes
    readInt() {
        const int = parseInt(this.file.slice(this.offset, this.offset + 4).reverse().toString("hex"), 16);
        this.offset += 4;
        return int;
    }
    //8bytes
    readLong() {
        const long = parseInt(this.file.slice(this.offset, this.offset + 8).reverse().toString("hex"), 16);
        this.offset += 8;
        return long;
    }

    readULEB128() {
        let result = 0;
        let shift = 0;
        const MASK_DATA = 0x7f;     //0111 1111
        const MASK_CONTINUE = 0x80; //1000 0000
        let byte;
        do {
            byte = this.readByte();
            result += (byte & MASK_DATA) << shift;
            shift += 7;

        } while ((byte & MASK_CONTINUE) !== 0);
        return result;
    }

    readSingle() {
        const fp = toArrayBuffer(this.file.slice(this.offset, this.offset + 4));
        this.offset += 4;
        return new DataView(fp).getFloat32(0, true);
    }

    endReached() {
        return this.offset === this.file.length;
    }

    readDouble() {
        const fp = toArrayBuffer(this.file.slice(this.offset, this.offset + 8));
        this.offset += 8;
        return new DataView(fp).getFloat64(0, true);
    }

    readBoolean() {
        const state = this.readByte();
        if (state === 0 || state === 1)
            return state;
        throw new Error("Tried reading a boolean, state is " + state + " which is unknown");
    }

    readString() {
        const status = this.readByte();
        if (status === 0)
            return "";
        else if (status === 11) {
            const length = this.readULEB128();
            const username = this.file.slice(this.offset, this.offset + length).toString();
            this.offset += length;
            return username;
        }
        else
            throw new Error("Tried reading a string, status is " + status + " which is unknown");
    }

    readIntDoublePair() {
        this.readByte();
        const int = this.readInt();
        this.readByte();
        const double = this.readDouble();
        return new IntDoublePair(int, double);
    }

    readTimingPoints(prev) {
        const bpm = this.readDouble();
        const offsetT = this.readDouble();
        const inherited = !this.readBoolean();
        //bpm is relative but there is no tp before it
        if (inherited && prev === undefined)
            return undefined;

        return new TimingPoint(bpm, offsetT, inherited, prev);
    }

    readOsuDB() {
        const version = this.readInt();
        const folderCount = this.readInt();
        const accountLocked = this.readBoolean();
        const unlockTime = this.readLong();
        const username = this.readString();
        const beatmapCount = this.readInt();

        let beatmaps = [];
        for (let i = 0; i < beatmapCount; i++) {
            beatmaps.push(this.readBeatmap(version));
        }

        return new OsuDB(version, folderCount, accountLocked, unlockTime, username, beatmapCount, beatmaps);
    }

    readCollection() {
        this.readInt();
        const count = this.readInt();
        let hash = [];
        for (let i = 0; i < count; i++) {
            hash.push(this.readString());
            const scoreCount = this.readInt();
            for (let j = 0; j < scoreCount; j++) {
                this.readByte();
                this.readInt();
                this.readString();
                this.readString();
                this.readString();
                this.readShort();
                this.readShort();
                this.readShort();
                this.readShort();
                this.readShort();
                this.readShort();
                this.readInt();
                this.readShort();
                this.readBoolean();
                this.readInt();
                this.readString();
                this.readLong();
                this.readInt();
                this.readLong();
            }
        }
        return hash;

    }

    readBeatmap(version) {
        const size = this.readInt();
        const artistName = this.readString();
        const artistNameUnicode = this.readString();
        const songTitle = this.readString();
        const songTitleUnicode = this.readString();
        const creatorName = this.readString();
        const difficultyName = this.readString();
        const audioFilename = this.readString();
        const md5 = this.readString();
        const osuFile = this.readString();
        const status = this.readByte();
        const hitcirclesCount = this.readShort();
        const slidersCount = this.readShort();
        const spinnersCount = this.readShort();
        const lastModified = this.readLong();
        const approachrate = version < 20140609 ? this.readByte() : this.readSingle();
        const circlesize = version < 20140609 ? this.readByte() : this.readSingle();
        const hpdrain = version < 20140609 ? this.readByte() : this.readSingle();
        const overalldifficulty = version < 20140609 ? this.readByte() : this.readSingle();
        const slidervelocity = this.readDouble();

        let standartStarrating = [];
        let taikoStarrating = [];
        let ctbStarrating = [];
        let maniaStarrating = [];
        if (version >= 20140609) {
            let count = this.readInt();
            for (let i = 0; i < count; i++) {
                standartStarrating.push(this.readIntDoublePair());
            }
            count = this.readInt();
            for (let i = 0; i < count; i++) {
                taikoStarrating.push(this.readIntDoublePair());
            }
            count = this.readInt();
            for (let i = 0; i < count; i++) {
                ctbStarrating.push(this.readIntDoublePair());
            }
            count = this.readInt();
            for (let i = 0; i < count; i++) {
                maniaStarrating.push(this.readIntDoublePair());
            }
        }
        let temp = this.readInt();
        const drainTime = temp > 450000 ? 0 : temp;
        temp = this.readInt();
        const totalTime = temp > 4294960000 ? 0 : temp;
        temp = this.readInt();
        const previewTime = temp > 4294960000 ? 0 : temp;

        let timingPoints = [];
        let count = this.readInt();
        for (let i = 0; i < count; i++) {
            const tp = this.readTimingPoints(timingPoints[i - 1]);
            if (tp !== undefined)
                timingPoints.push(tp);
        }

        const beatmapId = this.readInt();
        temp = this.readInt();
        const beatmapSetId = temp > 4294960000 ? 0 : temp;
        const threadId = this.readInt();
        const gradeStandart = this.readByte();
        const gradeTaiko = this.readByte();
        const gradeCtb = this.readByte();
        const gradeMania = this.readByte();
        const localOffset = this.readShort();
        const stackLeniency = this.readSingle();
        const gameMode = this.readByte();
        const songSource = this.readString();
        const songTags = this.readString();
        const onlineOffset = this.readShort();
        const font = this.readString();
        const alreadyPlayed = !this.readBoolean();
        const lastPlayed = this.readLong();
        const isOsz2 = this.readBoolean();
        const folderName = this.readString();
        const lastOnlineCheck = this.readLong();
        const ignoreBeatmapSounds = this.readBoolean();
        const ignoreBeatmapSkin = this.readBoolean();
        const disableStoryboard = this.readBoolean();
        const disableVideo = this.readBoolean();
        const visualOverwrite = this.readBoolean();
        if (version < 20140609)
            this.readShort();
        this.readInt();
        const maniaScrollspeed = this.readByte();

        return new Beatmap(size, artistName, artistNameUnicode,
            songTitle, songTitleUnicode, creatorName, difficultyName,
            audioFilename, md5, osuFile, status, hitcirclesCount,
            slidersCount, spinnersCount, lastModified, approachrate,
            circlesize, hpdrain, overalldifficulty, slidervelocity,
            standartStarrating, taikoStarrating, ctbStarrating,
            maniaStarrating, drainTime, totalTime, previewTime,
            timingPoints, beatmapId, beatmapSetId, threadId,
            gradeStandart, gradeTaiko, gradeCtb, gradeMania, localOffset,
            stackLeniency, gameMode, songSource, songTags, onlineOffset,
            font, alreadyPlayed, lastPlayed, isOsz2, folderName,
            lastOnlineCheck, ignoreBeatmapSounds, ignoreBeatmapSkin,
            disableStoryboard, disableVideo, visualOverwrite, maniaScrollspeed);
    }
}

exports.Reader = Reader;

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}
