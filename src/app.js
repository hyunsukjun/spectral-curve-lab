import {createSourceLoadGate, fetchDefaultSource} from "./default-source.js?v=20261029-bach1";
import {beginVerticalGroup, moveVerticalGroup, restoreVerticalGroup, verticalGroupSuffix, drawVerticalGroupRing} from "./curve-group-edit.js?v=20261027-shift1";
import {canvasAxisWidth, drawEditorGrid, frequencyTicks, frequencyLabel, spacedMarks, canvasLabelFont} from "./canvas-grid.js?v=20261026-graphite1";
import {mountTransport} from "./common-transport.js?v=20261013-1";
import { readAudioFile, validateAudioBuffer } from "./audio-import.js?v=20261029-input-validation1";
import { renderFeedback } from "./render-feedback.js?v=20261030-peak1";
import {createOutputTime} from "./output-time.js?v=20261018-axis64";
import {stretchFromNorm, stretchToNorm} from "./spectral-stretch.js?v=20260929-transport1";
import {shiftFromNorm} from "./spectral-shift.js?v=20260929-transport1";
import {harmonicityFromNorm} from "./spectral-harmonicity.js?v=20261002-harmonic-freeze1";
import { valueAt, addNode, moveNode, eraseNode } from "./curve-editor.js?v=20260929-transport1";
import { OutputMeterAnalyzer } from "./output-meter.js?v=20261001-playback1";
import {fillNoiseIntervals} from "./demo-sources.js?v=20261001-demo2";
import {moduleOrder,defaultEnabled,effectiveCurves,appendToChain,removeFromChain,moveInChain} from "./module-routing.js?v=20261005-chain-drag1";

const sourceLoadGate = createSourceLoadGate();
const OUTPUT_PEAK_ERROR = "Playback output was invalid. Playback stopped; open another file or retry.";
let previousPeakErrorLabel = null;

const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const timeStatus = document.getElementById("timeStatus");
const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const outputWaveCanvas = document.getElementById("outputWaveCanvas");
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
const harmonicityMode = document.getElementById("harmonicityMode");
const freezeMode = document.getElementById("freezeMode");
const moduleButtons = Object.fromEntries(moduleOrder.map(name=>[name,document.getElementById(`${name}Mode`)]));
const chainDiagram = document.getElementById("chainDiagram");
const curveLegend = document.getElementById("curveLegend");

const renderNotice = document.getElementById("renderNotice");
const saveWavLink = document.getElementById("saveWavLink");
const downloadReadout = document.getElementById("downloadReadout");
const modeReadout = document.getElementById("modeReadout");
const pointsReadout = document.getElementById("pointsReadout");
const penTool = document.getElementById("penTool");
const eraserTool = document.getElementById("eraserTool");
const resetDialog = document.getElementById("resetDialog");
const cancelResetButton = document.getElementById("cancelResetButton");
const confirmResetButton = document.getElementById("confirmResetButton");
const eraseModifier = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgentData?.platform || "")
  ? "altKey"
  : "ctrlKey";

const transformSettings = {};

const largeFileSeconds = 180;

const curveColors = {
  shift: "#6de0c0",
  stretch: "#eb6f75",
  blur: "#dab877",
  harmonicity: "#b595ef",
  freeze: "#79c9f0",

};

let audioContext;
let audioSetupPromise = null;
let node;
let outputMeter;
let workletBufferLoaded = false;
let buffer;
let sourceFileLabel = "";

let activeCurve = null;
let selectedTool = "pen";
let selectedPoint = null;
let curvePointerId = null;
let verticalDrag = null;
let shiftHeld = false;
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
const parameterScaleWidth = canvasAxisWidth;
const plotRightPadding = 8;

const curves = { shift: [{x: 0, y: .5}, {x: 1, y: .5}], blur: [{x:0,y:0},{x:1,y:0}], stretch: [{x:0,y:.5},{x:1,y:.5}], harmonicity:[{x:0,y:.5},{x:1,y:.5}], freeze:[{x:0,y:0},{x:1,y:0}] };
const enabled = defaultEnabled();
let chainOrder = [];
let draggedChainModule = null;

const defaultCurves = { shift: () => [{x: 0, y: .5}, {x: 1, y: .5}], blur: () => [{x:0,y:0},{x:1,y:0}], stretch: () => [{x:0,y:.5},{x:1,y:.5}], harmonicity:()=>[{x:0,y:.5},{x:1,y:.5}], freeze:()=>[{x:0,y:0},{x:1,y:0}] };

const editedCurves = { shift: false, stretch: false, blur: false, harmonicity:false, freeze:false };

const curveLabels = {
  shift: "Spectral Shift",
  stretch: "Spectral Stretch",
  blur: "Spectral Blur",
  harmonicity: "Harmonicity",
  freeze: "Spectral Freeze",

};


const outputTime = createOutputTime(outputWaveCanvas, {seek: seekToProgress, scrubbing: value => { isScrubbing = value; }, formatClock});


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
  const hundredths = Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 100);
  const minutes = Math.floor(hundredths / 6000);
  const rest = (hundredths % 6000) / 100;
  return `${String(minutes).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}`;
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
    row.querySelector(".meterRms").style.clipPath = `inset(0 ${(1-meterPosition(display.rms))*100}% 0 0)`;
    row.querySelector(".meterPeak").style.clipPath = `inset(0 ${(1-meterPosition(display.peak))*100}% 0 0)`;
    row.querySelector(".meterHold").style.left = `${meterPosition(display.hold) * 100}%`;
    row.querySelector(".meterHold").style.opacity = display.hold > 0.001 ? "1" : "0";
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
  return curveName === "blur" || curveName === "freeze" ? `${Math.round(point.y*100)}%` : curveName === "harmonicity" ? `${Math.round(harmonicityFromNorm(point.y)*100)}%` : curveName === "stretch" ? `${stretchFromNorm(point.y).toFixed(3)} x` : `${shiftFromNorm(point.y).toFixed(1)} Hz`;
}

function sortCurve(curve) {
  curve.sort((a, b) => a.x - b.x);
}

function sendCurves() {
  markDownloadStale();
  const active = effectiveCurves(curves,enabled);
  node?.port.postMessage({type: "curves", curve: active.shift, stretchCurve: active.stretch, blurCurve: active.blur, harmonicityCurve:active.harmonicity, freezeCurve:active.freeze, order:[...chainOrder]});
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
  if (!buffer) return;
  clearDownload();
  setExportStatus("needs export");
}

function clearDownload() {
  renderNotice.textContent = "";
  renderNotice.classList.remove("clipping");
  saveWavLink.hidden = true;
  saveWavLink.removeAttribute("href");
  saveWavLink.textContent = "Save WAV";
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
}

function setTransportBusy(isBusy) {
  if (isBusy) isScrubbing = false;
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  outputTime.setDisabled(isBusy || !buffer);

  downloadButton.disabled = isBusy || !buffer;
  fileInput.disabled = isBusy;
}

function setRenderBusy(isBusy) {
  if (isBusy) isScrubbing = false;
  canvas.style.pointerEvents = isBusy ? "none" : "";
  [penTool, eraserTool, resetButton, shiftMode, stretchMode, blurMode, harmonicityMode, freezeMode].forEach(button => { button.disabled = isBusy; });
  chainDiagram.querySelectorAll(".chainBlock").forEach(button => { button.disabled = isBusy; button.draggable = !isBusy; });
  clearCurveButton.disabled = isBusy || !activeCurve;
  playButton.disabled = isBusy || !buffer;
  stopButton.disabled = isBusy || !buffer;
  outputTime.setDisabled(isBusy || !buffer);

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
    const needsInitialSeek = !node || !workletBufferLoaded;
    await ensureAudio();
    if (isPlaying || requestToken !== playbackToken || !buffer || playButton.disabled) return;
    if (needsInitialSeek) node.port.postMessage({type: "seek", progress: playheadSeconds / getPlaybackDuration(), token: playbackToken});
    node.port.postMessage({ type: "play", token: nextPlaybackToken() });
    isPlaying = true;
    if (fileStatus.textContent === OUTPUT_PEAK_ERROR && previousPeakErrorLabel != null) fileStatus.textContent = previousPeakErrorLabel;
    previousPeakErrorLabel = null;
    playButton.textContent = "Pause";
  } catch (error) {
    console.error(error);
    fileStatus.textContent = error.message;
  }
}

function stopAudio() {
  if (!buffer) return;
  isScrubbing = false;
  const stopToken = nextPlaybackToken();
  node?.port.postMessage({ type: "stop", reset: true, token: stopToken });
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
  const stopToken = nextPlaybackToken();
  node?.port.postMessage({ type: "stop", reset: true, token: stopToken });
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
    const module = await import("./offline-render.js?v=20261030-peak1");
    renderOffline = module.renderOffline;
  }
  return renderOffline;
}

async function ensureAudioContext({ resume = true } = {}) {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio is not available in this browser.");
    }
    audioContext = new AudioContextClass({sampleRate: 48000});
  }
  if (resume && audioContext.state !== "running") await audioContext.resume();
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
  fillNoiseIntervals(left, right, sampleRate);

  return exampleBuffer;
}

function loadGeneratedExample() {
  if (buffer) forceStopAudio();
  buffer = createGeneratedExampleBuffer();
  buildWaveform(buffer);
  workletBufferLoaded = false;
  sendBufferToWorklet();
  clearDownload();
  setExportStatus("ready");
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
  if (!activeCurve) return [];
  if(activeCurve === "freeze") return [0,.25,.5,.75,1].map(y=>({y,label:`${y*100}%`,emphasis:y===0}));
  if(activeCurve === "harmonicity") return [0,.25,.5,.75,1].map(y=>({y,label:`${Math.round(harmonicityFromNorm(y)*100)}%`,emphasis:y===.5}));
  if(activeCurve === "blur") return [0,.25,.5,.75,1].map(y=>({y,label:`${y*100}%`,emphasis:y===0}));
  if(activeCurve === "stretch") return [.5,.75,1,1.5,2].map(amount => ({y:stretchToNorm(amount),label:`${amount.toFixed(2)}`,emphasis:amount===1}));
  return [0, .25, .5, .75, 1].map(y => ({y, label: `${shiftFromNorm(y) > 0 ? "+" : ""}${shiftFromNorm(y)}`}));
}

function drawParameterScale() {
  const { left, width, height } = getPlotBounds();
  ctx.save();
  ctx.font = "400 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(170, 188, 204, 0.78)";
  ctx.strokeStyle = "rgba(72, 111, 143, 0.28)";
  ctx.lineWidth = 1;
  for (const tick of getParameterTicks()) {
    const y = (1 - tick.y) * height;
    const textY = Math.max(9, Math.min(height - 7, y + 4));
    ctx.font = tick.emphasis
      ? "500 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      : "400 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = tick.emphasis ? "rgba(232, 240, 246, 0.96)" : "rgba(170, 188, 204, 0.78)";
    ctx.strokeStyle = tick.emphasis ? "rgba(95, 141, 177, 0.6)" : "rgba(72, 111, 143, 0.28)";
    ctx.lineWidth = tick.emphasis ? 1.6 : 1;
    ctx.fillText(tick.label, left - 9, textY);
    ctx.beginPath();
    ctx.moveTo(left - 5, y);
    ctx.lineTo(tick.emphasis ? left + width : left, y);
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
    const groupPoints = new Set(getVerticalPoints());
    for (const point of curve) {
      ctx.beginPath();
      ctx.arc(left + (point.x * w), (1 - point.y) * h, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#06111c";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (groupPoints.has(point)) drawVerticalGroupRing(ctx, left + point.x * w, (1 - point.y) * h, color, canvasCssWidth - (left + point.x * w));
    }
  }
  ctx.restore();
}

function drawCurves() {
  if (!activeCurve) return;
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
  if (!activeCurve) return null;
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
  const text = formatPointValue(curveName, point) + verticalGroupSuffix(getVerticalPoints().length);
  const px = left + (point.x * w);
  const py = (1 - point.y) * h;
  const paddingX = 8;
  const boxHeight = 26;

  ctx.save();
  ctx.font = "500 12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
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
  ctx.fillStyle = "#191c20";
  ctx.fillRect(0, 0, canvasWidth, h);

  // Quiet background grid; retain scales, points and curve contrast.
  ctx.save();
  ctx.globalAlpha *= 0.65;
  drawEditorGrid(ctx, left, 0, w, h);
  ctx.restore();

  drawParameterScale();
  drawCurves();
  if (buffer) {
    ctx.fillStyle = "#aabccc"; ctx.font = "11px system-ui"; ctx.textAlign = "center";
    for (let x = 128; x < w - 30; x += 128) ctx.fillText(`${(buffer.duration * x / w).toFixed(1)} s`, left + x, h - 9);
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
  outputTime.update(playheadSeconds);

  modeReadout.textContent = activeCurve ? (enabled[activeCurve] ? curveLabels[activeCurve] : `${curveLabels[activeCurve]} · Off`) : "Select an effect";
  document.getElementById("blurReadout").textContent = `${Math.round(valueAt(curves.blur,buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0)*100)}%`;
  document.getElementById("harmonicityReadout").textContent = `${Math.round(harmonicityFromNorm(valueAt(curves.harmonicity,buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0))*100)}%`;
  document.getElementById("freezeReadout").textContent = `${Math.round(valueAt(curves.freeze,buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0)*100)}%`;
  pointsReadout.textContent = activeCurve ? String(curves[activeCurve].length) : "—";
  document.getElementById("stretchReadout").textContent = `${stretchFromNorm(valueAt(curves.stretch,buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0)).toFixed(3)} x`;
  document.getElementById("shiftReadout").textContent = `${shiftFromNorm(valueAt(curves.shift, buffer?.duration ? sourcePlayheadSeconds / buffer.duration : 0)).toFixed(1)} Hz`;
}

function buildWaveform(audioBuffer) { outputTime.setBuffer(audioBuffer); }

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

    await audioContext.audioWorklet.addModule(new URL("./spectral-worklet.js?v=20261030-peak1", import.meta.url));
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
      if (event.data.type === "invalid-output") {
        stopAudio();
        previousPeakErrorLabel = fileStatus.textContent;
        fileStatus.textContent = OUTPUT_PEAK_ERROR;
      } else if (event.data.type === "position") {
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

async function loadAudioFile(file, { request = null } = {}) {
  if (!file) return;
  const sourceRequest = request || sourceLoadGate.begin();
  if (!sourceRequest.current()) return;
  const previousDownloadStatus = downloadReadout.textContent;
  if (renderAbortController) {
    renderAbortController.abort();
    renderAbortController = null;
  }
  setTransportBusy(true);
  fileStatus.textContent = `Loading ${file.name}...`;
  setExportStatus("loading");
  playButton.textContent = "Play";
  isPlaying = false;
  const stopToken = nextPlaybackToken();
  node?.port.postMessage({ type: "stop", reset: true, token: stopToken });
  try {
    // Decoding must not wait for Safari playback permission after the file chooser.
    await ensureAudioContext({ resume: false });
    const data = await readAudioFile(file, audioContext.sampleRate);
    const decoded = await decodeAudioFile(data);
    await validateAudioBuffer(decoded, { signal: sourceRequest.signal, isCurrent: sourceRequest.current });
    if (!sourceRequest.current()) return;
    if (decoded.numberOfChannels > 2) throw new Error("Only mono/stereo sources supported");
    buffer = decoded;
    buildWaveform(buffer);
    workletBufferLoaded = false;
    sendBufferToWorklet();
    const longFileNote = buffer.duration > largeFileSeconds ? " - long file" : "";
    fileStatus.textContent = `${file.name} - ${buffer.duration.toFixed(2)} s${longFileNote}`;
    sourceFileLabel = fileStatus.textContent;
    clearDownload();
    setExportStatus("ready");
    playheadSeconds = 0;
    sourcePlayheadSeconds = 0;
    resetCurrentReadouts();
    draw();
  } catch (error) {
    if (!sourceRequest.current()) return;
    console.error(error);
    const message = /^(AIFF:|Audio input:)/.test(error.message || "") ? error.message : "Could not load audio. Try mono/stereo WAV, MP3, or M4A.";
    fileStatus.textContent = `${message}${buffer ? ` Previous audio remains available: ${sourceFileLabel}` : ""}`;
    setExportStatus(buffer ? previousDownloadStatus : "not ready");
    draw();
  } finally {
    if (sourceRequest.current()) setTransportBusy(false);
  }
}

fileInput.addEventListener("change", async () => {
  await loadAudioFile(fileInput.files?.[0]);
  fileInput.value = "";
});


playButton.addEventListener("click", () => {if(!isPlaying)playAudio();});

stopButton.addEventListener("click", () => {if(isPlaying)playAudio();else nextPlaybackToken();});

function seekToProgress(progress) {
  if (!buffer || outputWaveCanvas.getAttribute("aria-disabled") === "true" || !resetDialog.hidden) return;
  progress = Math.max(0, Math.min(1, progress));
  playheadSeconds = progress * getPlaybackDuration();
  sourcePlayheadSeconds = playheadSeconds;
  node?.port.postMessage({type: "seek", progress, token: nextPlaybackToken()});
  draw();
}

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
  setExportStatus("creating 0%");
  downloadButton.textContent = "Cancel";
  clearDownload();

  try {
    const render = await getOfflineRenderer();
    const rendered = await render({
      audioBuffer: buffer,
      curves: effectiveCurves(curves,enabled),
      order: [...chainOrder],
      settings: getSettings(),
      signal: renderAbortController.signal,
      onProgress: (progress) => {
        setExportStatus(`creating ${Math.round(progress * 100)}%`);
      }
    });

    downloadUrl = URL.createObjectURL(rendered.blob);
    const feedback = renderFeedback(rendered.metrics);
    saveWavLink.href = downloadUrl;
    saveWavLink.hidden = false;
    saveWavLink.textContent = feedback.clipped ? "Save WAV (clipped)" : "Save WAV";
    renderNotice.textContent = feedback.message;
    renderNotice.classList.toggle("clipping", feedback.clipped);
    // Review clipped output before saving; keep a direct-click retry in every browser.
    if (!feedback.clipped) saveWavLink.click();
    setExportStatus(rendered.truncated
      ? `${rendered.duration.toFixed(1)} s, capped`
      : `${rendered.duration.toFixed(1)} s`);
  } catch (error) {
    if (error.name === "AbortError") {
      setExportStatus("cancelled");
    } else {
      console.error(error);
      setExportStatus("export failed");
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
  if (verticalDrag) finishCurveDrag(true);
  forceStopAudio();
  curves.shift = defaultCurves.shift();
  curves.stretch = defaultCurves.stretch();
  curves.blur = defaultCurves.blur();
  curves.harmonicity = defaultCurves.harmonicity();
  curves.freeze = defaultCurves.freeze();

  editedCurves.shift = false;
  editedCurves.stretch = false;
  editedCurves.blur = false;
  editedCurves.harmonicity = false;
  editedCurves.freeze = false;

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

// Keep keyboard navigation inside the modal until it is dismissed.
window.addEventListener("keydown", (event) => {
  if (resetDialog.hidden || event.key !== "Tab") return;
  event.preventDefault();
  event.stopPropagation();
  const first = cancelResetButton;
  const last = confirmResetButton;
  const current = document.activeElement;
  (current === first ? last : current === last ? first : event.shiftKey ? last : first).focus();
}, true);

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
  if (verticalDrag) finishCurveDrag(true);
  if (!activeCurve) return;
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
  if (verticalDrag) finishCurveDrag(true);
  dragging = false;
  activeCurve = name;
  selectedPoint = null;
  hoverPoint = null;
  updateModuleUI();

  draw();
}

function updateModeLegend() {
  const name = activeCurve;
  if (!name) {
    curveLegend.textContent = "";
    curveLegend.style.color = "var(--cl-text-muted)";
    return;
  }
  const description = name === "freeze" ? "Capture spectral state · 0% = off · 100% = full hold" : name === "harmonicity" ? "Harmonic −100% ↔ Inharmonic +100% · 0% = original" : name === "blur" ? "Time smearing · 0% = original · Frequency positions unchanged" : name === "stretch" ? "Compress ↔ Expand frequency spacing · 1 = original · Duration unchanged" : "Shift −2000…+2000 Hz · 0 Hz = original spectrum";
  curveLegend.textContent = enabled[name] ? description : `${description} · Bypassed (curve saved)`;
  curveLegend.style.color = curveColors[name];
}

function renderChainDiagram() {
  chainDiagram.replaceChildren();
  const terminal = label => {
    const element = document.createElement("span");
    element.className = "chainTerminal";
    element.textContent = label;
    chainDiagram.appendChild(element);
  };
  const connector = (beforeName = null) => {
    const element = document.createElement("span");
    element.className = "chainConnector";
    element.textContent = "→";
    element.setAttribute("aria-hidden","true");
    acceptDrop(element, beforeName);
    chainDiagram.appendChild(element);
  };
  const finishDrag = () => {
    draggedChainModule = null;
    chainDiagram.querySelectorAll(".dragging, .dragTarget").forEach(element => element.classList.remove("dragging", "dragTarget"));
  };
  const acceptDrop = (target, beforeName) => {
    target.addEventListener("dragover", event => {
      if (!draggedChainModule || draggedChainModule === beforeName) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      target.classList.add("dragTarget");
    });
    target.addEventListener("dragleave", () => target.classList.remove("dragTarget"));
    target.addEventListener("drop", event => {
      event.preventDefault();
      const next = moveInChain(chainOrder, draggedChainModule, beforeName);
      finishDrag();
      if (next.every((name, index) => name === chainOrder[index])) return;
      chainOrder = next;
      sendCurves();
      renderChainDiagram();
    });
  };
  terminal("Input");
  for (const name of chainOrder) {
    connector(name);
    const block = document.createElement("button");
    block.type = "button";
    block.className = `chainBlock enabled${activeCurve === name ? " editing" : ""}`;
    block.dataset.module = name;
    block.draggable = true;
    block.textContent = curveLabels[name];
    block.title = `Click to edit ${curveLabels[name]}; drag to change processing order; keyboard: Alt + Left/Right arrow`;
    block.addEventListener("click",() => setActiveCurve(name));
    block.addEventListener("keydown", (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (renderAbortController) return;
      const index = chainOrder.indexOf(name);
      const nextIndex = index + (event.key === "ArrowLeft" ? -1 : 1);
      if (index < 0 || nextIndex < 0 || nextIndex >= chainOrder.length) return;
      [chainOrder[index], chainOrder[nextIndex]] = [chainOrder[nextIndex], chainOrder[index]];
      sendCurves();
      renderChainDiagram();
      chainDiagram.querySelector(`[data-module="${name}"]`)?.focus();
    });

    block.addEventListener("dragstart", event => {
      if (renderAbortController) { event.preventDefault(); return; }
      draggedChainModule = name;
      block.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", name);
    });
    block.addEventListener("dragend", finishDrag);

    chainDiagram.appendChild(block);
  }
  connector();
  terminal("Output");

}

function updateModuleUI() {
  clearCurveButton.disabled = !activeCurve;
  for (const name of moduleOrder) {
    const button = moduleButtons[name];
    button.setAttribute("aria-pressed",String(enabled[name]));
    button.classList.toggle("enabled",enabled[name]);
    button.classList.toggle("bypassed",!enabled[name]);
    button.classList.toggle("active",activeCurve === name);
    const stateHint = enabled[name]
      ? `${curveLabels[name]} On · click while selected to turn Off`
      : `${curveLabels[name]} Off · click to turn On and edit`;
    button.dataset.helpState = stateHint;
  }
  updateModeLegend();
  renderChainDiagram();
}

for (const name of moduleOrder) {
  moduleButtons[name].addEventListener("click",() => {
    if (activeCurve !== name && enabled[name]) {
      setActiveCurve(name);
      return;
    }
    enabled[name] = !enabled[name];
    chainOrder = enabled[name] ? appendToChain(chainOrder,name) : removeFromChain(chainOrder,name);
    setActiveCurve(name);
    sendCurves();
  });
}

updateModuleUI();
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
  if (!activeCurve) return -1;
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
  if (event) shiftHeld = Boolean(event.shiftKey);
  const editable = Boolean(activeCurve);
  const erasing = editable && curvePointerId == null && isErasing(event);
  canvas.classList.toggle("eraseMode", erasing);
  canvas.style.cursor = !editable ? "default" : verticalDrag || (curvePointerId == null && shiftHeld && !erasing)
    ? "ns-resize" : erasing ? "" : hoverPoint != null ? "pointer" : "crosshair";
}

function getVerticalPoints() {
  if (verticalDrag) return verticalDrag.points.map(entry => entry.point);
  if (curvePointerId != null || !shiftHeld || canvas.classList.contains("eraseMode") || !(Boolean(activeCurve))) return [];
  const index = hoverPoint?.curveName === activeCurve ? hoverPoint.pointIndex : null;
  return index != null && index >= 0 ? curves[activeCurve].slice(index) : [];
}

function groupPointerY(event, anchorX) {
  return pointerToPoint(event).y;
}

function beginCurveGroup(event, index) {
  event.preventDefault();
  if (index == null || index < 0) return false;
  const anchorX = curves[activeCurve][index].x;
  const group = beginVerticalGroup(curves[activeCurve], index, groupPointerY(event, anchorX));
  group.curveName = activeCurve;
  group.anchorX = anchorX;
  group.wasEdited = editedCurves[activeCurve];
  verticalDrag = group;
  curvePointerId = event.pointerId;
  dragging = true;
  canvas.setPointerCapture(event.pointerId);
  updateToolCursor(event);
  draw();
  return true;
}

function moveCurveGroup(event) {
  if (moveVerticalGroup(verticalDrag, groupPointerY(event, verticalDrag.anchorX))) {
    editedCurves[verticalDrag.curveName] = true;
    sendCurves();
    draw();
  }
}

function finishCurveDrag(cancel = false) {
  if (cancel && restoreVerticalGroup(verticalDrag)) {
    editedCurves[verticalDrag.curveName] = verticalDrag.wasEdited;
    sendCurves();
    draw();
  }
  verticalDrag = null;
  dragging = false;
  const pointerId = curvePointerId;
  curvePointerId = null;
  if (pointerId != null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
}

function cancelCurvePointer(event) {
  if (curvePointerId == null || event.pointerId !== curvePointerId) return;
  finishCurveDrag(true);
  updateToolCursor(event);
  draw();
}

function setTool(tool) {
  if (verticalDrag) finishCurveDrag(true);
  dragging = false;
  selectedTool = tool;
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


penTool.addEventListener("click", () => setTool("pen"));
eraserTool.addEventListener("click", () => setTool("eraser"));

canvas.addEventListener("pointerdown", (event) => {
  if (!activeCurve || event.button !== 0 || curvePointerId != null || event.detail > 1 || !resetDialog.hidden) return;
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
  if (event.shiftKey) {
    hoverPoint = selectedPoint >= 0 ? { curveName: activeCurve, pointIndex: selectedPoint } : null;
    beginCurveGroup(event, selectedPoint);
    if (selectedPoint < 0) selectedPoint = null;
    updateToolCursor(event);
    draw();
    return;
  }
  if (selectedPoint < 0) {
    selectedPoint = addNode(curve, p);
  }
  hoverPoint = { curveName: activeCurve, pointIndex: selectedPoint };
  editedCurves[activeCurve] = true;
  dragging = true;
  curvePointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  sendCurves();
  draw();
});

canvas.addEventListener("pointermove", (event) => {
  if (curvePointerId != null && event.pointerId !== curvePointerId) return;
  if (verticalDrag) { moveCurveGroup(event); return; }
  if (!activeCurve) return;
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
  if (curvePointerId == null || event.pointerId !== curvePointerId) return;
  finishCurveDrag();
  if (selectedPoint != null) hoverPoint = { curveName: activeCurve, pointIndex: selectedPoint };

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
canvas.addEventListener("pointercancel", cancelCurvePointer);
canvas.addEventListener("lostpointercapture", cancelCurvePointer);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && verticalDrag) {
    event.preventDefault();
    event.stopImmediatePropagation();
    finishCurveDrag(true);
    updateToolCursor(event);
    draw();
    return;
  }
  const previousShift = shiftHeld;
  const previousErase = canvas.classList.contains("eraseMode");
  updateToolCursor(event);
  if (previousShift !== shiftHeld || previousErase !== canvas.classList.contains("eraseMode")) draw();
});
window.addEventListener("keyup", (event) => {
  const previousShift = shiftHeld;
  const previousErase = canvas.classList.contains("eraseMode");
  updateToolCursor(event);
  if (previousShift !== shiftHeld || previousErase !== canvas.classList.contains("eraseMode")) draw();
});
window.addEventListener("blur", () => {
  finishCurveDrag(true);
  shiftHeld = false;
  hoverPoint = null;
  updateToolCursor();
  draw();
});






window.addEventListener("resize", resizeCanvas);
if ("ResizeObserver" in window) {
  const canvasResizeObserver = new ResizeObserver(resizeCanvas);
  canvasResizeObserver.observe(canvas);
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
  if (event.code !== "Space" || isTyping || !resetDialog.hidden) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat || !buffer || playButton.disabled) return;
  if (document.activeElement instanceof HTMLButtonElement) {
    document.activeElement.blur();
  }
  toggleAudio();
});

window.addEventListener("keyup", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
  if (event.code !== "Space" || isTyping || !resetDialog.hidden) return;
  event.preventDefault();
  event.stopPropagation();
});

resizeCanvas();

loadDefaultSource();

// Test harness uses the same decode/load path as the file chooser.
export { loadAudioFile };

mountTransport({state:()=>({duration:getPlaybackDuration(),seconds:playheadSeconds,playing:isPlaying,disabled:playButton.disabled}),seek:seekToProgress});

// Idle readiness is conveyed by the Download control; retain actionable feedback.
function setExportStatus(message) {
  const output = document.getElementById("downloadReadout");
  output.textContent = message;
  output.parentElement.hidden = ["", "ready", "not ready", "needs export"].includes(message);
}

async function loadDefaultSource() {
  const request = sourceLoadGate.begin();
  fileStatus.textContent = "Loading default sample…";
  setTransportBusy(false);
  try {
    const file = await fetchDefaultSource(request.signal);
    if (request.current()) await loadAudioFile(file, { request });
  } catch (error) {
    if (!request.current()) return;
    fileStatus.textContent = "Default sample unavailable. Open an audio file to begin.";
    setExportStatus("not ready");
    setTransportBusy(false);
  }
}
