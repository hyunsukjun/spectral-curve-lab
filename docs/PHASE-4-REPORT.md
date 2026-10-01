# Spectral Curve Lab — Neutral 보완 및 Spectral Shift

2026-09-27. 사용자 승인: “검증 후 Spectral Shift까지 진행”. 이 단계는 Shift 하나에서 멈춥니다.

## 결과

Spectral Shift를 기존 곡선 편집기 → AudioWorklet → Worker WAV 경로 전체에 연결했습니다. default 0 Hz에서 원본을 유지하며, 양/음의 일정한 Hz 이동과 시간에 따른 곡선을 지원합니다. 새로운 Lab의 UI 문법이나 다른 spectral effect는 추가하지 않았습니다.

초기 neutral 게이트의 실시간 수치 검증을 보완했습니다. 다만 수치·동작 검증과 사람이 듣는 품질 승인을 구분합니다. 헤드폰/스피커 청감, voice/긴 악기 지속음/field recording 전체 source matrix와 장치 underrun 계측은 여전히 남아 있습니다. 이를 완료했다고 간주하지 않습니다.

## Neutral 보완

실제 AudioContext에서 production worklet의 `process()`를 감싸 출력과 처리 시간을 측정했습니다. 초기 버전은 첫 callback에서 네 개 겹침 frame을 처리해 최고 4ms/예산 초과 1회가 관측됐습니다. pre-roll 세 frame을 세 callback으로 나눠 초기 부하를 낮췄습니다.

| 실시간 8초 stereo 검사 | 변경 전 neutral | 보완 후 neutral | Shift 곡선 적용 |
|---|---:|---:|---:|
| process 누적 관측 시간 | 114ms | 113ms | 123ms |
| 최고 관측 시간 | 4ms | 2ms | 2ms |
| 2.667ms quantum 예산 초과 관측 | 1회 | 0회 | 0회 |
| 샘플 비교 최대 오차 | 0 | 0 | 0 (같은 엔진의 기준 출력 대비) |

시계는 AudioWorklet의 `Date.now`이며 **1ms 해상도**입니다. Shift 누적 process 시간/8초는 약 1.54%이지만 OS CPU 사용률이 아닙니다. 일부 message callback·constructor 비용과 device output은 이 process 계측 밖에 있습니다. 장치 underrun이 없었다는 증거도 아닙니다.

새 pre-roll은 약 8ms 시작/seek 준비 시간을 갖습니다. STFT 파일 시간축과 export 길이는 그대로입니다. pause/resume에서 기존 UI가 다시 seek하던 동작을 제거해 위상과 정확한 재생 위치를 유지합니다.

## Shift 의미와 알고리즘

- 범위: **−2000…+2000 Hz**. y=0.5 → 0 Hz. 기본 두 endpoint는 0 Hz.
- `f_output = f_input + shiftHz`. 예: 440/880 Hz +200 → 640/1080 Hz. 비율을 유지하는 pitch transposition이 아닙니다.
- STFT positive bins를 analytic spectrum으로 만들고 complex inverse FFT/WOLA를 수행합니다. 한 개의 연속 위상 oscillator로 complex output을 이동한 뒤 실수부를 취합니다. 이는 소수 bin/Hz 이동을 허용하며 매 frame의 oscillator phase reset을 피합니다.
- analytic spectrum의 positive bins ×2, negative bins zero, DC/Nyquist ×1. 이 구성의 수학적 기준은 [SciPy 공식 Hilbert 문서](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.hilbert.html)와 같습니다. 프로젝트는 SciPy에 의존하지 않고 자체 JS FFT를 사용합니다.
- 중간 analytic signal은 conjugate symmetric가 아니며, 최종 실수 출력에서 실신호의 양/음 대칭이 형성됩니다. 이전 보고서의 예상 “complex-bin 재배치” 위치를 확장해 이 방식으로 구현했습니다.
- sample 단위 10ms parameter smoothing, 동일 oscillator phase를 모든 채널에 사용. UI editing 중 phase를 유지합니다.
- 일정한 0 Hz는 원본 실수 WOLA 출력. nonzero 이후 0 Hz로 돌아올 때 internal 10ms wet transition으로 원본에 접근해 갑작스러운 위상 reset을 피합니다. 이 전환 중에는 즉시 bit-identical하지 않습니다.
- DC/Nyquist 경계의 100 Hz soft guard. 범위를 크게 벗어난 성분은 감쇠/제거하고 wrap-around를 피합니다. |shift|<50 Hz에서는 neutral에 연속적으로 접근하도록 guard를 섞으므로 경계 바깥 성분의 brick-wall 제거는 아닙니다.
- Preview: FFT 2048/hop 512. Render: 4096/hop 1024. 동일 periodic Hann/WOLA와 Shift 코드, 48 kHz/24-bit WAV. source mono/stereo 보존.

## UI·데이터 흐름

Audio Curve Lab의 mint 곡선, 노드·툴팁·보간·도구·Reset 구조를 유지했습니다. Practice Curve가 Spectral Shift로 바뀌고 axis/tooltip/readout이 실제 Hz로 표시됩니다. 주 편집 영역에는 Shift 한 곡선만 있습니다.

UI `{x,y}` nodes → worklet curve message → SpectralShift.setCurve → shiftAt(source sample) → smoothed Hz/continuous phase → audio. Worker는 같은 곡선의 snapshot을 받아 같은 class로 렌더합니다. 표시 readout은 곡선 목표값이며 내부 10ms smoothing 값과 순간적으로 다를 수 있습니다.

렌더 중에는 곡선과 Reset 편집을 잠가 export가 도중에 다른 곡선으로 바뀌지 않게 했습니다. Cancel과 progress는 유지했습니다. pause/resume는 다시 seek하지 않습니다. 명칭은 모든 신규 UI/문서에 Curve Lab으로 유지합니다.

## 검증

### 독립 수치 검사

- 기존 neutral 72 cases 및 worklet lifecycle/curve tests 통과.
- Shift 0의 추가 neutral 검사: white noise, sine, 1/17 sample 소스. 최대 오차 약 **1.83×10⁻¹⁶**.
- FFT 2048/4096 × Shift −2000, −200, −137.25, 0, +137.25, +200, +2000: **14 tonal cases** 통과. 주파수/진폭과 위상 연속성 기준 sine에 대조.
- 440/880 Hz 입력 +200 Hz: 640 Hz 진폭 약 0.2000000, 1080 Hz 약 0.2000000, pitch-ratio 결과인 1280 Hz 약 **2.02×10⁻¹⁰**.
- 200 Hz−2000 Hz, 23000 Hz+2000 Hz 경계 검사, 두 FFT size 모두 잔여 RMS **2.75×10⁻⁸ 이하**.
- close nodes, 급격한 ±2000 Hz 변화, 1/17/511/48000 sample 소스, live curve update에서 finite output과 peak 제한 검증.
- 440 Hz+137.25 Hz의 preview/render 내부 구간 RMS 차이 약 **1.30×10⁻⁶**. 모든 source/전환에서 두 FFT size가 동일하다는 뜻은 아닙니다.
- 3분 stereo Shift streaming 스트레스: 별도 `shift-stress-results.json` 참조. 전체 출력 finite/peak bounded 검사.

### 실제 브라우저·파일 경로

- Chrome의 실제 AudioWorklet +200 Hz 출력에서 640 Hz 진폭 약 **0.3000000** (입력 440 Hz/0.3).
- 44.1/48/96 kHz 입력 × 0/+200/−200 Hz = **9 Worker→WAV→decode 검사 통과**. 모두 48000 samples/48 kHz, stereo 비율 오차 ≤5.96×10⁻⁸. 샘플레이트 변환 시 소폭의 amplitude 차이 포함.
- 8초 real-time graph에서 급격한 Shift 곡선을 적용한 stereo 출력을 같은 엔진의 기준 출력과 비교: 최대 오차 0. 보고서 상단에 timing 한계 명시.
- Chrome UI에서 재생 중 Pen 추가·Select 이동·Eraser 삭제, pause/resume, Stop 확인. Hz readout과 노드 수 반영.
- 최종 Chrome 연결이 종료되어 Codex in-app browser에서 실제 cello fixture를 다시 로드하고 nonzero 곡선 재생/Stop/Download 검증 완료.
- 실제 다운로드: `Downloads/Spectral-Curve-Lab-shift.wav`, **149240 bytes, mono, 48000 Hz, 24-bit**. UI에서 약 +239 Hz가 표시된 nonzero 곡선. 정확한 +200 Hz 증거는 위의 별도 수치/브라우저 검사입니다.
- 파일 chooser 자체는 앞 단계와 동일하게 미검증. fixture page가 동일 loadAudioFile/decodeAudioData 경로를 호출했습니다.
- 기존 Audio/Timbre/Space/Granular 39개 파일의 hash 불변. 이 단계에서 다른 Lab 수정 없음.

## 남은 품질 한계

- 사람의 청감 승인을 하지 않았습니다. low-frequency/boundary 부근의 analytic STFT 오차, frame smear, 급격한 편집 전환을 실제 voice/field/악기 지속음으로 들어야 합니다.
- 100 Hz soft guard와 50 Hz 부근 blending은 의도된 대역 손실/잔여를 만듭니다. 극단값에서 원본의 모든 성분이 보존되는 processor가 아닙니다.
- Stop/seek의 hard boundary에는 아직 transport fade가 없습니다. source가 0이 아닌 지점에서 click 가능.
- 별도 limiter/gain normalization 없음. full-scale source의 위상 변화로 sample peak가 커지면 24-bit WAV에서 clipping될 수 있습니다.
- 1ms timer profile은 정밀 deadline trace를 대체하지 않습니다. 긴 파일 메모리 제한과 다른 장치·브라우저 검증도 남습니다.

## 변경 파일

기존 Spectral shell 변경: `index.html`, `README.md`, `package.json`, `src/app.js`, `src/styles.css`, `src/spectral-core.js`, `src/spectral-worklet.js`, `src/offline-render.js`, `src/render-worker.js`, `tests/neutral.mjs`, `tests/browser-worklet.js`, `tests/fixture.html`, `docs/PHASE-1-3-REPORT.md` (과거 기록 안내만 추가), `docs/numerical-results.json` (재검증 결과).

새 파일: `src/spectral-shift.js`, `tests/shift.mjs`, `tests/realtime.html`, `tests/realtime-worklet.js`, `tests/browser-shift.html`, `docs/shift-results.json`, `docs/shift-stress-results.json`, `docs/realtime-results.json`, `docs/browser-shift-results.json`, 본 보고서.

## 종료 지점

Spectral Shift 하나의 구현 및 위에 명시한 검증까지 진행했습니다. Spectral Stretch/Blur/Harmonicity/Freeze 및 spectrogram은 구현하지 않았습니다. 다음 단계 전에는 현재 Shift의 청감·경계 처리 검토를 우선합니다.
