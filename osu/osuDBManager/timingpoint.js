class TimingPoint {
    constructor(bpm, offset, inherited, prev) {
        if (inherited){
            this.bpm = Math.round(prev.bpmRelative * (100 / -bpm));
            this.bpmRelative = prev.bpmRelative;
        }
            
        else{
            this.bpm = Math.round(60000 / bpm);
            this.bpmRelative = this.bpm;
        }
            
        this.offset = offset;
        this.inherited = inherited;
    }

    toString() {
        return "\nBPM: " + this.bpm + " Offset: " + this.offset + " Inherited: " + this.inherited;
    }
}

exports.TimingPoint = TimingPoint;