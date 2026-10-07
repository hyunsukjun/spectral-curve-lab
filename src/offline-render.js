import { prepareWavChannels } from "./render-resampling.js?v=20261006-48k-01";
export async function renderOffline({audioBuffer, curves, order, signal, onProgress}) {
  if (signal?.aborted) throw new DOMException('Render cancelled', 'AbortError');
  const curve = curves?.shift?.map(point => ({...point}));
  const stretchCurve = curves?.stretch?.map(point => ({...point}));
  const blurCurve = curves?.blur?.map(point => ({...point}));
  const harmonicityCurve = curves?.harmonicity?.map(point => ({...point}));
  const freezeCurve = curves?.freeze?.map(point => ({...point}));
  const channels = [];
  for (let index = 0; index < audioBuffer.numberOfChannels; index += 2) {
    const left = audioBuffer.getChannelData(index);
    const hasRight = index + 1 < audioBuffer.numberOfChannels;
    const right = hasRight ? audioBuffer.getChannelData(index + 1) : left;
    const converted = await prepareWavChannels(left, right, audioBuffer.sampleRate, signal);
    // The worker receives copies; never detach the input AudioBuffer's channels.
    channels.push(new Float32Array(converted.left));
    if (hasRight) channels.push(new Float32Array(converted.right));
  }
  if (signal?.aborted) throw new DOMException('Render cancelled', 'AbortError');
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./render-worker.js?v=20261007-clip-report1', import.meta.url), {type: 'module'});
    const cleanup = () => { worker.terminate(); signal?.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Render cancelled', 'AbortError')); };
    signal?.addEventListener('abort', abort, {once: true});
    worker.onerror = event => { cleanup(); reject(new Error(event.message)); };
    worker.onmessage = ({data}) => {
      if (data.progress != null) { onProgress?.(data.progress); return; }
      cleanup();
      if (data.error) reject(new Error(data.error));
      else { onProgress?.(1); resolve(data); }
    };
    worker.postMessage({channels, curve, stretchCurve, blurCurve, harmonicityCurve, freezeCurve, order:order ? [...order] : undefined}, channels.map(c => c.buffer));
  });
}
