# 사용자 상호작용 계약

2026-10-02 구현 기준. 이벤트 이름이나 HTML ID가 아니라 사용자가 얻는 결과를 정의한다. 현재 웹 연결은 [app.js](../src/app.js), 데이터 연산은 [curve-editor.js](../src/curve-editor.js)다.

| 행동 | 제품 의미와 경계 | 현재 웹 구현·검증 |
| --- | --- | --- |
| 효과 선택·On/Off | 시작 시 다섯 버튼 모두 Off, 선택 커브 없음. 다른 켜진 효과를 누르면 그 커브를 선택한다. 선택된 버튼을 다시 누르면 Off, 꺼진 버튼을 누르면 On과 동시에 선택된다. Off인 커브도 편집할 수 있다. | 버튼 색/하단선은 활성·편집 대상을 구별하며 `aria-pressed`는 On/Off를 나타낸다. 선택된 Off는 범례/readout에 표시한다. 선택 전 Clear Current와 캔버스 점 편집은 비활성. |
| Signal Chain | Input과 Output 사이에 **켜진 효과만** 실제 처리 순서로 표시한다. 블록 클릭은 커브 선택만 한다. 블록을 다른 블록에 놓으면 그 앞에 삽입하고, Output에 놓으면 맨 뒤로 보낸다. Off는 커브 점을 지우지 않고 Preview/Render/비교 화면에 중립값을 전달하며, 다시 On하면 보관한 점을 사용한다. | 다섯 효과 모두 켠 순서대로 추가한다. 드래그로 순서를 바꾸면 Preview와 비교 화면을 갱신 대상으로 표시하고 기존 WAV를 무효화한다. Off 후 다시 On하면 체인 맨 뒤에 재삽입한다. Shift가 중간에 있으면 뒤쪽 효과는 두 번째 STFT 단계에서 처리한다. HTML drag-and-drop은 데스크톱 조작으로 검증했으며 touch/keyboard 재정렬은 아직 미검증이다. |
| Pen | 기본 도구. 기존 점을 잡아 이동하거나 빈 위치에 중간 점을 추가한다. 드래그는 해당 시간의 궤적을 만든다. | pointer capture; `addNode`/`moveNode`; 정규화 좌표. 기존 점과 충분히 가까우면 새 점을 만들지 않음 |
| Eraser | 기존 **중간 점**을 삭제한다. 빈 곳은 아무것도 만들거나 변경하지 않는다. | 10 CSS px 반경 hit-test; `eraseNode`가 양 끝점 거부. Mac Option-click/그 외 Ctrl-click은 임시 삭제 동작 |
| 끝점과 순서 | 첫/마지막 점은 삭제 불가이며 시간 좌표 `x=0/1` 유지. 값 `y`는 수정 가능. 중간 점은 이웃 사이에서만 이동. | `moveNode`/`eraseNode`; [커브 테스트](../tests/neutral.mjs) |
| Clear Current | 활성 곡선 하나를 중립 두 점으로 복원하고 재생을 정지한다. | `defaultCurves[activeCurve]`; 다른 곡선 유지 |
| Reset All | 확인 후 다섯 곡선을 중립 두 점으로 복원하고 재생 정지. On/Off 상태는 유지한다. 취소/Escape/대화상자 바깥 클릭은 변경하지 않는다. | modal dialog; Undo 없음 |
| Play/Pause/Stop | Play는 현재 위치에서 재생, 재생 중 같은 버튼은 Pause. Pause/재개는 위치와 DSP 상태 보존. Stop은 0초로 돌아가고 상태를 초기화한다. 자연 종료도 0초로 돌아간다. | AudioWorklet messages + token; `Spacebar`는 버튼과 같은 Play/Pause, 텍스트 입력·대화상자 중에는 작동하지 않음. [transport 검사](STABILITY-20260929.md) |
| OUTPUT TIME | 원본 채널 파형을 클릭·드래그해 출력 시간축에서 탐색한다. 재생 중에는 이어서 재생하고 정지·일시정지 중에는 위치만 설정한다. 방향키 1초, Shift+방향키 0.1초, Home/End 처음/끝. | 기존 worklet seek와 token을 재사용한다. 첫 재생 전에 지정한 위치도 엔진 초기화 후 전달한다. 커브·분석 결과는 바꾸지 않는다. [검증](OUTPUT-TIME-20261005.md) |
| 출력 레벨 | L/R 각각 RMS 바·peak 바/hold·dB 표시, 0.999 이상 CLIP 래치. CLIP 버튼은 표시를 초기화한다. | 실제 Preview 출력 뒤의 분석 전용 분기; 모노 원본도 현재 Worklet은 두 채널에 같은 신호 출력. WAV 렌더 레벨을 뜻하지 않음 |
| 커브창과 탐색 분리 | 커브창의 double-click seek와 하단 Position 슬라이더는 제거한다. 커브 점 편집은 기존 방식이며 탐색창 조작은 점을 바꾸지 않는다. | OUTPUT TIME의 role=slider와 현재 초/전체 길이 접근성 값을 제공한다. hard seek의 기존 준비 무음/click 가능성은 별도 개선 대상 |
| 파일 열기 | 새 파일을 읽으면 waveform/길이와 재생 위치가 바뀐다. 현재 다섯 커브는 유지된다. | file chooser, `decodeAudioData`; 선택창 검증 기록과 제한은 [디자인 회귀](DESIGN-SYSTEM-V1.md) |
| 기본 소스 | 시작 시 8초 Noise intervals를 불러온다. Demo 선택 메뉴는 없으며 Open Audio로 사용자 파일을 불러온다. | 기존 백색소음 생성 함수를 그대로 사용한다. 새로고침하면 기본 소스로 돌아간다. |
| Download WAV | 현재 곡선을 전체 파일에 렌더하여 다운로드한다. 진행 중 다시 누르면 취소한다. 편집 시 이전 URL은 폐기되고 새 export가 필요하다. | Worker/Blob/object URL; PCM24, 48 kHz |

시간축 데이터는 Canvas 크기, browser zoom, devicePixelRatio와 독립이다. Canvas는 왼쪽 파라미터 눈금 영역을 제외한 plot 폭을 `[0,1]` 시간으로 변환하고, 위쪽을 `y=1`, 아래쪽을 `y=0`으로 본다. native mouse/trackpad/touch에서도 이 의미를 유지하되 10px hit-test 같은 웹 구현 치수는 기기별 조절 가능하다. 현재 코드는 `pointercancel`에서 drag 상태를 지우지만, 창 focus 상실(`window blur`)에서는 cursor만 갱신한다. 따라서 focus 상실 시 drag 종료 보장은 **UNKNOWN**이다. 실제 touch 제스처·접근성 전 범위도 **UNKNOWN**이다. 커브의 시간 해상도와 급격한 제스처의 오디오 반영은 [시간 동작 기록](CURVE_TEMPORAL_BEHAVIOR.md)을 따른다.


## 2026-10-07 WAV result feedback — PROJECT-SPECIFIC

After render, a live status message reports the WAV result, independently of the Preview CLIP meter. If clipping occurred, automatic download is skipped and Save WAV (clipped) allows keeping the unaltered result deliberately. Editing curves, toggling/reordering effects, replacing the file or starting another render invalidates both saved-result notice and link. The warning recommends reducing source level externally or adjusting effects; no new gain control is implied.

## Spacebar routing (2026-10-07)

Spacebar dispatches at most one transport action per physical press. Held-key repeats are consumed, and disabled Play or an absent source blocks dispatch. Input, select, textarea and editable-text targets retain native keydown/keyup behavior. Existing Play/Stop or Play/Pause semantics and DSP are unchanged. While Reset All is open, both Space events are left to the dialog buttons: Cancel and confirmation remain keyboard-operable without toggling background transport.


## 2026-10-07 — Import before playback in Safari

File import creates the decoding context without awaiting `AudioContext.resume()`. Playback still requests activation through the default context path. This prevents a pending Safari playback permission request from blocking file decoding after the file chooser closes. Existing decoding, channel policy, curves, DSP and export format remain unchanged. Regression: `tests/import-suspended-context.mjs` exercises suspended context, decode failure/retry and playback activation (plus Spectral channel/rate policy). Standalone implementations should likewise keep file decoding independent of output-device activation.


## 2026-10-08 — Cancel pending first playback

Stop, forced Stop, and actual source replacement now advance the playback token even before the AudioWorklet node exists. Previously optional chaining skipped token advancement while setup was pending; the original Play could run after Stop or after a completed source replacement. Source chooser cancellation still preserves state. An explicit later Play works normally. DSP, curves, output rate and format are unchanged.

Verification: actual-handler deferred-initialization test `tests/initial-play-cancel.mjs` failed before the fix and passes for Stop, forced Stop, and file replacement plus explicit retry. Existing transport, keyboard and suspended-context import checks pass. Safari public baseline first click started playback; no exact cold-start latency or audible onset measurement was made. This fix addresses stale playback requests, not engine startup speed.


## Waveform above curves (2026-10-13)

The existing output-time/source-guide waveform now appears above the curve editing
canvas, following the shared Curve Lab reading order. Its source-guide meaning,
click/drag/keyboard seek, parameter IDs, normalized curves and DSP remain unchanged.
This is a layout change only; Audio's output deletion/fades are not added here.
Spectral keeps its transport dock; waveform space is no longer reserved inside that dock.


## Common bottom transport — 2026-10-13
COMMON CANDIDATE, implemented locally. Audio reference adopted: Return to start,
Play, Pause, output-position slider, time, continuous green/yellow/red stereo meter,
CLIP. Neutral 16px icons are centered inside 38x32px buttons; 34px slider hit area.
Return to start seeks to zero while preserving playing/paused state. Pause retains
position; Play resumes; Space toggles Play/Pause outside editable controls.
Internal reset stops for import/export/settings remain distinct and unchanged.
No DSP algorithm or output format changes. Resume uses this Lab's existing engine
initialization; continuous-sample-identical resumption is not promised.
The existing waveform guides remain in their existing locations.
OUT and numeric meter values are visually removed (values remain accessible).
Meter color fields are clipped at the level, not stretched; retain analysis,
ballistics, peak hold and CLIP semantics. Shared CSS/module are vendored locally,
with per-Lab adapters and no external runtime dependency.
Oscillator retains its existing source-duration seek cap for convolution tails.
Verification covers syntax, keyboard contracts and browser layout; file-based
Labs also exercised silent-WAV pause/resume. Audible listening, Safari/Windows,
long-file performance and Oscillator mode-specific listening remain separate QA.

## Transport alignment correction — 2026-10-13
Removed the legacy dock-specific grid column overrides. The common transport
stylesheet now owns all column layouts: four columns above 1100px, meter on
a second row at 601–1100px, and a full-width slider row at 600px or less.
Dock positioning remains unchanged. No audio or playback logic changes.


## 2026-10-14 — 편집 도구·안내 간소화

Select 전용 모드는 제거. Pen으로 점 추가·이동, Eraser 및 Command/Ctrl 보조 삭제와 끝점 보호는 유지한다. 빈 곳 클릭의 점 추가 차단 기능은 더 이상 제공하지 않는다. 커브 double-click seek의 첫 클릭이 점을 추가할 수 있는 기존 특성은 유지하며, 점을 바꾸지 않는 탐색에는 파형/하단 재생바를 사용한다. 미선택 효과 안내와 Signal Chain 제목/조작 설명 줄을 제거하되 체인 블록 및 순서 변경, 접근성 설명은 유지한다. DSP 변경 없음.

검증: JS syntax 및 기존 neutral 72조건/끝점·삭제 회귀, 키보드 5항목 통과. 실제 로컬 브라우저에서 Select/두 안내 줄 제거, 효과 선택 후 Pen 점 추가(2→3), 기존 점 드래그(3 유지), Eraser 삭제(3→2), 체인 표시 확인. 콘솔 오류 없음. 이번 확인은 음질 청취 또는 전체 브라우저 검증이 아니다. 2026-10-14 사용자 승인으로 커밋·배포 진행. 공개 반영 증거는 제품군 검증 기록에 별도 저장.


## 2026-10-14 — 웹 비교 스펙트로그램 제거

SOURCE / OUTPUT Spectrogram 패널·토글·Update 및 전용 스타일, app의 view import/초기화/취소/무효화 연결을 제거했다. 기존 spectrogram 분석 모듈과 연구용 테스트·보고서는 참고 자산으로 보존하며 웹 앱에서 불러오지 않는다. 실제 spectral DSP의 FFT/STFT, Preview, WAV, 커브와 재생 기능은 유지. Standalone 재도입 여부는 추후 검토하며 현시점 구현 계획으로 확정하지 않는다. 위 문서의 과거 스펙트로그램 구현 설명은 현재 웹 제공 기능을 의미하지 않는다.

검증: JS syntax, pending Play 취소/복귀 3조건 및 키보드 회귀 5항목 통과. 실제 로컬 브라우저 초기화·재생 시간 진행·Pause·Download/Save 확인. 생성 WAV는 stereo/48kHz/24-bit PCM/384000frames(8초). 콘솔 오류 없음. 음향 코어 변경 없으며 청취 승인으로 해석하지 않는다. 2026-10-14 사용자 승인으로 커밋·배포 진행. 공개 반영 증거는 제품군 검증 기록에 저장.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: Source duration and channel count · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.

Family verification: all six information panels passed desktop/narrow bounds and Space/Escape/outside-click checks; shared keyboard regression 27/27 passed. Existing dynamic errors and audio handlers unchanged. User approved commit and publication on 2026-10-14. Release evidence in family FILE_HELP_2026-10-14.md. Earlier Audio-only pilot status is superseded.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Chain keyboard access
Signal Chain block에 포커스한 상태에서 Alt(Option)+좌/우 방향키로 한 칸 이동한다. 양 끝에서는 유지하며 재배치 후 같은 블록에 포커스를 복원한다. 기존 드래그와 동일한 설정 전달/출력 갱신 경로를 사용한다. DSP·커브·효과 On/Off 정책은 변경하지 않는다.


## 2026-10-14 — Reset modal focus
Reset 확인창의 Tab/Shift+Tab은 Cancel과 Reset All 사이에서 순환한다. Escape 취소와 닫은 뒤 Reset All 포커스 복귀는 유지한다. 확인창 뒤의 버튼을 키보드로 우발 작동하지 않도록 보완하며 리셋 대상과 음향 처리는 변경하지 않는다.

## Information-density pilot — local review, 2026-10-15

Selected parameter name/value visible; statistics and full overview in disclosure. Existing curve targets at mapped source playback position; Signal Chain and Off states retained. All original readout IDs and update sources preserved. Details summary Space does not start transport. COMMON CANDIDATE for standalone; not committed/deployed.

## Readout disclosure rollback — 2026-10-15
User requested removal of the newly introduced Details disclosures across the family. Original always-visible readout panels restored; Oscillator retains its pre-existing Synthesis detail panel and original contents. Value computation and audio behavior unchanged. Do not add disclosure or restructure information during color/minor-UI work. Audio also removes the border above EDIT AUDIO.

## Export feedback visibility
Idle WAV ready/not ready/needs export badges are hidden. The Download control retains its normal state. Progress, cancellation, limits and failure feedback remain visible; status values are not audio-engine inputs.

Expanded-editor layout (2026-10-15): viewport/control resizing changes canvas display dimensions only. Existing canvas sizing observers update backing stores and pointer coordinates; Oscillator additionally observes its main canvas. Curve data and transport state are retained. If controls plus minimum canvas exceed viewport height, use page scrolling rather than covering controls or compressing the editor.

## Chain insertion gaps — 2026-10-18
Drag effects into the gap after Input, between effects, or before Output. Only connector gaps accept drops; Input, Output and effect blocks do not. A vertical insertion line identifies the destination. Alt+Left/Right ordering, parameter curves and effect values are preserved.

The original 20px target with negative margins left uncovered flex-gap strips. The corrected contiguous 28px target fills the entire gap and row height. User verified Timbre end insertion and insertion-line visibility, then confirmed Spectral gap-only ordering and terminal non-drop behavior in the actual browser. Automated actual-renderer tests pass for first/middle/last/self insertion, order dispatch and absence of terminal/block drop handlers. Existing transport keyboard tests pass. DSP unchanged.


## 10 ms playback boundary candidate — 2026-10-25

The current local candidate supersedes earlier automatic transport-boundary durations with the [10 ms playback/WAV contract](PLAYBACK_BOUNDARY.md). Source/effect envelopes are separate. See that contract for pause-state retention, existing tail-length limits and verification status. Uncommitted; listening acceptance pending.

## Readout context family release — 2026-10-27

Compact Shift/Stretch/Blur/Harmonicity/Freeze captions identify source-playhead curve values, including Off effects; not rendered measurements. No new gesture, seeking, point selection, transport command or audio mutation is introduced by displaying these values. See `READOUT_CONTEXT_CONTRACT.md` for basis, source-range rules, verification boundary and portability.

## Shift group / Option erase — 2026-10-27

Current gesture contract supersedes earlier Mac Command erase statements only. Shift captures the clicked point and ordered suffix in the active curve, fixes all X and applies one normalized Y delta with common bounds. Option-click temporarily erases on Mac, Ctrl-click on PC. Esc/cancellation restores the pending group. Existing normal editing and source/transport semantics remain. See [gesture contract](CURVE_GESTURE_CONTRACT.md).


## Contextual shortcut guide — 2026-10-28

APPROVED WEB UI. The native Shortcuts disclosure reuses file-information behavior and Graphite roles. Click/Enter/Space opens it without changing transport. Escape closes it before background gesture cancellation and returns summary focus; outside press, Tab leaving, outer scroll/resize dismiss; internal scrolling stays usable. Shortcuts follows the editing tools; Space/Granular retain the channel selector immediately before Pen/Eraser. No assignment, point/mapping, select/Space routing, chain keyboard logic or Preview/Render behavior changed.

## Failed input retains the valid source (2026-10-29)

Supersedes earlier failed-decode behavior that cleared a source. File attempts still stop playback; rejected candidates do not reset source edits/window/curves or replace waveform/IR/analysis. Show the error and prior-source availability; do not autoplay. Completed old WAV availability follows unchanged source/settings; invalidate it on successful replacement. See [input contract](INPUT_VALIDATION.md).
