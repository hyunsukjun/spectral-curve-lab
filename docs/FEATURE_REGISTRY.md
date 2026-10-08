# 기능 등록부 — 2026-09-29

상태 구분: **IMPLEMENTED**는 코드 존재, **VERIFIED**는 아래 범위의 수치/브라우저 기록 존재를 뜻한다. 청감 승인과 모든 환경 보증은 별개다. 제품 동작/데이터/웹 구현을 분리한 상세 계약은 [파라미터](PARAMETER_SPEC.md), [상호작용](INTERACTION_SPEC.md), [DSP](DSP_BEHAVIOR.md)에 있다.

| ID · 분류 · 상태 | 사용자가 하는 일 / 입력→출력 | 데이터·처리 / 웹 구현 | 경계·검증·이관 |
| --- | --- | --- | --- |
| `SCL-C01` 소스 로딩 · COMMON · VERIFIED | 기본 8초 Noise intervals를 듣거나 mono/stereo 오디오를 연다 → waveform/길이 갱신 | `AudioBuffer` + normalized timeline; `demo-sources.js`의 결정적 생성/`decodeAudioData` | 2채널 초과 거부, 실패 상태 표시; 실제 파일 전환은 기존 곡선을 유지. 기본 생성 예제는 음질 승인 자료가 아님. native는 디코더 교체 |
| `SCL-C02` 커브 편집 · COMMON · VERIFIED | 모드 전환 후 Select/Pen/Eraser로 점 추가·이동·삭제 → 시간별 값 | 다섯 독립 곡선의 `{x,y}`; `curve-editor.js`와 Canvas event | 끝점 보호, 빈 곳 Eraser 무효, 고해상도/resize; `tests/neutral.mjs`, 디자인 검증. native는 gesture 이식 |
| `SCL-C03` 재생/탐색 · COMMON · VERIFIED | 하단 Play/Pause/Stop, Spacebar, OUTPUT TIME 클릭·드래그·키보드 seek → playhead 및 오디오 | 소스 프레임 위치와 worklet engine state; `spectral-worklet.js`; 이동 중 시간/두 Canvas 재생선 표시 | 자연 종료 후 0으로 복귀, pause는 상태 유지; `tests/transport.mjs`, [하단 바 검증](PLAYBACK-BAR-20261001.md). native 오디오 callback 대체 |
| `SCL-C08` 출력 미터 · COMMON · VERIFIED | Preview의 L/R 레벨·피크 유지·CLIP 표시와 수동 초기화 | stereo Worklet 출력 → unity gain 분기 → channel analyser → destination; DSP·WAV와 분리 | 모노 소스는 L/R 복제; 0.999 peak threshold와 브라우저 CLIP 시험. [하단 바 검증](PLAYBACK-BAR-20261001.md) |
| `SCL-C04` Clear/Reset · COMMON · VERIFIED | 현재 모드만 기본값, 또는 확인창을 거쳐 다섯 곡선 복원 | 기본 두 점 커브; `app.js` | Reset 취소 시 무변경; 디자인 검증. Undo/Redo는 미구현 |
| `SCL-M01` Shift · MODULE · VERIFIED | ±Hz 곡선 → 모든 성분의 가산 주파수 이동 | `shift` 커브, analytic STFT/위상 누적 | 경계 soft guard; `tests/shift.mjs`, `tests/browser-shift.html`; 청감 승인 대기 |
| `SCL-M02` Stretch · MODULE · VERIFIED | 1 kHz 중심 압축/확장 곡선 → 길이 일정한 주파수 재배치 | `stretch` 커브, peak-region 처리 | 속도 변화 아님; `tests/stretch.mjs`, `tests/browser-stretch.html`; 청감 승인 대기 |
| `SCL-M03` Blur · MODULE · VERIFIED | 시간 번짐 곡선 → 어택/성분 변화 완화 | `blur` 커브, per-bin 시간 평활 | 파일 끝 tail 절단; `tests/blur.mjs`, `tests/browser-blur.html`; 청감 승인 대기 |
| `SCL-M04` Harmonicity · MODULE · IMPLEMENTED | −100…+100% 곡선 → 배음 격자 접근/비화성 확장 | `harmonicity` 커브, 저역 peak 기반 기준음 추정과 peak-region 이동 | 단일음 중심 첫 구현; 수치 시험 `tests/harmonicity-freeze.mjs`; 복합음·청감 승인 UNKNOWN |
| `SCL-M05` Freeze · MODULE · IMPLEMENTED | 0…100% 곡선 → 현재 스펙트럼 포착·유지·혼합 | `freeze` 커브, 복소 스펙트럼 크기/위상 진행 상태 | 20ms wet 평활, seek/stop 초기화; 수치 시험 `tests/harmonicity-freeze.mjs`; 청감 승인 UNKNOWN |
| `SCL-C09` Module On/Off · CONTROL · VERIFIED | 시작 시 모두 Off, 상단 버튼 재클릭으로 독립 우회, 커브 보존, 하단 활성 체인 표시 | `enabled` 플래그와 중립 유효 커브 라우팅 | `tests/module-routing.mjs`; 실제 브라우저 초기·토글 확인 |
| `SCL-C10` Reorderable chain · CONTROL/DSP · VERIFIED NUMERICALLY | 다섯 효과를 켠 순서대로 연결하고, 하단 블록을 끌어 처리 순서를 변경하며, 다시 켠 효과는 맨 뒤에 둠 | Shift 뒤에 효과가 있으면 analytic Shift 출력에 두 번째 STFT를 적용; Preview/Render/비교에 동일 order 전달 | `tests/module-routing.mjs`, `tests/chain-order.mjs`, 데스크톱 드래그·WAV 순서 A/B 검증; touch/keyboard 재정렬·청감/장치 underrun 승인 UNKNOWN |
| `SCL-C05` Preview · COMMON · VERIFIED | 현재 곡선을 재생 → 실시간 출력 | 2048/hop512 `SpectralEngine` in AudioWorklet | render와 FFT 크기 차이; 실시간/브라우저 검사 보고서. native callback scheduling 필요 |
| `SCL-C06` WAV export · COMMON · VERIFIED | Download WAV → 48 kHz/24-bit PCM 파일 | 4096/hop1024 Worker render, `wav.js` | full length, PCM clipping, cancel/error; 각 Phase 브라우저 검사. native encoder 필요 |
| `SCL-C07` 비교 관찰 · COMMON · VERIFIED | 스위치 켜고 Update comparison → SOURCE/OUTPUT overview | 원본과 preview engine 샘플의 FFT 분석; `spectrogram-*` | 기본 OFF, stale 수동 갱신, 512열 요약; [비교 보고서](SPECTROGRAM-REPORT.md). 편집기/정밀 WAV 분석기 아님 |

**미구현:** Undo/Redo, preset 저장·불러오기, host automation, Audio Plug-in. 제안/초기 사양에 언급되어도 현재 기능으로 표시하지 않는다. 위 VERIFIED는 기록된 검사 범위에서만 유효하며, 사람 청감 승인·장치 underrun·모든 브라우저/긴 파일 메모리까지 확인했다는 뜻이 아니다.

## Spectral Hub identity pilot

IMPLEMENTED (2026-10-05): Hub v0.10 제목/탭 아이콘과 대표색.
`IDENTITY_PILOT.md` 참고. 로컬 검토 후 사용자 커밋/배포 승인.

## 2026-10-06 — Render 입력 변환 검증 (로컬, 미배포)

WAV는 기존 채널 수, 48 kHz, 24-bit를 유지한다. 비48 kHz 버퍼 입력의 실제 PCM 변환에 alias 제거를 추가했다. 일반 앱 파일 열기는 기존 48 kHz decodeAudioData 경로를 유지한다.


## 2026-10-07 WAV result feedback — PROJECT-SPECIFIC

WAV rendering now reports pre-clamp sample peak and the count of channel samples actually saturated by 24-bit PCM quantization. Clipped results wait for an explicit Save WAV (clipped) action. Non-clipped results keep automatic download and retain a direct Save WAV retry link.

## Keyboard transport availability (2026-10-07)

Spacebar dispatches at most one transport action per physical press. Held-key repeats are consumed, and disabled Play or an absent source blocks dispatch. Input, select, textarea and editable-text targets retain native keydown/keyup behavior. Existing Play/Stop or Play/Pause semantics and DSP are unchanged. While Reset All is open, both Space events are left to the dialog buttons: Cancel and confirmation remain keyboard-operable without toggling background transport. See `tests/transport-keyboard.test.mjs` for event-routing regression checks; these isolate command dispatch from DSP.


## 2026-10-07 — Import before playback in Safari

File import creates the decoding context without awaiting `AudioContext.resume()`. Playback still requests activation through the default context path. This prevents a pending Safari playback permission request from blocking file decoding after the file chooser closes. Existing decoding, channel policy, curves, DSP and export format remain unchanged. Regression: `tests/import-suspended-context.mjs` exercises suspended context, decode failure/retry and playback activation (plus Spectral channel/rate policy). Standalone implementations should likewise keep file decoding independent of output-device activation.


## 2026-10-08 — Cancel pending first playback

Stop, forced Stop, and actual source replacement now advance the playback token even before the AudioWorklet node exists. Previously optional chaining skipped token advancement while setup was pending; the original Play could run after Stop or after a completed source replacement. Source chooser cancellation still preserves state. An explicit later Play works normally. DSP, curves, output rate and format are unchanged.

Verification: actual-handler deferred-initialization test `tests/initial-play-cancel.mjs` failed before the fix and passes for Stop, forced Stop, and file replacement plus explicit retry. Existing transport, keyboard and suspended-context import checks pass. Safari public baseline first click started playback; no exact cold-start latency or audible onset measurement was made. This fix addresses stale playback requests, not engine startup speed.
