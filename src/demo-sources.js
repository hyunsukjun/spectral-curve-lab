// Deterministic, self-generated references. These are diagnostic examples, not a listening-approved preset.
export function fillHarmonicDemo(left, right, sampleRate) {
  const notes = [196, 246.94, 293.66, 220];
  const noteSeconds = 2;
  const soundingSeconds = 1.88;
  let seed = 123456789;
  for (let i = 0; i < left.length; i += 1) {
    const time = i / sampleRate;
    const noteIndex = Math.floor(time / noteSeconds);
    const localTime = time - noteIndex * noteSeconds;
    if (noteIndex >= notes.length || localTime >= soundingSeconds) continue;
    const frequency = notes[noteIndex];
    const attack = Math.min(1, localTime / 0.025);
    const release = Math.min(1, (soundingSeconds - localTime) / 0.12);
    const envelope = Math.max(0, attack * release) * (0.62 + 0.38 * Math.exp(-localTime / 0.7));
    const phase = 2 * Math.PI * frequency * localTime;
    const tone = Math.sin(phase) + 0.42 * Math.sin(2 * phase) +
      0.24 * Math.sin(3 * phase) + 0.13 * Math.sin(4 * phase) + 0.07 * Math.sin(5 * phase);
    seed = (1664525 * seed + 1013904223) >>> 0;
    const attackNoise = ((seed / 4294967295) * 2 - 1) * 0.018 * Math.exp(-localTime / 0.02);
    const sample = 0.20 * envelope * tone + attackNoise * attack;
    left[i] = sample;
    right[i] = sample;
  }
}

export function fillNoiseIntervals(left, right, sampleRate) {
  const noiseFrames = Math.floor(0.045833 * sampleRate);
  const gapFrames = Math.floor(0.020833 * sampleRate);
  const cycleFrames = Math.max(1, noiseFrames + gapFrames);
  const attackFrames = Math.max(1, Math.floor(0.003 * sampleRate));
  const decayFrames = Math.max(1, Math.floor(0.014 * sampleRate));
  const releaseFrames = Math.max(1, Math.floor(0.018 * sampleRate));
  let seed = 123456789;
  for (let i = 0; i < left.length; i += 1) {
    const cyclePosition = i % cycleFrames;
    if (cyclePosition >= noiseFrames) continue;
    let envelope = 0.22;
    if (cyclePosition < attackFrames) {
      envelope = cyclePosition / attackFrames;
    } else if (cyclePosition < attackFrames + decayFrames) {
      envelope = 1 - 0.78 * (cyclePosition - attackFrames) / decayFrames;
    }
    envelope *= Math.max(0, Math.min(1, (noiseFrames - cyclePosition) / releaseFrames));
    seed = (1664525 * seed + 1013904223) >>> 0;
    const sample = ((seed / 4294967295) * 2 - 1) * 0.32 * envelope;
    left[i] = sample;
    right[i] = sample;
  }
}
