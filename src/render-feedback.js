// Sample-peak/PCM clipping only, not inter-sample true-peak or listening approval.
export function renderFeedback(metrics) {
  if (!metrics || !Number.isFinite(metrics.peak) || !Number.isInteger(metrics.clippedSamples)) {
    return { clipped: false, message: "WAV ready. Peak measurement unavailable. Click Save WAV if saving did not start." };
  }
  const db = metrics.peak > 0 ? 20 * Math.log10(metrics.peak) : -Infinity;
  const level = Number.isFinite(db) ? `${db > 0 ? "+" : ""}${db.toFixed(2)} dBFS` : "silence";
  const clipped = metrics.clippedSamples > 0;
  return { clipped, message: clipped
    ? `WAV clipping detected: peak ${level}; ${metrics.clippedSamples.toLocaleString("en-US")} channel samples exceed 24-bit PCM range. Lower the source level or adjust effects and render again, or choose Save WAV (clipped) to keep this result. No automatic gain or limiter was applied.`
    : `WAV ready: sample peak ${level}; no PCM clipping detected. Click Save WAV if saving did not start.` };
}
