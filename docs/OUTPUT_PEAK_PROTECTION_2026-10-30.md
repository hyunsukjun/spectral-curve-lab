# Output sample-peak protection — 2026-10-30

Status: implemented and locally non-listening verified, not committed/deployed. This is the first bounded web stability batch; it is not a new full-product or acoustic acceptance.

## Policy

Ceiling0.98 linear (about−0.18dBFS) reuses Space's existing WAV ceiling. Preview reuses the instantaneous stereo-linked safety-gain algorithm already present as Oscillator's StereoSafetyLimiter: immediate attenuation when needed,60ms exponential recovery toward unity, no upward gain and no lookahead/delay. This is a separately documented output bus policy, not the active Oscillator5ms lookahead processor or a change to its−1dB ceiling.

The helper is copied byte-identically into these independent deployments. When gain remains1, output processing is unchanged. After a peak triggers attenuation, the recovery also affects subsequent quieter samples; do not claim all lower-amplitude samples are always bit-identical regardless of preceding history. Channels share gain so relative spatial balance is preserved. This limits sample peaks, not oversampled/inter-sample true peaks, and cannot repair a clipped recording. High-level dynamics/timbre and listening acceptance remain unverified.

Spectral: linked Preview guard after the existing transport boundary; retain gain with paused engine state and reset it on a new input buffer. Raw STFT/FFT/curve/phase algorithms are unchanged. WAV gets one down-only whole-output gain after its existing10ms boundary and before24bit encoding, shared across every channel; normal output bytes remain unchanged.

## Failure and retained state

Nonfinite processed output stops/mutes the affected playback path and reports an actionable status; it is not silently counted as a successful finite render. Space replaces a failed output guard on explicit retry; Spectral uses its existing token gate to stop/report. Retry restores the valid source label. Input file admission and previous-valid-source semantics remain. Normal Pause/resume keeps the established source/effect/clock ownership; final transport fades are not multiplied a second time by this stage.

## Numerical evidence and limits

Coordinating evidence: /Users/hyunsukjun/Documents/ChatGPT/4.프로그램.완료/work/CurveLabWebV1/qa/web-stability-batch1-20261030.
- Pure helper matches the existing zero-delay safety rule across44.1/48/96k; finite/bounded/linked/unchanged-normal and multichannel down-only cases.
- Native Space guard:8 Chrome/Brave rate/level cases; first nonzero frame preserved. Brave offline readback amplitude difference is recorded, not bit-equality approval.
- Space actual graph16 captures including rapid direction+Room and input4. Existing peaks up to3.7447 become at most0.980000019 (Float32 rounding). Quiet fixed path remains the same.4 before/after browser lifecycle runs retain source/room/panner/guard identity and pause position;12 WAV downloads retain format/duration, Chrome3 byte pairs match. Brave byte identity is not claimed.
- Spectral actual Worklet6 cases: normal PCM exact, high output bounded, duration/end-token unchanged; invalid output mute/report separately checked. Browser Worker24 cases include1/2/4ch normal/hot before/after: normal WAV bytes exact in both tested browsers; protected clipping samples0. Actual UI hot-file Play/Pause/resume/end/save and protected-level notice pass in Chrome/Brave. Synthetic current-token error messages check UI stop/retry; they are not malformed-file admission tests.
- Existing stale Spectral test expectations assumed immediate Pause and no10ms output boundary. Both failed on baseline and first candidate; scoped test expectations now use the already shipped10ms semantics and this output policy. Initial failure artifacts retained.24 focused regression suites pass. No claim of all tests/all chains/all input lengths/CPU headroom or other engine/device/listening coverage.

## Portable asset

Keep pre-DSP source validation, processing result, output guard and final boundary as distinct stages. Audio-frame gain state and linked channels are portable; AudioWorklet/HTTP/DOM/error delivery are web-specific. Whole-output WAV normalization and live dynamic attenuation are intentionally different policies, so waveform identity between Preview and Render is not promised. No new Native implementation or acceptance from this contract.


## Output protection release authorization — 2026-10-30

The user approved verification, commit and public deployment of the reviewed output-protection candidate. Source processing, parameter mappings, spatial/channel rules and time axes remain unchanged. Protection may alter dynamics when engaged; this is not listening, physical-device or full-product acceptance. Publication proof is tracked separately in Interface QA `space-spectral-output-release-20261030`.
