export async function renderOffline({audioBuffer, curves, signal, onProgress}) {
  if (signal?.aborted) throw new DOMException('Render cancelled', 'AbortError');
  const curve = curves?.shift?.map(point => ({...point}));
  const stretchCurve = curves?.stretch?.map(point => ({...point}));
  const blurCurve = curves?.blur?.map(point => ({...point}));
  let source = audioBuffer;
  if (source.sampleRate !== 48000) {
    const context = new OfflineAudioContext(source.numberOfChannels, Math.ceil(source.duration * 48000), 48000);
    const node = context.createBufferSource(); node.buffer = source; node.connect(context.destination); node.start();
    source = await context.startRendering();
  }
  if (signal?.aborted) throw new DOMException('Render cancelled', 'AbortError');
  const channels = Array.from({length: source.numberOfChannels}, (_, i) => new Float32Array(source.getChannelData(i)));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./render-worker.js?v=20260929-transport1', import.meta.url), {type: 'module'});
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
    worker.postMessage({channels, curve, stretchCurve, blurCurve}, channels.map(c => c.buffer));
  });
}
