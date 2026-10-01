import {createSpectrogramView} from "./spectrogram-view.js?v=20260929-transport1";
import {stretchFromNorm, stretchToNorm} from "./spectral-stretch.js?v=20260929-transport1";
import {shiftFromNorm} from "./spectral-shift.js?v=20260929-transport1";
import { valueAt, addNode, moveNode, eraseNode } from "./curve-editor.js?v=20260929-transport1";
import { OutputMeterAnalyzer } from "./output-meter.js?v=20261001-playback1";

const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const timeStatus = document.getElementById("timeStatus");
const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const playbackScrubber = document.getElementById("playbackScrubber");
const meterRows = Array.from(document.querySelectorAll("[data-meter-channel]"));
const meterClipButton = document.getElementById("meterClipButton");

const downloadButton = document.getElementById("downloadButton");
const clearCurveButton = document.getElementById("clearCurveButton");
const resetButton = document.getElementById("resetButton");
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");
const shiftMode = document.getElementById("shiftMode");
const blurMode = document.getElementById("blurMode");
const stretchMode = document.getElementById("stretchMode");
const curveLegend = document.getElementById("curveLegend");

const downloadReadout = document.getElementById("downloadReadout");
const modeReadout = document.getElementById("modeReadout");
const pointsReadout = document.getElementById("pointsReadout");
const selectTool = document.getElementById("selectTool");
const penTool = document.getElementById("penTool");
const eraserTool = document.getElementById("eraserTool");
const resetDialog = document.getElementById("resetDialog");
const cancelResetButton = document.getElementById("cancelResetButton");
const confirmResetButton = document.getElementById("confirmResetButton");
const eraseModifier = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgentData?.platform || "")
  ? "metaKey"
  : "ctrlKey";

const transformSettings = {};

const largeFileSeconds = 180;

const curveColors = {
  shift: "#6de0c0",
  stretch: "#eb6f75",
  blur: "#dab877",

};

let audioContext;
let audioSetupPromise = null;
let node;
let outputMeter;
let workletBufferLoaded = false;
let buffer;
let waveform = [];
let activeCurve = "shift";
let selectedTool = "pen";
let selectedPoint = null;
let hoverPoint = null;
let dragging = false;
let playheadSeconds = 0;
let sourcePlayheadSeconds = 0;
let downloadUrl = null;
let renderAbortController = null;
let isPlaying = false;
let playbackToken = 0;
let isScrubbing = false;
let meterAnimationFrame = 0;
let meterLastFrameTime = performance.now();
let meterClipLatched = false;
const meterDisplay = meterRows.map(() => ({peak: 0, rms: 0, hold: 0, holdUntil: 0}));
let renderOffline = null;
let canvasCssWidth = 1;
let canvasCssHeight = 1;
let canvasBaseWidth = 0;
const canvasMinimumWidth = 320;
const canvasBaseHeight = 620;
const parameterScaleWidth = 54;
const plotRightPadding = 8;

const curves = { shift: [{x: 0, y: .5}, {x: 1, y: .5}], blur: [{x:0,y:0},{x:1,y:0}], stretch: [{x:0,y:.5},{x:1,y:.5}] };

const defaultCurves = { shift: () => [{x: 0, y: .5}, {x: 1, y: .5}], blur: () => [{x:0,y:0},{x:1,y:0}], stretch: () => [{x:0,y:.5},{x:1,y:.5}] };

const editedCurves = { shift: false, stretch: false, blur: false };

const curveLabels = {
  shift: "Spectral Shift",
  stretch: "Spectral Stretch",
  blur: "Spectral Blur",

};

const spectrogram = createSpectrogramView({getBuffer:()=>buffer,getCurves:()=>curves,isBusy:()=>isPlaying||!!renderAbortController||playButton.disabled});

function resizeCanvas() {
  const frameRect = canvas.parentElement.getBoundingClientRect();
  const targetWidth = Math.max(frameRect.width, canvasMinimumWidth);
  canvasBaseWidth = targetWidth;
  canvas.style.width = `${Math.round(canvasBaseWidth)}px`;
  canvas.style.height = `${canvasBaseHeight}px`;
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvasCssWidth = Math.max(1, rect.width);
  canvasCssHeight = Math.max(1, rect.height);
  const nextWidth = Math.max(1, Math.floor(canvasCssWidth * scale));
  const nextHeight = Math.max(1, Math.floor(canvasCssHeight * scale));
  if (canvas.width !== nextWidth) canvas.width = nextWidth;
  if (canvas.height !== nextHeight) canvas.height = nextHeight;
  draw();
}

function formatClock(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds - (minutes * 60);
  return `${String(minutes).padStart(2, "0")}:${remaining.toFixed(2).padStart(5, "0")}`;
}

function linearToDb(value) {
  return value > 0.000001 ? 20 * Math.log10(value) : -Infinity;
}

function meterPosition(value) {
  return Math.max(0, Math.min(1, (linearToDb(value) + 60) / 60));
}

function smoothMeterValue(current, target, elapsedMs, attackMs, releaseMs) {
  const time = target > current ? attackMs : releaseMs;
  return current + (target - current) * (1 - Math.exp(-elapsedMs / Math.max(1, time)));
}

function updateMeterDisplay(now) {
  const elapsedMs = Math.min(100, Math.max(0, now - meterLastFrameTime));
  meterLastFrameTime = now;
  const measuredChannels = outputMeter?.read() || [];
  meterRows.forEach((row, index) => {
    const measured = measuredChannels[index] || {peak: 0, rms: 0, clipped: false};
    const display = meterDisplay[index];
    display.peak = smoothMeterValue(display.peak, measured.peak, elapsedMs, 18, 320);
    display.rms = smoothMeterValue(display.rms, measured.rms, elapsedMs, 45, 420);
    if (measured.peak >= display.hold) {
      display.hold = measured.peak;
      display.holdUntil = now + 1000;
    } else if (now > display.holdUntil) {
      display.hold = smoothMeterValue(display.hold, measured.peak, elapsedMs, 0, 700);
    }
    if (measured.clipped) meterClipLatched = true;
    row.querySelector(".meterRms").style.transform = `scaleX(${meterPosition(display.rms)})`;
    row.querySelector(".meterPeak").style.transform = `scaleX(${meterPosition(display.peak)})`;
    row.querySelector(".meterHold").style.left = `${meterPosition(display.hold) * 100}%`;
    const peakDb = linearToDb(display.peak);
    row.querySelector(".meterValue").textContent = Number.isFinite(peakDb) ? peakDb.toFixed(1) : "-∞";
  });
  meterClipButton.classList.toggle("clipped", meterClipLatched);
  meterClipButton.setAttribute("aria-pressed", String(meterClipLatched));
  meterAnimationFrame = requestAnimationFrame(updateMeterDisplay);
}

function startMeterAnimation() {
  if (meterAnimationFrame) return;
  meterLastFrameTime = performance.now();
  meterAnimationFrame = requestAnimationFrame(updateMeterDisplay);
}

function getPlaybackDuration() {
  return buffer?.duration || 0;
}

function resetCurrentReadouts() {}

function formatPointValue(curveName, point) {
  return curveName === "blur" ? `${Math.round(point.y*100)}%` : curveName === "stretch" ? `${stretchFromNorm(point.y).toFixed(3)}` : `${shiftFromNorm(point.y).toFixed(1)} Hz`;
}

function sortCurve(curve) {
  curve.sort((a, b) => a.x - b.x);
}

function sendCurves() {
  markDownloadStale();
  node?.port.postMessage({type: "curves", curve: curves.shift, stretchCurve: curves.stretch, blurCurve: curves.blur});
}

function sendSettings() {
  markDownloadStale();
  if (!node) return;
  node.port.postMessage({
    type: "settings",
    settings: transformSettings
  });
}

function markDownloadStale() {
  spectrogram.invalidate();
  if (!buffer) return;
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  downloadReadout.textContent = "needs export";
}

function clearDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
}

function setTransportBusy(isBusy) {
  if (isBusy) isScrubbing = false;
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  playbackScrubber.disabled = isBusy || !buffer;

  downloadButton.disabled = isBusy || !buffer;
  fileInput.disabled = isBusy;
}

function setRenderBusy(isBusy) {
  if (isBusy) isScrubbing = false;
  if(isBusy)spectrogram.cancel("Analysis cancelled for export · Update to refresh");
  canvas.style.pointerEvents = isBusy ? "none" : "";
  [selectTool, penTool, eraserTool, resetButton, clearCurveButton, shiftMode, stretchMode, blurMode].forEach(button => { button.disabled = isBusy; });
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  playbackScrubber.disabled = isBusy || !buffer;

  fileInput.disabled = isBusy;
  downloadButton.disabled = !buffer;
}

function nextPlaybackToken() {
  playbackToken += 1;
  return playbackToken;
}

function isCurrentPlaybackMessage(data) {
  return data.token == null || data.token === playbackToken;
}

async function playAudio() {
  if (!buffer) return;
  if (playButton.disabled || !resetDialog.hidden) return;
  if (isPlaying) {
    node?.port.postMessage({type: "pause", token: nextPlaybackToken()});
    isPlaying = false; playButton.textContent = "Play"; return;
  }
  const requestToken = playbackToken;
  try {
    spectrogram.cancel("Analysis cancelled for playback · Update to refresh");
    await ensureAudio();
    if (isPlaying || requestToken !== playbackToken || !buffer || playButton.disabled) return;
    node.port.postMessage({ type: "play", token: nextPlaybackToken() });
    isPlaying = true;
    playButton.textContent = "Pause";
  } catch (error) {
    console.error(error);
    fileStatus.textContent = error.message;
  }
}

function stopAudio() {
  if (!buffer) return;
  isScrubbing = false;
  node?.port.postMessage({ type: "stop", reset: true, token: nextPlaybackToken() });
  isPlaying = false;
  playheadSeconds = 0;
  sourcePlayheadSeconds = 0;
  resetCurrentReadouts();
  playButton.textContent = "Play";
  draw();
}

function forceStopAudio() {
  if (!buffer) return;
  isScrubbing = false;
  node?.port.postMessage({ type: "stop", reset: true, token: nextPlaybackToken() });
  isPlaying = false;
  playheadSeconds = 0;
  sourcePlayheadSeconds = 0;
  resetCurrentReadouts();
  playButton.textContent = "Play";
  draw();
}

function toggleAudio() {
  playAudio();
}

function getSettings() {
  return { ...transformSettings };
}

async function getOfflineRenderer() {
  if (!renderOffline) {
    const module = await import("./offline-render.js?v=20260929-transport1");
    renderOffline = module.renderOffline;
  }
  return renderOffline;
}

async function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio is not available in this browser.");
    }
    audioContext = new AudioContextClass({sampleRate: 48000});
  }
  if (audioContext.state !== "running") await audioContext.resume();
}

function sendBufferToWorklet() {
  if (!node || !buffer) return;
  const left = new Float32Array(buffer.getChannelData(0));
  const right = new Float32Array(buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0));
  node.port.postMessage({ type: "buffer", left, right, sampleRate: buffer.sampleRate }, [left.buffer, right.buffer]);
  workletBufferLoaded = true;
}

function createAudioBuffer(channelCount, length, sampleRate) {
  if (typeof AudioBuffer !== "undefined") {
    return new AudioBuffer({ numberOfChannels: channelCount, length, sampleRate });
  }

  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContext) {
    throw new Error("Web Audio is not available in this browser.");
  }
  return new OfflineContext(channelCount, length, sampleRate).createBuffer(channelCount, length, sampleRate);
}

function createGeneratedExampleBuffer() {
  const sampleRate = 48000;
  const durationSeconds = 8;
  const length = sampleRate * durationSeconds;
  const exampleBuffer = createAudioBuffer(2, length, sampleRate);
  const left = exampleBuffer.getChannelData(0);
  const right = exampleBuffer.getChannelData(1);
  const noiseBurstSeconds = 0.045833;
  const gapSeconds = 0.020833;
  const attackSeconds = 0.003;
  const decaySeconds = 0.014;
  const sustainLevel = 0.22;
  const releaseSeconds = 0.018;
  const gain = 0.32;
  const noiseFrames = Math.floor(noiseBurstSeconds * sampleRate);
  const gapFrames = Math.floor(gapSeconds * sampleRate);
  const cycleFrames = Math.max(1, noiseFrames + gapFrames);
  const attackFrames = Math.max(1, Math.floor(attackSeconds * sampleRate));
  const decayFrames = Math.max(1, Math.floor(decaySeconds * sampleRate));
  const releaseFrames = Math.max(1, Math.floor(releaseSeconds * sampleRate));
  let seed = 123456789;

  const nextNoise = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return (seed / 4294967295) * 2 - 1;
  };

  for (let i = 0; i < length; i += 1) {
    const cyclePosition = i % cycleFrames;
    if (cyclePosition >= noiseFrames) {
      continue;
    }

    let envelope = sustainLevel;
    if (cyclePosition < attackFrames) {
      envelope = cyclePosition / attackFrames;
    } else if (cyclePosition < attackFrames + decayFrames) {
      const decayPosition = (cyclePosition - attackFrames) / decayFrames;
      envelope = 1 - ((1 - sustainLevel) * decayPosition);
    }

    const releasePosition = (noiseFrames - cyclePosition) / releaseFrames;
    envelope *= Math.max(0, Math.min(1, releasePosition));
    const sample = nextNoise() * gain * envelope;
    left[i] = sample;
    right[i] = sample;
  }

  return exampleBuffer;
}

function loadGeneratedExample() {
  buffer = createGeneratedExampleBuffer();
  buildWaveform(buffer);
  workletBufferLoaded = false;
  clearDownload();
  downloadReadout.textContent = "ready";
  fileStatus.textContent = `White noise intervals - ${buffer.duration.toFixed(2)} s`;
  playheadSeconds = 0;
  sourcePlayheadSeconds = 0;
  resetCurrentReadouts();
  setTransportBusy(false);
  draw();
}

function getPlotBounds() {
  return {
    left: parameterScaleWidth,
    width: Math.max(1, canvasCssWidth - parameterScaleWidth - plotRightPadding),
    height: canvasCssHeight
  };
}

function getParameterTicks() {
  if(activeCurve === "blur") return [0,.25,.5,.75,1].map(y=>({y,label:`${y*100}%`,emphasis:y===0}));
  if(activeCurve === "stretch") return [.5,.75,1,1.5,2].map(amount => ({y:stretchToNorm(amount),label:`${amount.toFixed(2)}`,emphasis:amount===1}));
  return [0, .25, .5, .75, 1].map(y => ({y, label: `${shiftFromNorm(y) > 0 ? "+" : ""}${shiftFromNorm(y)}`}));
}

function drawParameterScale() {
  const { left, width, height } = getPlotBounds();
  ctx.save();
  ctx.font = "600 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(170, 188, 204, 0.78)";
  ctx.strokeStyle = "rgba(72, 111, 143, 0.28)";
  ctx.lineWidth = 1;
  for (const tick of getParameterTicks()) {
    const y = (1 - tick.y) * height;
    const textY = Math.max(9, Math.min(height - 7, y + 4));
    ctx.font = tick.emphasis
      ? "750 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      : "600 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = tick.emphasis ? "rgba(232, 240, 246, 0.96)" : "rgba(170, 188, 204, 0.78)";
    ctx.strokeStyle = tick.emphasis ? "rgba(95, 141, 177, 0.6)" : "rgba(72, 111, 143, 0.28)";
    ctx.lineWidth = tick.emphasis ? 1.6 : 1;
    ctx.fillText(tick.label, left - 9, textY);
    ctx.beginPath();
    ctx.moveTo(left - 5, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(104, 145, 178, 0.62)";
  ctx.beginPath();
  ctx.moveTo(left, 0);
  ctx.lineTo(left, height);
  ctx.stroke();
  ctx.restore();
}

function drawCurve(curve, color, width, fillPoints) {
  const { left, width: w, height: h } = getPlotBounds();
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i <= w; i += 3) {
    const x = i / w;
    const y = valueAt(curve, x);
    const px = left + (x * w);
    const py = (1 - y) * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (fillPoints) {
    for (const point of curve) {
      ctx.beginPath();
      ctx.arc(left + (point.x * w), (1 - point.y) * h, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#06111c";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCurves() {
  drawCurve(curves[activeCurve], curveColors[activeCurve], 4.8, true);
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function getTooltipPoint() {
  if (dragging && selectedPoint != null) {
    return { curveName: activeCurve, point: curves[activeCurve][selectedPoint] };
  }
  if (hoverPoint?.curveName === activeCurve) {
    return { curveName: activeCurve, point: curves[activeCurve][hoverPoint.pointIndex] };
  }
  return null;
}

function drawPointTooltip(curveName, point) {
  if (!point) return;
  const { left, width: w, height: h } = getPlotBounds();
  const text = formatPointValue(curveName, point);
  const px = left + (point.x * w);
  const py = (1 - point.y) * h;
  const paddingX = 8;
  const boxHeight = 26;

  ctx.save();
  ctx.font = "650 13px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const boxWidth = Math.ceil(ctx.measureText(text).width + (paddingX * 2));
  const boxX = Math.max(left + 8, Math.min(left + w - boxWidth - 8, px - (boxWidth / 2)));
  let boxY = py - 36;
  if (boxY < 8) boxY = py + 14;

  roundedRectPath(boxX, boxY, boxWidth, boxHeight, 5);
  ctx.fillStyle = "rgba(7, 17, 28, 0.96)";
  ctx.fill();
  ctx.strokeStyle = curveColors[curveName];
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#e8f0f6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, boxX + (boxWidth / 2), boxY + (boxHeight / 2) + 0.5);
  ctx.restore();
}

function draw() {
  const scale = window.devicePixelRatio || 1;
  const canvasWidth = canvasCssWidth;
  const { left, width: w, height: h } = getPlotBounds();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, h);
  ctx.fillStyle = "#0c1f31";
  ctx.fillRect(0, 0, canvasWidth, h);

  ctx.strokeStyle = "rgba(63, 101, 132, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 40; i += 1) {
    if (i % 4 === 0) continue;
    const x = left + ((i / 40) * w);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 1; i < 8; i += 1) {
    if (i % 2 === 0) continue;
    const y = (i / 8) * h;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(79, 121, 155, 0.28)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const x = left + ((i / 10) * w);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let i = 1; i < 4; i += 1) {
    const y = (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + w, y);
    ctx.stroke();
  }

  if (waveform.length > 0) {
    ctx.fillStyle = "rgba(128, 158, 186, 0.48)";
    const midTop = h * 0.32;
    const midBottom = h * 0.70;
    const ampTop = h * 0.24;
    const ampBottom = h * 0.18;
    const step = Math.max(1, Math.floor(waveform.length / w));
    for (let x = 0; x < w; x += 1) {
      const sample = waveform[Math.min(waveform.length - 1, Math.floor(x / w * waveform.length))] || 0;
      ctx.fillRect(left + x, midTop - (sample * ampTop), 1, Math.max(1, sample * ampTop * 2));
      ctx.fillRect(left + x, midBottom - (sample * ampBottom), 1, Math.max(1, sample * ampBottom * 2));
    }
  }

  drawParameterScale();
  drawCurves();
  if (buffer) {
    ctx.fillStyle = "#aabccc"; ctx.font = "11px system-ui"; ctx.textAlign = "center";
    for (let i = 1; i < 10; i++) ctx.fillText(`${(buffer.duration * i / 10).toFixed(1)} s`, left + w * i / 10, h - 9);
  }

  if (buffer) {
    const sourceDuration = buffer.duration;
    const x = left + (((sourceDuration > 0 ? sourcePlayheadSeconds / sourceDuration : 0)) * w);
    ctx.strokeStyle = "rgba(226, 236, 244, 0.86)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  const tooltip = getTooltipPoint();
  if (tooltip) drawPointTooltip(tooltip.curveName, tooltip.point);

  timeStatus.textContent = buffer
    ? `${formatClock(playheadSeconds)} / ${formatClock(getPlaybackDuration())}`
    : "00:00.00 / 00:00.00";
  if (!isScrubbing) {
    const duration = getPlaybackDuration();
    playbackScrubber.value = duration > 0 ? String(Math.max(0, Math.min(1, playheadSeconds / duration))) : "0";
  }

  modeReadout.textContent = curveLabels[activeCurve];
  document.getElementById("blurReadout").textContent = `${Math.round(valueAt(curves.blur,buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0)*100)}%`;
  pointsReadout.textContent = String(curves[activeCurve].length);
  document.getElementById("stretchReadout").textContent = `${stretchFromNorm(valueAt(curves.stretch,buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0)).toFixed(3)}`;
  document.getElementById("shiftReadout").textContent = `${shiftFromNorm(valueAt(curves.shift, buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0)).toFixed(1)} Hz`;
}

function buildWaveform(audioBuffer) {
  const channel = audioBuffer.getChannelData(0);
  const buckets = 4000;
  const samplesPerBucket = Math.max(1, Math.floor(channel.length / buckets));
  waveform = [];
  for (let i = 0; i < buckets; i += 1) {
    let peak = 0;
    const start = Math.floor(i * channel.length / buckets);
    const end = Math.max(start + 1, Math.floor((i + 1) * channel.length / buckets));
    for (let j = start; j < end; j += 1) {
      peak = Math.max(peak, Math.abs(channel[j] || 0));
    }
    waveform.push(peak);
  }
}

function decodeAudioFile(arrayBuffer) {
  const data = arrayBuffer.slice(0);
  return new Promise((resolve, reject) => {
    const promise = audioContext.decodeAudioData(data, resolve, reject);
    if (promise?.then) promise.then(resolve).catch(reject);
  });
}

async function ensureAudio() {
  await ensureAudioContext();
  if (!node) {
    if (!audioSetupPromise) {
      audioSetupPromise = setupAudio().catch((error) => {
        audioContext = null;
        node = null;
        outputMeter = null;
        throw error;
      }).finally(() => {
        audioSetupPromise = null;
      });
    }
    await audioSetupPromise;
  }
  if (!workletBufferLoaded) sendBufferToWorklet();
}

async function setupAudio() {
  if (!audioContext) {
    await ensureAudioContext();
  }
  if (!audioContext.audioWorklet) {
    throw new Error("AudioWorklet is not available. Use a current Chrome, Edge, or Safari version over HTTPS.");
  }

    await audioContext.audioWorklet.addModule(new URL("./spectral-worklet.js?v=20260929-transport1", import.meta.url));
    node = new AudioWorkletNode(audioContext, "spectral-neutral-processor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });
    outputMeter = new OutputMeterAnalyzer(audioContext, {channelCount: 2});
    node.connect(outputMeter.input);
    outputMeter.connect(audioContext.destination);
    startMeterAnimation();
    node.onprocessorerror = () => { stopAudio(); fileStatus.textContent = "Audio engine error. Reload to retry."; };
    node.port.onmessage = (event) => {
      if (!isCurrentPlaybackMessage(event.data)) return;
      if (event.data.type === "position") {
        if (isScrubbing) return;
        playheadSeconds = event.data.seconds;
        sourcePlayheadSeconds = event.data.sourceSeconds ?? event.data.seconds;
        draw();
      } else if (event.data.type === "ended") {
        isScrubbing = false;
        playButton.textContent = "Play";
        isPlaying = false;
        playheadSeconds = 0;
        sourcePlayheadSeconds = 0;
        resetCurrentReadouts();
        node?.port.postMessage({ type: "seek", progress: 0, token: nextPlaybackToken() });
        draw();
      } else if (event.data.type === "stopped") {
        isScrubbing = false;
        playButton.textContent = "Play";
        isPlaying = false;
        playheadSeconds = 0;
        sourcePlayheadSeconds = 0;
        resetCurrentReadouts();
        draw();
      }
    };
    sendBufferToWorklet();
    sendSettings();
    sendCurves();
}

async function loadAudioFile(file) {
  if (!file) return;
  if (renderAbortController) {
    renderAbortController.abort();
    renderAbortController = null;
  }
  spectrogram.invalidate(true);
  setTransportBusy(true);
  fileStatus.textContent = `Loading ${file.name}...`;
  downloadReadout.textContent = "loading";
  playButton.textContent = "Play";
  isPlaying = false;
  node?.port.postMessage({ type: "stop", reset: true, token: nextPlaybackToken() });
  try {
    await ensureAudioContext();
    const data = await file.arrayBuffer();
    const decoded = await decodeAudioFile(data);
    if (decoded.numberOfChannels > 2) throw new Error("Only mono/stereo sources supported");
    buffer = decoded;
    spectrogram.invalidate(true);
    buildWaveform(buffer);
    workletBufferLoaded = false;
    sendBufferToWorklet();
    const longFileNote = buffer.duration > largeFileSeconds ? " - long file" : "";
    fileStatus.textContent = `${file.name} - ${buffer.duration.toFixed(2)} s${longFileNote}`;
    clearDownload();
    downloadReadout.textContent = "ready";
    playheadSeconds = 0;
    sourcePlayheadSeconds = 0;
    resetCurrentReadouts();
    draw();
  } catch (error) {
    console.error(error);
    fileStatus.textContent = "Could not load audio. Try mono/stereo WAV, MP3, or M4A.";
    downloadReadout.textContent = "not ready";
    buffer = null;
    spectrogram.invalidate(true);
    waveform = [];
    clearDownload();
    draw();
  } finally {
    setTransportBusy(false);
  }
}

fileInput.addEventListener("change", async () => {
  await loadAudioFile(fileInput.files?.[0]);
  fileInput.value = "";
});

playButton.addEventListener("click", playAudio);

stopButton.addEventListener("click", stopAudio);

function seekFromScrubber() {
  if (!buffer) return;
  const progress = Math.max(0, Math.min(1, Number(playbackScrubber.value) || 0));
  playheadSeconds = progress * getPlaybackDuration();
  sourcePlayheadSeconds = playheadSeconds;
  node?.port.postMessage({type: "seek", progress, token: nextPlaybackToken()});
  draw();
}

playbackScrubber.addEventListener("pointerdown", () => { isScrubbing = true; });
playbackScrubber.addEventListener("input", seekFromScrubber);
playbackScrubber.addEventListener("change", () => { seekFromScrubber(); isScrubbing = false; });
playbackScrubber.addEventListener("pointerup", () => { isScrubbing = false; });
playbackScrubber.addEventListener("pointercancel", () => { isScrubbing = false; });

meterClipButton.addEventListener("click", () => {
  meterClipLatched = false;
  meterClipButton.classList.remove("clipped");
  meterClipButton.setAttribute("aria-pressed", "false");
});

downloadButton.addEventListener("click", async () => {
  if (!buffer) return;
  if (renderAbortController) {
    renderAbortController.abort();
    return;
  }

  if (isPlaying) {
    forceStopAudio();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  renderAbortController = new AbortController();
  setRenderBusy(true);
  downloadReadout.textContent = "creating 0%";
  downloadButton.textContent = "Cancel";
  clearDownload();

  try {
    const render = await getOfflineRenderer();
    const rendered = await render({
      audioBuffer: buffer,
      curves,
      settings: getSettings(),
      signal: renderAbortController.signal,
      onProgress: (progress) => {
        downloadReadout.textContent = `creating ${Math.round(progress * 100)}%`;
      }
    });

    downloadUrl = URL.createObjectURL(rendered.blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "Spectral-Curve-Lab-export.wav";
    document.body.appendChild(link);
    link.click();
    link.remove();
    downloadReadout.textContent = rendered.truncated
      ? `${rendered.duration.toFixed(1)} s, capped`
      : `${rendered.duration.toFixed(1)} s`;
  } catch (error) {
    if (error.name === "AbortError") {
      downloadReadout.textContent = "cancelled";
    } else {
      console.error(error);
      downloadReadout.textContent = "export failed";
    }
  } finally {
    renderAbortController = null;
    downloadButton.textContent = "Download WAV";
    setRenderBusy(false);
  }
});

function closeResetDialog() {
  resetDialog.hidden = true;
  resetButton.focus();
}

function applyResetAll() {
  forceStopAudio();
  curves.shift = defaultCurves.shift();
  curves.stretch = defaultCurves.stretch();
  curves.blur = defaultCurves.blur();

  editedCurves.shift = false;
  editedCurves.stretch = false;
  editedCurves.blur = false;

  resetCurrentReadouts();
  selectedPoint = null;
  hoverPoint = null;
  markDownloadStale();
  sendSettings();
  sendCurves();
  draw();
}

resetButton.addEventListener("click", () => {
  resetDialog.hidden = false;
  cancelResetButton.focus();
});

cancelResetButton.addEventListener("click", closeResetDialog);

confirmResetButton.addEventListener("click", () => {
  closeResetDialog();
  applyResetAll();
});

resetDialog.addEventListener("click", (event) => {
  if (event.target === resetDialog) closeResetDialog();
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || resetDialog.hidden) return;
  event.preventDefault();
  closeResetDialog();
});

clearCurveButton.addEventListener("click", () => {
  forceStopAudio();
  curves[activeCurve] = defaultCurves[activeCurve]();
  editedCurves[activeCurve] = false;
  selectedPoint = null;
  hoverPoint = null;
  resetCurrentReadouts();
  markDownloadStale();
  sendCurves();
  draw();
});

function setActiveCurve(name) {
  dragging = false;
  activeCurve = name;
  selectedPoint = null;
  hoverPoint = null;
  shiftMode.classList.toggle("active", name === "shift");
  blurMode.classList.toggle("active", name === "blur");
  stretchMode.classList.toggle("active", name === "stretch");
  curveLegend.textContent = name === "blur" ? "Time smearing · 0% = original · Frequency positions unchanged" : name === "stretch" ? "Compress ↔ Expand frequency spacing · 1 = original · Duration unchanged" : "Shift −2000…+2000 Hz · 0 Hz = original spectrum";

  draw();
}

blurMode.addEventListener("click", () => setActiveCurve("blur"));
stretchMode.addEventListener("click", () => setActiveCurve("stretch"));
shiftMode.addEventListener("click", () => {
  setActiveCurve("shift");
});

sendSettings();

function pointerToPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const { left, width } = getPlotBounds();
  const canvasX = event.clientX - rect.left;
  const x = Math.max(0, Math.min(1, (canvasX - left) / width));
  const y = Math.max(0, Math.min(1, 1 - ((event.clientY - rect.top) / rect.height)));
  return { x, y };
}

function findPointNearPointer(point) {
  const curve = curves[activeCurve];
  const xRadius = 10 / getPlotBounds().width;
  const yRadius = 10 / canvasCssHeight;
  let bestIndex = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < curve.length; i += 1) {
    const dx = (curve[i].x - point.x) / xRadius;
    const dy = (curve[i].y - point.y) / yRadius;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    if (distance <= 1 && distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function isErasing(event) {
  return selectedTool === "eraser" || Boolean(event?.[eraseModifier]);
}

function updateToolCursor(event) {
  const erasing = isErasing(event);
  canvas.classList.toggle("eraseMode", erasing);
  canvas.style.cursor = erasing ? "" : hoverPoint ? "pointer" : selectedTool === "select" ? "default" : "crosshair";
}

function setTool(tool) {
  dragging = false;
  selectedTool = tool;
  selectTool.classList.toggle("active", tool === "select");
  selectTool.setAttribute("aria-pressed", String(tool === "select"));
  penTool.classList.toggle("active", tool === "pen");
  eraserTool.classList.toggle("active", tool === "eraser");
  penTool.setAttribute("aria-pressed", String(tool === "pen"));
  eraserTool.setAttribute("aria-pressed", String(tool === "eraser"));
  selectedPoint = null;
  updateToolCursor();
  draw();
}

function setHoverPoint(pointIndex, event) {
  const nextHover = pointIndex >= 0 ? { curveName: activeCurve, pointIndex } : null;
  const changed = hoverPoint?.curveName !== nextHover?.curveName || hoverPoint?.pointIndex !== nextHover?.pointIndex;
  hoverPoint = nextHover;
  updateToolCursor(event);
  if (changed) draw();
}

selectTool.addEventListener("click", () => setTool("select"));
canvas.addEventListener("pointercancel", () => { dragging = false; selectedPoint = null; hoverPoint = null; draw(); });
penTool.addEventListener("click", () => setTool("pen"));
eraserTool.addEventListener("click", () => setTool("eraser"));

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.detail > 1 || !resetDialog.hidden) return;
  const p = pointerToPoint(event);
  const curve = curves[activeCurve];
  selectedPoint = findPointNearPointer(p);
  if (isErasing(event)) {
    event.preventDefault();
    if (eraseNode(curve, selectedPoint)) {
      editedCurves[activeCurve] = true;
      sendCurves();
    }
    selectedPoint = null;
    hoverPoint = null;
    updateToolCursor(event);
    draw();
    return;
  }
  if (selectedPoint < 0 && selectedTool === "select") return;
  if (selectedPoint < 0) {
    selectedPoint = addNode(curve, p);
  }
  hoverPoint = { curveName: activeCurve, pointIndex: selectedPoint };
  editedCurves[activeCurve] = true;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  sendCurves();
  draw();
});

canvas.addEventListener("pointermove", (event) => {
  const p = pointerToPoint(event);
  if (!dragging || selectedPoint == null) {
    setHoverPoint(findPointNearPointer(p), event);
    return;
  }
  const curve = curves[activeCurve];
  const point = curve[selectedPoint];
  moveNode(curve, selectedPoint, p);
  editedCurves[activeCurve] = true;
  sortCurve(curve);
  selectedPoint = curve.indexOf(point);
  hoverPoint = { curveName: activeCurve, pointIndex: selectedPoint };
  sendCurves();
  draw();
});

canvas.addEventListener("pointerup", (event) => {
  dragging = false;
  if (selectedPoint != null) hoverPoint = { curveName: activeCurve, pointIndex: selectedPoint };
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  updateToolCursor(event);
  draw();
});

canvas.addEventListener("pointerleave", () => {
  if (dragging) return;
  hoverPoint = null;
  updateToolCursor();
  draw();
});

canvas.addEventListener("pointerenter", updateToolCursor);

window.addEventListener("keydown", updateToolCursor);
window.addEventListener("keyup", updateToolCursor);
window.addEventListener("blur", () => updateToolCursor());

canvas.addEventListener("dblclick", (event) => {
  if (!buffer) return;
  const p = pointerToPoint(event);
  playheadSeconds = p.x * getPlaybackDuration();
  sourcePlayheadSeconds = playheadSeconds;
  node?.port.postMessage({ type: "seek", progress: p.x, token: nextPlaybackToken() });
  draw();
});

window.addEventListener("resize", resizeCanvas);
if ("ResizeObserver" in window) {
  const canvasResizeObserver = new ResizeObserver(resizeCanvas);
  canvasResizeObserver.observe(canvas);
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  if (event.code !== "Space" || isTyping || event.repeat || !buffer || playButton.disabled || !resetDialog.hidden) return;
  event.preventDefault();
  event.stopPropagation();
  if (document.activeElement instanceof HTMLButtonElement) {
    document.activeElement.blur();
  }
  toggleAudio();
});

window.addEventListener("keyup", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
  if (event.code !== "Space" || isTyping) return;
  event.preventDefault();
  event.stopPropagation();
});

resizeCanvas();

loadGeneratedExample();

// Test harness uses the same decode/load path as the file chooser.
export { loadAudioFile };
