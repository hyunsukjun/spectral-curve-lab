// Reuses Oscillator's instantaneous linked safety-gain / 60 ms recovery rule.
// Sample-peak protection only: no lookahead, latency, up-gain or true-peak claim.
export const OUTPUT_CEILING = 0.98;
export class OutputPeakGuard {
  constructor(rate, ceiling = OUTPUT_CEILING) {
    this.ceiling = ceiling;
    this.recovery = 1 - Math.exp(-1 / (0.06 * rate));
    this.reset();
  }
  reset() { this.gain = 1; }
  gainForPeak(peak) {
    if (!Number.isFinite(peak)) throw new RangeError('Non-finite processed output');
    const target = peak > this.ceiling ? this.ceiling / peak : 1;
    this.gain = target < this.gain ? target : this.gain + (target - this.gain) * this.recovery;
    return this.gain;
  }
}

export function protectWavPeak(channels, ceiling = OUTPUT_CEILING) {
  let inputPeak = 0;
  for (const channel of channels) for (const value of channel) {
    if (!Number.isFinite(value)) throw new RangeError('Non-finite processed output');
    inputPeak = Math.max(inputPeak, Math.abs(value));
  }
  const normalizationGain = inputPeak > ceiling ? ceiling / inputPeak : 1;
  if (normalizationGain < 1) for (const channel of channels) {
    for (let i = 0; i < channel.length; i++) channel[i] *= normalizationGain;
  }
  return {inputPeak, normalizationGain};
}
