// Shared neutral STFT engine. Loaded-file playback permits frame lookahead;
// this is not a live microphone processor. No bypass, gain, or limiter.
export class FFT {
  constructor(size) {
    if (!Number.isInteger(size) || size < 8 || (size & (size - 1))) throw new Error('FFT size must be a power of two');
    this.size = size;
    this.reverse = new Uint32Array(size);
    this.cos = new Float64Array(size / 2);
    this.sin = new Float64Array(size / 2);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
      let n = i, r = 0;
      for (let j = 0; j < bits; j++) { r = (r << 1) | (n & 1); n >>= 1; }
      this.reverse[i] = r;
    }
    for (let i = 0; i < size / 2; i++) {
      this.cos[i] = Math.cos(2 * Math.PI * i / size);
      this.sin[i] = Math.sin(2 * Math.PI * i / size);
    }
  }
  transform(re, im, inverse = false) {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      const j = this.reverse[i];
      if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len *= 2) {
      const half = len / 2, stride = n / len;
      for (let start = 0; start < n; start += len) {
        for (let j = 0; j < half; j++) {
          const c = this.cos[j * stride], s = this.sin[j * stride] * (inverse ? 1 : -1);
          const a = start + j, b = a + half;
          const tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

export class NeutralSTFT {
  constructor(channels, size = 2048, start = 0) {
    if (!channels.length || channels.some(c => c.length !== channels[0].length)) throw new Error('Invalid channels');
    this.channels = channels; this.length = channels[0].length;
    this.size = size; this.hop = size / 4; this.fft = new FFT(size);
    this.window = Float64Array.from({length: size}, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / size));
    this.re = new Float64Array(size); this.im = new Float64Array(size);
    this.sums = channels.map(() => new Float64Array(size));
    this.weights = new Float64Array(size);
    this.output = channels.map(() => new Float32Array(this.hop));
    this.seek(start);
  }
  seek(start) {
    this.position = Math.max(0, Math.min(this.length, Math.floor(Number.isFinite(start) ? start : 0)));
    this.nextFrame = this.position - this.size + this.hop;
    this.frameChannel = 0;
    this.sums.forEach(c => c.fill(0)); this.weights.fill(0);
  }
  // Phase 4 extension point: transform complex bins here, preserving conjugate
  // symmetry and phase continuity. Identity must remain the neutral branch.
  transformSpectrum(re, im, frameStart, channel) {}
  readWindowedFrame(channel,start) {
    const source=this.channels[channel];
    for(let i=0;i<this.size;i++){this.re[i]=(source[start+i]||0)*this.window[i];this.im[i]=0;}
  }
  // Realtime can prepare one channel per quantum; offline finishes a whole frame.
  accumulateNextChannel() {
    const n=this.size,start=this.nextFrame,offset=start-this.position,c=this.frameChannel;
    this.readWindowedFrame(c,start);
    this.fft.transform(this.re,this.im);
    this.transformSpectrum(this.re,this.im,start,c);
    this.fft.transform(this.re,this.im,true);
    this.accumulateSpectrum(c,offset);
    this.frameChannel++;
    if(this.frameChannel===this.channels.length){
      for(let i=Math.max(0,-offset);i<n;i++)this.weights[offset+i]+=this.window[i]**2;
      this.nextFrame+=this.hop;this.frameChannel=0;
    }
  }
  accumulateNextFrame() { do { this.accumulateNextChannel(); } while(this.frameChannel); }
  accumulateSpectrum(channel, offset) {
    for (let i = Math.max(0, -offset); i < this.size; i++) this.sums[channel][offset + i] += this.re[i] * this.window[i];
  }
  synthesize(channel, index, weight) { return this.sums[channel][index] / weight; }
  finishChannel(channel) {}
  nextHop() {
    const {size: n, hop: h, position: pos} = this;
    while (this.nextFrame <= pos) this.accumulateNextFrame();
    for (let c = 0; c < this.channels.length; c++) {
      for (let i = 0; i < h; i++) this.output[c][i] = pos + i < this.length && this.weights[i] > 1e-12 ? this.synthesize(c, i, this.weights[i]) : 0;
      this.finishChannel(c);
      this.sums[c].copyWithin(0, h); this.sums[c].fill(0, n - h);
    }
    this.weights.copyWithin(0, h); this.weights.fill(0, n - h);
    this.position += h;
    return this.output;
  }
}
