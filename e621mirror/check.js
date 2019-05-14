const fs = require("fs");
const crypto = require("crypto");

async function main() {
    const jsonFiles = fs.readdirSync("./json/");
    for (let i = 0; i < jsonFiles.length; i++) {
        const json = JSON.parse(fs.readFileSync("./json/" + jsonFiles[i]));
        if (!json.md5)
            continue;
        const md5 = json.md5;
        if (!fs.existsSync("./files/" + md5 + "." + json.file_ext)) {
            console.log(json.id + " picture doesn't exist");
            continue;
        }
        const actualHash = await fileHash("./files/" + json.md5 + "." + json.file_ext);
        if (md5 !== actualHash) {
            console.log(json.id + " wrong has" + actualHash);
            continue;
        }

    }
}

main();

function fileHash(filename, algorithm = 'md5') {
    return new Promise((resolve, reject) => {
        // Algorithm depends on availability of OpenSSL on platform
        // Another algorithms: 'sha1', 'md5', 'sha256', 'sha512' ...
        let shasum = crypto.createHash(algorithm);
        try {
            let s = fs.ReadStream(filename)
            s.on('data', function (data) {
                shasum.update(data)
            })
            // making digest
            s.on('end', function () {
                const hash = shasum.digest('hex')
                return resolve(hash);
            })
        } catch (error) {
            return reject('calc fail');
        }
    });
}
