const fs = require("fs");
const path = require("path");
const request = require("request");
const ffmetadata = require("ffmetadata");
const htmlentities = new require("html-entities").AllHtmlEntities;
const htmlstriptags = require('striptags');
const xmlparse = require('xml-parser');

const secrets = JSON.parse(fs.readFileSync("./secrets.json"));

const musicDir = "/media/earlopain/External/Music/DOWNLOADS";
const enabledProviders = ["LyricsFandom", "Genius", "Metadata"];

const artists = fs.readdirSync(musicDir);

async function main() {
    for (const artist of artists) {
        if (!fs.statSync(musicDir + "/" + artist).isDirectory())
            continue;
        const albums = fs.readdirSync(musicDir + "/" + artist);
        for (const album of albums) {
            if (!fs.statSync(musicDir + "/" + artist + "/" + album).isDirectory())        //just to be save
                continue;
            const musicFiles = walk(musicDir + "/" + artist + "/" + album).filter(file => file.endsWith(".mp3"));
            for (const mp3 of musicFiles) {
                if (fs.existsSync(mp3.slice(0, -4) + ".txt") || fs.existsSync(mp3.slice(0, -4) + ".lrc"))
                    continue;
                const metadata = await getMP3Metadata(mp3);   //https://stackoverflow.com/a/7592235

                let lyrics;
                let lyricSource;
                let isLRC = false;
                for (const provider of enabledProviders) {
                    lyricSource = provider;
                    switch (provider) {
                        case "Alsong":
                            lyrics = await getLyricsAlsong(metadata);
                            isLRC = true;
                            break;
                        case "LyricsFandom":
                            lyrics = await getLyricsFandomLyrics(metadata);
                            break;
                        case "Genius":
                            lyrics = await getLyricsGenius(metadata);
                            break;
                        case "Metadata":
                            lyrics = await getLyricsMetadata(metadata);
                            break;
                    }
                    if (lyrics)
                        break;
                }
                if (lyrics) {
                    if (isLRC)
                        fs.writeFileSync(mp3.slice(0, -4) + ".lrc", lyrics);
                    else
                        fs.writeFileSync(mp3.slice(0, -4) + ".txt", lyrics);

                    console.log(lyricSource + ": " + path.basename(mp3));
                }

            }
        }
    }
}
main();

async function getLyricsFandomLyrics(metadata) {
    let htmlRequest = await getSongHTML("https://lyrics.fandom.com/wiki/" + metadata.artist.replace(/ /g, "_") + ":" + metadata.title.replace(/(?:^|\s)\S/g, a => a.toUpperCase()).replace(/ /g, "_"));
    let html = htmlRequest.body
    let isRomanized = /<td[\s\S]*?translated[\s\S]*?\/roman[\s\S]*?<\/td/gm.test(html);
    if (isRomanized) {
        htmlRequest = await getSongHTML(decodeURI(htmlRequest.request.href) + "/roman")
        html = htmlRequest.body
    }
    const regex = /class='lyricbox'>([\s\S]*?)<div class='lyricsbreak/gm;
    let lyrics = regexFirstMatch(regex, html);
    if (!lyrics)
        return undefined;
    lyrics = lyrics.replace(/<br \/>/g, "\n");
    lyrics = htmlentities.decode(lyrics);
    if (lyrics.includes("/wiki/Category:Instrumental"))
        lyrics = "Instrumental";
    lyrics = htmlstriptags(lyrics);
    if (lyrics === "undefinedundefinedundefined")
        debugger;
    return lyrics;

    function getSongHTML(url) {
        return new Promise(resolve => {
            request.get({
                uri: encodeURI(url), headers: { followRedirect: false, }
            }, async (error, response, body) => {
                if (error)
                    debugger;
                const regex = /redirectText"><li><a href="([\s\S]*?)"/gm;
                let m;
                let newURL;
                const match = regexFirstMatch(regex, body);
                if (match) {
                    newURL = "https://" + response.request.host + decodeURI(match);
                    const newHTML = await getSongHTML(newURL);
                    resolve(newHTML);
                }
                else
                    resolve(response);
            });
        });
    }
}

async function getLyricsAlsong(metadata) {
    const url = 'http://lyrics.alsong.net/alsongwebservice/service1.asmx'
    const data = `<?xml version='1.0' encoding='UTF-8'?>
    <SOAP-ENV:Envelope xmlns:SOAP-ENV='http://www.w3.org/2003/05/soap-envelope' xmlns:SOAP-ENC='http://www.w3.org/2003/05/soap-encoding' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:ns2='ALSongWebServer/Service1Soap' xmlns:ns1='ALSongWebServer' xmlns:ns3='ALSongWebServer/Service1Soap12'>
    <SOAP-ENV:Body>
        <ns1:GetResembleLyric2>
        <ns1:stQuery>
            <ns1:strTitle>%t</ns1:strTitle>
            <ns1:strArtistName>%s</ns1:strArtistName>
            <ns1:nCurPage>0</ns1:nCurPage>
        </ns1:stQuery>
        </ns1:GetResembleLyric2>
    </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>`;
    function xmlRequest(artist, title) {
        return new Promise(resolve => {
            request.post({
                headers: { 'Content-Type': 'text/xml; charset=utf-8' },
                url: url,
                body: data.replace("%t", title).replace("%s", artist)
            }, function (error, response, body) {
                resolve(body);
            });
        });
    }
    const body = await xmlRequest(metadata.artist, metadata.title);
    let json;
    try {
        json = xmlparse(body);
        if (json.root.children[0].children[0].children[0].children.length === 0)
            return undefined;
        jsonArtist = json.root.children[0].children[0].children[0].children[0].children[4].content;
        jsonTitle = json.root.children[0].children[0].children[0].children[0].children[2].content;
        if (jsonArtist !== metadata.artist.replace(/\//g, " ").toLowerCase() || jsonTitle !== metadata.title.replace(/\//g, " ").toLowerCase())
            return undefined;
        let lyrics = json.root.children[0].children[0].children[0].children[0].children[3].content;
        if (/[\u3131-\uD79D]/ugi.test(lyrics))
            return undefined;
        return lyrics;
    } catch (error) {
        return undefined;
    }
}

async function getLyricsGenius(metadata) {
    const apiKey = secrets.lyricsgeniusapikey;
    const apiURL = "https://api.genius.com/search?access_token=" + apiKey + "&q="
    //const json = await getJSON(apiURL + metadata.artist + " " + metadata.title);
    const json = await getJSON(apiURL + metadata.artist + " " + metadata.title);
    let htmlURL
    for (const hit of json.response.hits) {
        if (hit.index !== "song" || hit.type !== "song")
            continue;
        if (hit.result.primary_artist.name !== metadata.artist || hit.result.title !== metadata.title)
            continue;
        htmlURL = hit.result.url;
        break;
    }
    if (!htmlURL)
        return undefined;
    const html = await getHTML(htmlURL);
    const regex = /<div class="lyrics">([\s\S]*?)<\/div>/mg;
    const match = regexFirstMatch(regex, html);
    if (!match)
        return undefined;
    let lyrics = htmlstriptags(match).trim();
    if (lyrics === "[Instrumental]" || lyrics === ["Instrument"])
        lyrics = "Instrumental";
    return lyrics;
}

function getLyricsMetadata(metadata) {
    return metadata["lyrics-eng"];
}

function regexFirstMatch(regex, str) {
    let m;
    while ((m = regex.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        // The result can be accessed through the `m`-variable.
        if (m[1]) {
            return m[1];
        }
        break;
    }
}

function getMP3Metadata(path) {
    return new Promise(resolve => {
        ffmetadata.read(path, function (err, data) {
            if (err) console.error("Error reading metadata", err);
            else resolve(data);
        });
    })
}

function getJSON(url) {
    return new Promise(resolve => {
        request.get({ uri: encodeURI(url) }, (error, response, body) => {
            if (error)
                debugger;
            resolve(JSON.parse(body));
        });
    });
}

function getHTML(url) {
    return new Promise(resolve => {
        request.get({ uri: encodeURI(url) }, (error, response, body) => {
            if (error)
                debugger;
            resolve(body);
        });
    });
}

function walk(directoryName) {
    let result = [];
    const files = fs.readdirSync(directoryName);
    for (let i = 0; i < files.length; i++) {
        const fullPath = path.join(directoryName, files[i]);
        const file = fs.statSync(fullPath);
        if (file.isDirectory()) {
            const dirFiles = walk(fullPath);
            if (dirFiles)
                dirFiles.forEach(element => {
                    result.push(element);
                });
        } else {
            result.push(fullPath);
        }
    }
    return result
};