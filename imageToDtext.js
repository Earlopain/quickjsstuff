const fs = require("fs");
const PNG = require("pngjs").PNG;

async function main() {
    const char = "█";
    const whitespace = "  ";
    const image = await pngTo2DArray("test.png");
    let result = "";
    for (const row of image) {
        const firstColorIndex = getRowFirstColorIndex(row);
        if (firstColorIndex === -1) {
            result += "\n";
            continue;
        }
        let currentColor = toHex(row[firstColorIndex]);
        result += "[color=#" + currentColor + "]";
        const cutoff = getCutoff(row);
        for (let i = 0; i < cutoff; i++) {
            const pixel = row[i];
            if (pixel.a === 0) {
                result += whitespace;
                continue;
            }
            const hex = toHex(pixel);
            if (currentColor !== hex) {
                result += "[/color][color=#" + hex + "]";
            }
            currentColor = hex;
            result += char;
        }
        result += "[/color]\n";
    }
    console.log(result);
}

function getCutoff(pixels) {
    for (let i = pixels.length - 1; i >= 0; i--) {
        if (pixels[i].a !== 0) {
            return i + 1;
        }
    }
    return 0;
}

function getRowFirstColorIndex(row) {
    for (let i = 0; i < row.length; i++) {
        if (row[i].a !== 0) {
            return i;
        }
    }
    return -1;
}

function toHex(pixel) {
    return byteToHex(pixel.r) + byteToHex(pixel.g) + byteToHex(pixel.b);
    function byteToHex(byte) {
        return byte.toString(16).padStart(2, "0");
    }
}

main();

class Pixel {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    diff(pix) {
        return Math.abs(this.r - pix.r) + Math.abs(this.g - pix.g) + Math.abs(this.b - pix.b);
    }
}

function pngTo2DArray(path) {
    return new Promise(resolve => {
        let d1array = [];
        fs.createReadStream(path)
            .on("error", () => {
                resolve([]);
            })
            .pipe(new PNG())
            .on('parsed', function () {
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        const i = (this.width * y + x) << 2;
                        d1array.push(new Pixel(this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]));
                    }
                }
                let result = [];
                while (d1array.length) result.push(d1array.splice(0, this.width));
                resolve(result);
            }).on("error", () => {
                resolve([]);
            })

    });
}
