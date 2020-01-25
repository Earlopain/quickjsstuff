const fs = require("fs");
class Writer {
    constructor(path) {
        this.writer = new fs.WriteStream(path);
    }

    writeByte(byte) {
        this.writer.write(new Buffer(padding(byte.toString(16), 2), "hex"));
    }

    writeInt(int) {
        this.writer.write(new Buffer(padding(int.toString(16), 8), "hex").reverse());
    }

    writeULEB128(int) {
        const MASK_DATA = 0x7f;     //0111 1111
        const MASK_CONTINUE = 0x80; //1000 0000
        let bytes = []
        do {
            let b = int & MASK_DATA;
            int >>= 7;
            if (int !== 0) {
                b |= MASK_CONTINUE;
            }
            bytes.push(padding(b.toString(16), 2));
        } while (int != 0);

        this.writer.write(new Buffer(bytes.join(""), "hex"));
    }

    writeString(string) {
        if (string.length === 0) {
            this.writer.write(new Buffer("00", "hex"));
            return;
        }
        this.writer.write(new Buffer("0b", "hex"));
        this.writeULEB128(getByteLen(string));
        this.writer.write(new Buffer(string));
    }


    end() {
        this.writer.close();
    }
}

exports.Writer = Writer;

function padding(string, count) {
    return (Array(count).join("0") + string).slice(-count);
}

function getByteLen(normal_val) {
    // Force string type
    normal_val = String(normal_val);

    var byteLen = 0;
    for (var i = 0; i < normal_val.length; i++) {
        var c = normal_val.charCodeAt(i);
        byteLen += c < (1 << 7) ? 1 :
            c < (1 << 11) ? 2 :
                c < (1 << 16) ? 3 :
                    c < (1 << 21) ? 4 :
                        c < (1 << 26) ? 5 :
                            c < (1 << 31) ? 6 : Number.NaN;
    }
    return byteLen;
}
