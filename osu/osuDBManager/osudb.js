class OsuDB {
    constructor(version, folderCount, accountLocked, unlockTime, username, beatmapCount, beatmaps) {
        this.version = version;
        this.folderCount = folderCount;
        this.accountLocked = accountLocked;
        this.unlockTime = unlockTime;
        this.username = username;
        this.beatmapCount = beatmapCount;
        this.beatmaps = beatmaps;
    }

    getBeatmapAlreadyFinishedFromMapsetId(id) {
        for (let i = 0; i < this.beatmaps.length; i++) {
            if (this.beatmaps[i].beatmapSetId === id && this.beatmaps[i].genre !== undefined && this.beatmaps[i].language !== undefined && this.beatmaps[i].favorites !== undefined)
                return this.beatmaps[i];
        }
        throw new Error("Set already fetched, but couldn't find map to get values from: " + id);
    }

    toString() {
        let result = "\nVersion: " + this.version + "\nFolder count: " + this.folderCount +
            "\nAccount locked: " + this.accountLocked + "\nUnlocktime: " + this.unlockTime +
            "\nUsername: " + this.username + "\nBeatmap count: " + this.beatmapCount;
        this.beatmaps.forEach(element => {
            result += element.toString();
        });
        return result;
    }
}

exports.OsuDB = OsuDB;
