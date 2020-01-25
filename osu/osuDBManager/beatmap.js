const IntDoublePair = require("./intdoublepair.js").IntDoublePair;
const options = require("./option.js");
const request = require("request");
const baseURL = "https://osu.ppy.sh/api/get_beatmaps?b=";

class Beatmap {
    constructor(size, artistName, artistNameUnicode,
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
        disableStoryboard, disableVideo, visualOverwrite, maniaScrollspeed) {
        this.size = size;
        this.artistName = artistName;
        this.artistNameUnicode = artistNameUnicode;
        this.songTitle = songTitle;
        this.songTitleUnicode = songTitleUnicode;
        this.creatorName = creatorName;
        this.difficultyName = difficultyName;
        this.audioFilename = audioFilename;
        this.md5 = md5;
        this.osuFile = osuFile;
        this.status = status;
        this.hitcirclesCount = hitcirclesCount;
        this.slidersCount = slidersCount;
        this.spinnersCount = spinnersCount;
        this.lastModified = lastModified;
        this.approachrate = approachrate;
        this.circlesize = circlesize;
        this.hpdrain = hpdrain;
        this.overalldifficulty = overalldifficulty;
        this.slidervelocity = slidervelocity;

        this.standartStarrating = standartStarrating;
        this.taikoStarrating = taikoStarrating;
        this.ctbStarrating = ctbStarrating;
        this.maniaStarrating = maniaStarrating;

        this.drainTime = drainTime;
        this.totalTime = totalTime;
        this.previewTime = previewTime;

        this.timingPoints = timingPoints;

        this.beatmapId = beatmapId;
        this.beatmapSetId = beatmapSetId;
        this.threadId = threadId;
        this.gradeStandart = gradeStandart;
        this.gradeTaiko = gradeTaiko;
        this.gradeCtb = gradeCtb;
        this.gradeMania = gradeMania;
        this.localOffset = localOffset;
        this.stackLeniency = stackLeniency;
        this.gameMode = gameMode;
        this.songSource = songSource;
        this.songTags = songTags;
        this.onlineOffset = onlineOffset;
        this.font = font;
        this.alreadyPlayed = alreadyPlayed;
        this.lastPlayed = lastPlayed;
        this.isOsz2 = isOsz2;
        this.folderName = folderName;
        this.lastOnlineCheck = lastOnlineCheck;
        this.ignoreBeatmapSounds = ignoreBeatmapSounds;
        this.ignoreBeatmapSkin = ignoreBeatmapSkin;
        this.disableStoryboard = disableStoryboard;
        this.disableVideo = disableVideo;
        this.visualOverwrite = visualOverwrite;
        this.maniaScrollspeed = maniaScrollspeed;
    }

    getBPM() {
        let lowest = 0;
        for (let i = 0; i < this.timingPoints.length; i++) {
            if (!this.timingPoints[i].inherited && this.timingPoints.bpm > lowest)
                lowest = this.timingPoints[i].bpm;
        }
        return lowest;
    }

    addOnlineStuff(key) {
        let url = baseURL + this.beatmapId + "&k=" + key + "&m=" + this.gameMode;
        const body = JSON.parse(await request(url));
        this.genre = parseInt(body.genre_id);
        this.language = parseInt(body.language_id);
        this.favorites = parseInt(body.favourite_count);
    }

    setOnlineStuff(beatmap) {
        this.genre = beatmap.genre;
        this.language = beatmap.language;
        this.favorites = beatmap.favorites;
    }

    getProperty(property) {
        //const options = ["ar", "cs", "hp", "od", "sr", "bpm", "length", "gm", "status", "rankachieved", "alreadyplayed"];
        if (property === options.offline[0])
            return this.approachrate;
        if (property === options.offline[1])
            return this.circlesize;
        if (property === options.offline[2])
            return this.hpdrain;
        if (property === options.offline[3])
            return this.overalldifficulty;
        if (property === options.offline[4])
            switch (this.gameMode) {
                case 0:
                    return this.standartStarrating[0].double;
                case 1:
                    return this.taikoStarrating[0].double;
                case 2:
                    return this.ctbStarrating[0].double;
                case 3:
                    return this.maniaStarrating[0].double;
                default:
                    throw new Error(this.toString() + " somehow fucked the gamemode up");
            }
        if (property === options.offline[5])
            return this.getBPM();
        if (property === options.offline[6])
            return Math.floor(this.totalTime / 1000);
        if (property === options.offline[7])
            return this.gameMode;
        if (property === options.offline[8])
            return this.status;
        if (property === options.offline[9])
            switch (this.gameMode) {
                case 0:
                    return this.gradeStandart;
                case 1:
                    return this.gradeTaiko;
                case 2:
                    return this.gradeTaiko;
                case 3:
                    return this.gradeMania;
                default:
                    throw new Error(this.toString() + " somehow fucked the gamemode up");
            }
        if (property === options.offline[10])
            return this.alreadyPlayed;
        //const onlineOptions = ["genre", "language", "favorites"];
        if (property === options.online[0])
            return this.genre;
        if (property === options.online[1])
            return this.language;
        if (property === options.online[2])
            return this.favorites;
    }

    toString() {
        let string = "\nSize: " + this.size + "\nAristname : " + this.artistName +
            "\nAristname Unicode: " + this.artistNameUnicode + "\nSongtitle: " + this.songTitle +
            "\nSongtitle Unicode: " + this.songTitleUnicode + "\nCreatorname:" + this.creatorName +
            "\nDifficulty: " + this.difficultyName + "\nAudio: " + this.audioFilename + "\nMD5: " + this.md5 +
            "\nOsuFile: " + this.osuFile + "\nStatus: " + this.status + "\nHitcircleCount: " + this.hitcirclesCount +
            "\nSliderCount: " + this.slidersCount + "\nSpinnerCount: " + this.spinnersCount + "\nlastModified: " + this.lastModified +
            "\nAR: " + this.approachrate + "\CS: " + this.circlesize + "\nHP: " + this.hpdrain + "\nOD: " + this.overalldifficulty +
            "\nSlicerVelocity: " + this.slidervelocity;
        let std = "\nStandart:";
        let taiko = "\nTaiko:";
        let ctb = "\nCTB:";
        let mania = "\nMania:";
        for (let i = 0; i < this.standartStarrating.length; i++)
            std += this.standartStarrating[i].toString();
        for (let i = 0; i < this.taikoStarrating.length; i++)
            taiko += this.taikoStarrating[i].toString();
        for (let i = 0; i < this.ctbStarrating.length; i++)
            ctb += this.ctbStarrating[i].toString();
        for (let i = 0; i < this.maniaStarrating.length; i++)
            mania += this.maniaStarrating[i].toString();
        string += std + taiko + ctb + mania;
        string += "\nDraintime: " + this.drainTime + "\nTotaltime: " + this.totalTime + "\nPreviewTime: " + this.previewTime;
        let tp = "";
        for (let i = 0; i < this.timingPoints.length; i++)
            tp += this.timingPoints[i].toString();
        string += this.timingPoints;
        string += "\nBeatmapID: " + this.beatmapId + "\nBeatmapSetID: " + this.beatmapSetId + "\nThreadID: " + this.threadId +
            "\nGradeSTD: " + this.gradeStandart + "\nGradeTaiko: " + this.gradeTaiko + "\nGradeCTB: " + this.gradeCtb + "\nGradeMania: " + this.gradeMania +
            "\nLocaloffset: " + this.localOffset + "\nStackLeniency: " + this.stackLeniency + "\nGamemode: " + this.gameMode +
            "\nSongsource: " + this.songSource + "\nSongTags: " + this.songTags + "\nOnlineOffset: " + this.onlineOffset +
            "\nFont: " + this.font + "\nIsUnplayed: " + this.alreadyPlayed + "\nLastPlayed: " + this.lastPlayed +
            "\nIsOsz2: " + this.isOsz2 + "\nFolderName: " + this.folderName + "\nLastOnlineCheck: " + this.lastOnlineCheck +
            "\nIgnoreBeatmapSounds: " + this.ignoreBeatmapSounds + "\nIgnoreBeatmapSkin: " + this.ignoreBeatmapSkin +
            "\nDisableStoryboard: " + this.disableStoryboard + "\nDisableVideo: " + this.disableVideo +
            "\nVisualOverwrite: " + this.visualOverwrite + "\nManiaScrollspeed: " + this.maniaScrollspeed;
        return string;
    }
}

async function getURL(url) {
    return new Promise(resolve => {
        request.get({ uri: url }, (error, response, body) => {
            resolve(body);
        });
    });
}

exports.Beatmap = Beatmap;
