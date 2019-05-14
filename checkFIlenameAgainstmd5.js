const fs = require('fs');
const crypto = require('crypto');

let folder = "/media/earlopain/folder"
folder = folder.replace(/\\/g, "/");
if (!folder.endsWith("/"))
    folder = folder + "/";

const files = fs.readdirSync(folder);

async function main() {
    while (true) {
        for (let i = 0; i < files.length; i++) {
            if (fs.statSync(folder + files[i]).isDirectory())
                continue;
            const hash = await fileHash(folder + files[i]);
            if (hash !== files[i].split(".")[0])
                console.log(files[i]);
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
