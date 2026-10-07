export function encodeWav(channels, sampleRate = 48000, metrics = null) {
  const length = channels[0].length, count = channels.length;
  const dataBytes = length * count * 3, padding = dataBytes % 2;
  if (dataBytes + 36 + padding > 0xffffffff) throw new Error('WAV exceeds RIFF size limit');
  const view = new DataView(new ArrayBuffer(44 + dataBytes + padding));
  const text = (p, s) => { for (let i = 0; i < s.length; i++) view.setUint8(p + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, view.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, count, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * count * 3, true);
  view.setUint16(32, count * 3, true); view.setUint16(34, 24, true);
  text(36, 'data'); view.setUint32(40, dataBytes, true);
  let p = 44, peak = 0, clippedSamples = 0;
  for (let i = 0; i < length; i++) for (const channel of channels) {
    if (!Number.isFinite(channel[i])) throw new Error('Non-finite sample');
    const quantized = Math.round(channel[i] * 8388608);
    if (metrics) {
      peak = Math.max(peak, Math.abs(channel[i]));
      if (quantized > 8388607 || quantized < -8388608) clippedSamples++;
    }
    const v = Math.max(-8388608, Math.min(8388607, quantized));
    view.setUint8(p++, v & 255); view.setUint8(p++, (v >> 8) & 255); view.setUint8(p++, (v >> 16) & 255);
  }
  if (metrics) Object.assign(metrics, { peak, clippedSamples, totalSamples: length * count });
  return new Blob([view], {type: 'audio/wav'});
}
