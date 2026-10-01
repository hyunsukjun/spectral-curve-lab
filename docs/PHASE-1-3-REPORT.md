# Spectral Curve Lab — 첫 작업 범위 보고서

**이 문서는 초기 단계의 기록입니다. 현재 구현은 [Phase 4 보고서](PHASE-4-REPORT.md)를 참조하세요.**

작성: 2026-09-27. 근거: 제공된 INITIAL-SPECIFICATION.md §2–5, §13, §16–22, §25–28 및 현재 로컬 코드.

**결론:** 독립 shell, Select/Pen/Eraser, 실제 neutral STFT, AudioWorklet 재생, Worker 내보내기를 구현했습니다. 수치 및 Chrome 기능 검증은 통과했습니다. 전체 청감 검증·실시간 audio-thread CPU/deadline profiling은 아직 완료하지 않았으므로 Neutral STFT의 최종 품질 게이트는 열려 있습니다. Phase 4와 다섯 spectral processor는 구현하지 않았습니다.

## 1. 기존 구조 분석과 재사용

프로젝트들은 하나의 공유 패키지/monorepo가 아니라 독립 static HTML/CSS/JS 앱입니다. 현재 작업 폴더에는 Granular Curve Lab이 있고 나머지 기준 구현은 아래 별도 폴더에 있습니다.

| 기준 프로젝트 | 실제 위치 | 조사 결과와 적용 |
|---|---|---|
| Audio Curve Lab | `AudioCurveLab` | Primary reference. index.html, app.js, styles.css, transform-core.js, offline-render.js, transform-parity.mjs 조사. topbar/transport, waveform canvas, normalized nodes, smoothstep interpolation, 도구 cursor와 Reset dialog 재사용. |
| Timbre Curve Lab | `TimbreCurveLab` | 독립 app와 offline renderer 구조. filter/color 계열 파라미터와 구분하여 이식하지 않음. |
| Space Curve Lab | `SpaceCurveLab` | app/offline, 공간 배치·채널 매핑은 본 작업 범위 밖. README·파일 구조·표시 명칭 확인. |
| Granular Curve Lab | 현재 workspace의 `GranularCurveLab` | core/worklet/offline 분리, Source Window 별도 waveform, 도구와 색상 패턴 비교. granular DSP와 채널 분산은 이식하지 않음. |

Audio Curve Lab에서 실제로 사용되는 보간은 자유 Bezier handle이 아니라 `t²(3−2t)` smoothstep입니다. 동일 함수를 `curve-editor.js`로 추출했습니다. 기존 도구가 이미 Pen/Eraser를 갖고 있어 이를 확장했으며 새 drawing system은 만들지 않았습니다.

기존 Audio renderer는 16-bit/source sample-rate이고 gain, tanh와 granular 처리도 포함합니다. neutral identity 및 48 kHz/24-bit 명세에 맞지 않아 그 DSP/encoder는 재사용하지 않았습니다. 대신 lazy import, 진행률, 취소, Blob download 및 URL 수명 관리는 계승하고 encoder/engine을 교체했습니다.

명칭: 조사한 기존 앱들의 title/h1은 이미 `Curve Lab` 표기입니다. 새 UI/문서도 `Spectral Curve Lab`을 사용합니다. 실제 경로·identifier에 남은 `CurveLab`은 명세 §0에 따라 유지했습니다.

## 2. 유지한 UI 규칙

- 동일 dark palette: 배경 #101519, surface #172026, border #324047, mint #6de0c0.
- 동일 system/Inter typography, 34px 기본 버튼, 6px radius, compact topbar/readouts.
- 주 canvas의 #bdc8aa 배경, 약한 waveform overlay, time grid 및 왼쪽 parameter scale.
- 곡선 4.8px, round line join/cap; 노드 반경 6px, #111316 2px outline; 기존 hover/drag tooltip.
- 한 곡선만 표시. 미래 DSP를 작동하는 것처럼 보이게 하지 않도록 Practice Curve 및 명시적 editing-only 안내 사용.
- 과도한 spectral 색상·새 DAW 요소 없음. Spectrogram은 Phase 9이므로 추가하지 않음.
- 원본의 고정 1800px 최소 canvas 때문에 좁은 화면에서 endpoint가 사라지는 문제를 새 shell에서만 조정. frame width에 맞춰 축소하고 time label을 추가함.
- 원본 waveform bucket이 viewport 폭·짧은 소스에서 시간축을 끝까지 표현하지 못하는 부분을 새 shell에서 수정.

## 3. 편집 도구와 데이터

`[{x: 0..1, y: 0..1}, ...]` 배열. X는 파일 시간에 정규화, Y는 이번 단계 편집 연습 비율. 두 endpoint는 x=0/1, default y=0.5. 정렬된 노드 사이를 Audio Curve Lab의 smoothstep으로 표시합니다.

- Select: 기존 노드 선택·drag, 빈 영역 click은 추가하지 않음.
- Pen: node 추가·선택·drag. X가 거의 같은 경우 기존 node Y 갱신으로 중복 시간 노드 방지.
- Eraser: 내부 node 하나씩 삭제. endpoint 보호, 즉시 redraw/보간 재평가. drag erase 미구현.
- moveNode는 이웃을 넘지 않도록 제약; endpoint X 잠금, Y clamp; non-finite 좌표 거부.
- pure `addNode/moveNode/eraseNode`와 tool 목록을 `curve-editor.js`에 두어 추후 안전하게 다른 Lab에 이식 가능. 기존 Lab 전체를 refactor하지 않음.
- pointercancel와 reset/loading/play 요청 충돌 보완. Play/Pause, Stop reset, Space, seek, 자연 종료 후 restart 제공.
- 현재 곡선은 엔진으로 전달되지만 DSP에 적용되지 않음. Shift 값으로 해석하지 않음.

## 4. STFT 구조

| 항목 | Realtime preview | Offline render |
|---|---|---|
| 실행 위치 | AudioWorklet | dedicated module Worker |
| 공유 알고리즘 | spectral-core.js NeutralSTFT | 같은 NeutralSTFT |
| FFT size | 2048 | 4096 |
| hop | 512 | 1024 |
| overlap | 4× / 75% | 4× / 75% |
| sample rate | AudioContext 48 kHz 요청, 테스트에서 48 kHz 확인 | 48 kHz 고정; 필요시 Web Audio offline resampling |
| window | periodic Hann analysis/synthesis | 동일 |
| 산술 | Float64 FFT/OLA, Float32 출력 | 동일 |
| 출력 | 입력 stereo 유지, mono dual mono preview | 원본 mono/stereo 유지, 24-bit PCM |

radix-2 FFT → complex spectrum 유지 → inverse FFT의 1/N scale → synthesis Hann → overlap-add. 위치별 `sum(window²)`로 나누어 WOLA 정규화합니다. 시작은 음수 시간 frame으로 zero-padding, 끝은 zero-padding 후 정확한 원본 길이만 출력합니다. seek에서도 pre-roll을 다시 구성합니다. bypass, gain normalization, tanh/limiter, 자동 fade를 넣지 않았습니다.

미리 로딩된 파일의 lookahead를 사용하는 source processor입니다. 마이크 등 live input용 지연 모델이 아니며 원본과 output의 파일 시간축은 일치합니다. Worklet은 128-frame 요청에 대해 hop 버퍼를 읽고 필요할 때 한 frame을 갱신합니다. 시작/seek는 겹치는 네 frame을 초기화합니다. FFT table·scratch/OLA/output buffer를 재사용하며 frame마다 새 배열을 만들지 않습니다.

## 5. 검증 결과

### 수치·단위/회귀

- 2048/4096 FFT × 길이 1, 17, 511, 2048, 48001, 480000 × sine/harmonic/white-noise/transient/silence/DC = **72 cases 통과**.
- 최대 absolute sample error **7.5081×10⁻¹⁷**. stereo의 좌우를 다르게 구성해 채널 간 혼합이 없음을 확인. 시작·끝 샘플 포함, 각 case seek 확인.
- 3분 stereo 입력: 유한 출력 확인. Node DSP 처리 총 약 **1.87초**, 가장 느린 hop 약 **3.87ms**. 이것은 offline host benchmark이며 브라우저 실시간 CPU 점유율/underrun 보증이 아님.
- 실제 production worklet 클래스를 128-frame 블록으로 구동해 입력 대조, 종료, seek/pause/stop 검증.
- WAV 48 kHz, 24-bit, mono 및 홀수 data byte RIFF padding 확인.
- close nodes, min/max, non-finite 좌표, endpoint 이동/삭제 보호, node 삭제 테스트 통과.
- 모든 새 JS syntax check 통과. Audio Curve Lab의 기존 `transform-parity.mjs` 통과.
- 기존 네 Lab **39개 파일의 SHA-256이 작업 전후 동일**. 기존 구현을 변경하지 않아 이 변경이 기존 코드에 회귀를 유입하지 않았음을 확인. 기존 앱 전부의 UI/청감 회귀를 다시 수행했다는 의미는 아님.

### Chrome와 실제 음원

- 실제 로컬 JUCE example `cello.wav`: 1.036083초, 모노. 앱의 같은 loadAudioFile/decodeAudioData 경로로 로딩.
- Play/Pause, 재개, Stop, 자연 종료/default example restart, 재생 중 Pen 추가·Select 이동·Eraser 삭제·endpoint 보호, Reset 확인창과 default 2 nodes 복원 확인.
- Select 빈 곳 click에서 node 수가 늘지 않음(3 유지), 내부 node Eraser 후 2개 유지.
- 실제 Browser AudioWorklet을 OfflineAudioContext에서 실행한 첼로 결과: **최대/RMS 오차 0**.
- Worker 렌더 → 24-bit WAV → browser decode 후 원본 대조: **최대 5.9604645×10⁻⁸**, RMS **3.4626729×10⁻⁸**. 정상적인 24-bit 양자화 범위.
- 렌더 취소 확인. UI에서 실제 WAV 다운로드 완료: 149240 bytes, mono, 48000 Hz, 24-bit, 49732 samples.
- 최종 UI 테스트의 browser error/warn log 없음.
- browser main-thread core benchmark (mono cello): 평균 hop 0.116ms, 최대/99th 3.7ms. **이는 AudioWorklet CPU 측정이 아님**. 초기화/JIT와 128-frame deadline에 대한 profiling이 필요함.

### 미완료 게이트·artifact 한계

- 일반 Open Audio 파일 chooser 자동화는 Chrome extension 파일 접근 권한으로 막힘. 기본 picker도 사용자 브라우저 조작과 충돌. 대체 fixture 페이지는 동일 로딩 함수를 검증하지만 picker 자체의 end-to-end 증거는 아님.
- 첼로 샘플은 1초 정도이며 voice, 긴 sustained instrumental, complex field recording 청감 테스트와 pink noise 검증은 남아 있음.
- 실제 재생 상태/실제 DSP 출력의 수치는 확인했으나 스피커/헤드폰 소리를 직접 청취했다고 주장하지 않음. metallic coloration, 미세 click/pop의 청감 승인 필요.
- 테스트한 neutral output에 추가 frame-boundary discontinuity, gain/stereo 변화, NaN/Infinity는 없음. 임의 non-zero 지점의 재생 시작/Stop/seek는 원본처럼 hard boundary이며 transport ramp를 넣지 않아 click 가능성이 남음. neutral PCM identity와 별개로 평가할 사항.
- Worklet 전용 CPU profiling, drop-out/underrun 계측, 저성능 환경과 다른 browser 검증 미완료. 평균 처리 시간으로 실시간 deadline 통과를 단정하지 않음.
- 매우 긴 파일은 source 복사와 output/WAV 할당으로 메모리를 많이 사용함. 3분 수치 테스트는 장시간 production reliability 보증이 아님.

## 6. 파일 변경 내역

기존 Curve Lab 변경 파일: **없음**. 다음은 모두 새 `SpectralCurveLab` 안에 생성했습니다.

| 파일 | 역할 |
|---|---|
| index.html | family shell, 명칭, 도구, neutral 안내 |
| src/app.js | Audio 기준 UI/transport/load/waveform/reset/curve rendering을 수정 재사용 |
| src/styles.css | Audio 기준 스타일 복사 및 shell 크기 조정 |
| src/eraser-cursor.svg | 기존 cursor 재사용 |
| src/curve-editor.js | 기존 보간 + reusable 도구/노드 연산 |
| src/spectral-core.js | 공유 FFT/STFT/WOLA |
| src/spectral-worklet.js | realtime source playback/lifecycle |
| src/offline-render.js | resample, Worker 관리, progress/cancel |
| src/render-worker.js | 4096 neutral render |
| src/wav.js | 채널 수 보존 24-bit PCM WAV |
| package.json | ES module/test entry, 외부 dependency 없음 |
| tests/neutral.mjs | 수치·경계·worklet·curve 테스트 |
| tests/browser.html, tests/browser-worklet.js | native browser engine/Worker 비교 |
| tests/fixture.html | 같은 load 경로를 이용하는 UI fixture harness |
| tests/fixtures/cello.wav, README.md | 로컬 테스트 fixture 및 출처; WAV는 gitignore |
| README.md | 사용법·제한·검증 안내 |
| docs/INITIAL-SPECIFICATION.md | 제공된 원문 명세 보관 |
| docs/reference-hashes.json | 기준 코드 수정 없음 확인용 snapshot |
| docs/numerical-results.json | case별 오차·benchmark 원자료 |
| docs/browser-results.json | 실제 브라우저 수치 결과 |
| docs/PHASE-1-3-REPORT.md | 본 보고서 |
| .gitignore | 로컬 fixture/시스템 파일 제외 |

## 7. 다음 단계의 정확한 확장 지점

Neutral 품질 게이트를 승인한 뒤 `NeutralSTFT.transformSpectrum(re, im, frameStart, channel)`에 Spectral Shift mapping을 추가합니다. bin offset을 Hz로 정의하고 complex spectrum의 conjugate symmetry 및 frame 간 phase continuity를 유지해야 합니다. 단순 pitch ratio가 아니라 주파수 축의 additive 이동으로 검증합니다. DC/Nyquist와 fractional-bin 분배 처리를 명확히 하고 sine/harmonic expected-frequency 테스트를 추가해야 합니다.

그때 `curve-editor.js`의 동일 valueAt과 normalized node 데이터를 활용하고 app에 실제 Hz 축/default=0을 연결합니다. Worklet/Worker가 같은 mapping과 시간 좌표를 받도록 확장하고 neutral 경로는 유지합니다. 범위·phase 전략·청감 acceptance를 먼저 확정할 사항이며 **현재 코드에는 Shift 알고리즘을 넣지 않았습니다**.
