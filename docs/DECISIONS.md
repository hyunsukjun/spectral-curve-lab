# 제품 결정 기록

확정된 제품 방향/현재 구현 선택만 적는다. 과거 단계 보고서의 당시 미구현 목록은 현재 상태가 아니다. 수치 검증과 **청감 승인**은 구별한다.

| 날짜 | 결정 · 이유 · 영향 | 근거/상태 |
| --- | --- | --- |
| 2026-10-05 | 하단 Signal Chain의 활성 블록을 드래그하여 실제 처리 순서를 바꾼다. 블록 클릭은 편집 선택만 하며 다른 블록에 놓으면 그 앞, Output에 놓으면 맨 뒤로 이동한다. 기존 DSP 라우팅을 재사용하고 순서 변경 시 Preview·비교·WAV의 이전 결과를 무효화한다. | [상호작용](INTERACTION_SPEC.md), `tests/module-routing.mjs`, 데스크톱 브라우저 WAV A/B; touch/keyboard 조작과 청감 평가는 별도 |
| 2026-09-27 | 초기 제품을 Shift → Stretch → Blur의 단계로 만들고 각 곡선을 독립 보관한다. 기능별 수치와 브라우저 검증을 거쳐 확장한다. | [초기 사양](INITIAL-SPECIFICATION.md), Phase 4–6. 현재 세 기능 IMPLEMENTED/검사 범위 VERIFIED |
| 2026-09-27 | Stretch는 1 kHz 중심의 **주파수 간격** 변형이며 재생 속도/길이를 바꾸지 않는다. 기본 1, 범위 0.5–2, 축·tooltip에서 `×`를 제거한다. 배속 오해를 없애기 위한 UI·DSP 계약. | [Phase 5](PHASE-5-REPORT.md), [Phase 6](PHASE-6-REPORT.md); 청감 최종 매핑 승인 UNKNOWN |
| 2026-09-27 | Blur는 별도 0–100% 곡선으로 시간적 성분 변화만 완만하게 한다. Stretch와 다른 목표이며 주파수 축 low-pass가 아니다. 처리 순서를 Stretch → Blur → Shift로 고정한다. | [Phase 6](PHASE-6-REPORT.md), [spectral-engine.js](../src/spectral-engine.js); 청감 sweet spot UNKNOWN |
| 2026-09-27 | SOURCE/OUTPUT 비교를 Harmonicity/Freeze보다 먼저 제공한다. 관찰 피드백이 필요하되 Canvas 커브를 주 작업 영역으로 유지한다. 기본 OFF, 편집 후 stale/수동 갱신, Preview 결과라고 명시한다. | [비교 보고서](SPECTROGRAM-REPORT.md); Harmonicity/Freeze는 당시 미구현 |
| 2026-09-29 | 자연 종료가 마지막 출력 callback에서 발생하고 늦은 위치 메시지가 UI를 되돌리지 않도록 token/메시지 순서를 보완한다. | [안정성 보고서](STABILITY-20260929.md), `tests/transport.mjs` |
| 2026-09-29 | Audio Curve Lab의 공통 디자인 언어를 Spectral에 적용하되 Cyan `#31B8C6`는 브랜드, 세 효과 색은 의미 색으로 유지한다. DSP·좌표/편집 계약은 바꾸지 않는다. | [디자인 보고서](DESIGN-SYSTEM-V1.md), [디자인 토큰](../CURVE_LAB_DESIGN_SYSTEM.md) |
| 2026-09-29 | 현재 웹 구현을 스탠드얼론 제품 지식의 참조로 문서화한다. 프레임워크 선정·preset 포맷·DSP 포팅은 아직 결정하지 않는다. | 사용자 제공 master setup; [이관 기록](STANDALONE_MIGRATION.md) |
| 2026-10-01 | 백색소음만으로는 배음 이동과 어택 변화를 평가하기 어려워, 앱 자체 생성 Harmonic notes를 기본 예제로 두고 기존 Noise intervals를 Demo 선택지로 유지한다. 실제 녹음·청감 승인으로 오인하지 않도록 둘 다 진단 예제로 표시한다. DSP·파라미터 범위는 유지한다. | [음질 검토](QUALITY-REVIEW-20260929.md), [Reference Sound Set](REFERENCE_SOUND_SET.md); 청감 효과 **NEEDS MORE TESTING** |

| 2026-10-02 | 사용자 지시에 따라 Harmonicity/Freeze를 두 개의 독립 곡선으로 추가한다. 기존 세 효과와 neutral 경로를 유지하며, 단일음 기준음 추정과 spectral-state hold는 첫 구현값이다. 처리 순서는 Stretch → Harmonicity → Blur → Freeze → Shift. | [파라미터](PARAMETER_SPEC.md), [DSP](DSP_BEHAVIOR.md); 수치/브라우저 검증과 청감 승인 분리, sweet spot UNKNOWN |
| 2026-10-03 | Timbre Lab의 모듈 On/Off와 순서 표시를 참고하되, Spectral의 1단계에서는 편집 대상 선택과 활성화를 분리하고 처리 순서는 고정한다. Off일 때 중립 곡선을 전달해 기존 DSP 구조와 저장된 점을 보존한다. | [상호작용](INTERACTION_SPEC.md), [routing](../src/module-routing.js); 순서 변경과 청감 평가는 후속 단계 |
| 2026-10-03 | Timbre UI와의 일관성을 위해 1단계의 하단 개별 On/Off 버튼을 상단 효과 버튼의 선택·재클릭 토글로 통합하고, 하단은 활성 효과만 있는 Input→Output 체인으로 바꾼다. Spectral 편집기는 항상 선택 커브가 필요하므로 Off인 커브도 선택·편집 가능하게 유지한다. | UI 동작만 변경, `enabled`/중립 라우팅과 실제 고정 DSP 순서는 유지. 체인 드래그는 실제 DSP 순서 변경을 갖춘 후속 단계 |
| 2026-10-03 | 사용자의 초기 Off·순차 연결 지시에 따라 시작 선택 커브를 없애고, 네 FFT 효과는 활성화 순서대로 실제 처리한다. Shift는 analytic 합성 후 oscillator 방식이므로 끝에 고정한다. 화면과 Preview/Render/비교가 같은 순서를 쓰며, 음색 보존을 위해 Shift를 다른 알고리즘으로 대체하지 않는다. | [체인·DSP 검토](CHAIN-ORDER-20261003.md), [테스트](../tests/chain-order.mjs). 체인 순서의 음악적 우수성과 실시간 재배치 청감은 UNKNOWN |
| 2026-10-03 | Shift-last 제약은 사용자가 기대한 다섯 효과의 활성화 순서를 충족하지 못했다. Shift 알고리즘 자체는 유지하되 Shift 뒤의 활성 효과를 두 번째 STFT에서 처리한다. Shift-last는 기존 단일 pass를 유지하고, Off/On 재진입은 다섯 효과 모두 맨 뒤로 보낸다. | [체인·DSP 검토](CHAIN-ORDER-20261003.md), [테스트](../tests/chain-order.mjs). 두 pass의 추가 CPU와 청감·장치 underrun은 추가 평가 필요 |

**보류:** Shift soft guard, Stretch pivot/보간, Blur 시간 상수의 최종 청감 승인; 라이브 입력/plug-in, preset/host automation, 비교 화면의 native UI 형태. 새로운 값으로 바꾸기 전 이전 값과 근거·실제 청감 결과를 [PARAMETER_SPEC.md](PARAMETER_SPEC.md)에 남긴다.

청취로 아직 승인하지 않은 실험값과 사용자 피드백은 [청취 판단 기록](LISTENING_DECISIONS.md)에, 실패·수정·미해결 문제의 이유는 [실패·수정·보류 이력](FAILURES_AND_FIXES.md)에 보존한다.

## 2026-10-05 — Hub v0.10 identity pilot

PROJECT-SPECIFIC: 기존 Cyan #31B8C6과 공통 파형 마크를 Orange #FF7047과
Spectral 에너지 아이콘으로 교체. DSP/효과 순서/파라미터 의미 색 유지.
로컬 검토 완료 후 2026-10-05 사용자 요청으로 커밋/배포 승인. `IDENTITY_PILOT.md` 참고.

| 2026-10-05 | 커브와 탐색 제스처의 충돌을 줄이기 위해 원본 채널 파형을 OUTPUT TIME으로 분리하고 슬라이더·커브창 double-click seek를 대체한다. 출력 시간축과 원본 시간축 길이는 같다. 첫 재생 전 지정 위치를 초기화된 엔진에 전달한다. | [검증](OUTPUT-TIME-20261005.md); 기존 STFT/seek 상태·token 유지, 렌더 파형과 구별 |

| 2026-10-05 | 사용자 요청에 따라 기본 소스를 기존 Noise intervals로 고정하고 Demo 선택 메뉴를 제거한다. Open Audio와 백색소음 생성 알고리즘은 유지한다. 이전 Harmonic notes 기본값 결정을 대체한다. | 초기화·재생·사용자 파일 로딩 브라우저 확인 |

## 2026-10-06 — Render 입력 변환 검증 (로컬, 미배포)

비48 kHz Render 입력은 브라우저 AudioBufferSource 변환 대신 96-tap 대역 제한 변환을 사용한다. 48 kHz는 bypass한다. 프레임 수는 ceil에서 round(sourceFrames * 48000 / sourceRate)로 통일해 가장 가까운 출력 프레임으로 정한다. 기존 STFT와 worker는 유지한다.


## 2026-10-07 WAV result feedback — PROJECT-SPECIFIC

Separate detection from sound modification. Measured clipping is actionable before saving, but automatic normalization/limiting is deferred to reference listening. Safe results keep the prior download behavior; clipped results require a direct save click. The persistent link also provides browser download retry without rerendering. Actual OS saving is separate from render-ready status.

## Give editing and dialogs priority over global transport (2026-10-07)

COMMON CANDIDATE: transport shortcuts must respect the same availability as Play and must not consume form editing or modal button activation. Guard the current handlers without changing DSP or curve data. The old modal handling could start background playback (Audio/Space handler path; directly reproduced in Space) or suppress Cancel keyup (directly reproduced in Spectral). Both phases now defer to the open dialog.


## 2026-10-07 — Import before playback in Safari

File import creates the decoding context without awaiting `AudioContext.resume()`. Playback still requests activation through the default context path. This prevents a pending Safari playback permission request from blocking file decoding after the file chooser closes. Existing decoding, channel policy, curves, DSP and export format remain unchanged. Regression: `tests/import-suspended-context.mjs` exercises suspended context, decode failure/retry and playback activation (plus Spectral channel/rate policy). Standalone implementations should likewise keep file decoding independent of output-device activation.


## 2026-10-08 — Cancel pending first playback

Stop, forced Stop, and actual source replacement now advance the playback token even before the AudioWorklet node exists. Previously optional chaining skipped token advancement while setup was pending; the original Play could run after Stop or after a completed source replacement. Source chooser cancellation still preserves state. An explicit later Play works normally. DSP, curves, output rate and format are unchanged.

Verification: actual-handler deferred-initialization test `tests/initial-play-cancel.mjs` failed before the fix and passes for Stop, forced Stop, and file replacement plus explicit retry. Existing transport, keyboard and suspended-context import checks pass. Safari public baseline first click started playback; no exact cold-start latency or audible onset measurement was made. This fix addresses stale playback requests, not engine startup speed.


## AIFF input compatibility (2026-10-11)

See [AIFF import contract](AIFF_IMPORT.md): local PCM AIFF 16/24-bit mono/stereo
normalization into PCM WAV before the established decoder. Existing DSP,
resampling and Lab-specific channel policies are preserved. Browser and memory
verification limits are recorded there.


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


## 2026-10-14 — 편집 UI 간소화

사용자 요청으로 중복된 Select 도구와 미선택 안내, Signal Chain 제목/설명 줄 제거. Pen/Eraser 및 체인 조작은 유지. DSP/효과 순서 규칙 변경 없음.


## 2026-10-14 — 웹 비교 스펙트로그램 제거

SOURCE / OUTPUT Spectrogram 패널·토글·Update 및 전용 스타일, app의 view import/초기화/취소/무효화 연결을 제거했다. 기존 spectrogram 분석 모듈과 연구용 테스트·보고서는 참고 자산으로 보존하며 웹 앱에서 불러오지 않는다. 실제 spectral DSP의 FFT/STFT, Preview, WAV, 커브와 재생 기능은 유지. Standalone 재도입 여부는 추후 검토하며 현시점 구현 계획으로 확정하지 않는다. 위 문서의 과거 스펙트로그램 구현 설명은 현재 웹 제공 기능을 의미하지 않는다.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-14 — Chain keyboard access
Signal Chain block에 포커스한 상태에서 Alt(Option)+좌/우 방향키로 한 칸 이동한다. 양 끝에서는 유지하며 재배치 후 같은 블록에 포커스를 복원한다. 기존 드래그와 동일한 설정 전달/출력 갱신 경로를 사용한다. DSP·커브·효과 On/Off 정책은 변경하지 않는다.


## 2026-10-14 — Reset modal focus
Reset 확인창의 Tab/Shift+Tab은 Cancel과 Reset All 사이에서 순환한다. Escape 취소와 닫은 뒤 Reset All 포커스 복귀는 유지한다. 확인창 뒤의 버튼을 키보드로 우발 작동하지 않도록 보완하며 리셋 대상과 음향 처리는 변경하지 않는다.


## Restrained typography — 2026-10-15 local review
COMMON CANDIDATE, Audio-approved visual direction. Shared typography.css gives ordinary text controls/readout values400 weight, section labels500,13px/500 transport time,10px/600 CLIP. Readout labels use natural case and zero tracking. Button dimensions and Lab-specific active/enabled colors remain; decorative highlights removed, active lower bevel1px. Duration14/600 remains intentional. Canvas excessive600/650/750 weights reduced; point tooltip13→12px where applicable; waveform headings natural case. No normalized coordinates, DSP, parameter meanings or transport logic changed.
Commit/deployment withheld for user preview. Native confirmation keyboard and comparative listening remain deferred.

### 2026-10-15 — Family typography release verification
- Approved typography refinement verified in Brave actual 125% (1189×609 CSS px, DPR 2.5) and 150% (990×508 CSS px, DPR 3). No document horizontal overflow or clipped button labels; transport remains reachable by vertical scrolling.
- Existing narrow-screen and representative parameter/playback checks retained. Granular additionally imported recovery-8s-test.wav via the native file picker: playback/meter activity, pause, resume from position, and rewind verified.
- Scope is presentation only. Native confirmation keyboard behavior and comparative listening remain deferred; this does not claim new DSP/export or cross-device certification.

## 2026-10-15 — Spectral source overview label refinement (local review)
Canvas heading, hint and ticks use regular11px. Replace uppercase instruction with Source guide · Click / drag to seek; measured available width selects full hint, Source guide, or no inline hint. Persistent accessible seek instruction remains. Timeline and seek mappings unchanged.
Interface-only; no audio processing, routing, timing, parameters or normalized curves changed. Syntax/diff checks passed; browser visual review and horizontal-overflow checks passed across observed wide/narrow viewports. Space2/4/8ch displays checked; Spectral keyboard seek1second and rewind checked. No playback/listening or new WAV verification claimed. No commit or deployment; user preview pending. Evidence: shared QA evidence/labels-review-audit.json and labels screenshots.

Release approval: user approved the labels preview for commit and deployment. Final diff remains presentation-only; syntax/diff checks passed. Prior browser visual/seek evidence retained; no DSP or listening claim.

## 2026-10-15 — Source-tone waveform (local review)

Audio/Timbre/Granular/Space와 동일한 원본 주파수 성격 색상(blue → teal → gold → peach)과 signed min/max 최대 16,000 bucket 표시를 적용했다. 스테레오는 채널 사이 상대 크기를 유지하는 공통 표시 peak를 사용한다. 색은 원본 spectral centroid의 시각적 안내이며 처리 결과·음질·클립 표시가 아니다. 짧은 이벤트는 샘플링에서 빠질 수 있다.

Worker는 채널당 최대 1,024개의 1,024-sample window만 복사·분석한다(2채널 최대 8 MiB). 파일 교체 시 이전 작업을 종료하며 buffer identity로 늦은 결과를 차단한다. 실패 시 단색 파형으로 유지한다. 정적 canvas base는 재사용하고 커서만 갱신한다. 파일 교체/resize/색 결과 수신 시에만 base를 다시 그린다. 표시용 정규화는 실제 샘플을 변경하지 않는다.

기존 Output Time 좌표, 클릭/드래그 seek, 키보드, 선택/체인, 파라미터 및 DSP는 유지했다. source guide와 범례는 좁은 폭에서 공간을 나눠 사용한다.

검증: source-color FFT/peak/input-immutability tests PASS; transport-keyboard 5 checks PASS; JavaScript syntax/diff PASS. 실제 브라우저에서 기본 noise 및 stereo sweep 입력, ArrowRight 1초 이동 2회, Blur 선택, Play/Pause와 진행·미터 갱신 확인. 작은 화면과 Brave 실제 125%/150% 확대에서 시인성 확인. 콘솔 오류 없음. 창 높이가 부족하면 기존 세로 스크롤을 사용한다. DSP 회귀 전체, 청감, Windows, 기본 확인창 키보드 신규 검증은 주장하지 않는다.

커밋·배포 전 사용자 화면 검토 단계. Evidence: shared QA evidence/spectral-source-tone-review.png, spectral-source-tone-150.png.

Release approval (2026-10-15): user approved source-tone waveform for commit and deployment. Prior browser/zoom evidence retained; DSP and Space clipping investigation remain separate.


## 10 ms playback boundary candidate — 2026-10-25

The current local candidate supersedes earlier automatic transport-boundary durations with the [10 ms playback/WAV contract](PLAYBACK_BOUNDARY.md). Source/effect envelopes are separate. See that contract for pause-state retention, existing tail-length limits and verification status. Uncommitted; listening acceptance pending.


## 2026-10-26 — Common graphite presentation revision

User-authorized six-Lab application and commit of the researched dark interface direction. Use a deeper neutral continuous shell, shallow available controls, role-based secondary information and slightly quieter minor grid lines. Preserve all layout/type metrics, module state colors, musical data and audio behavior. Store the portable contract and manifest for future Standalone work. This narrowly revises the visual baseline; it does not reopen DSP or certify listening/native behavior. See [INTERFACE_GRAPHITE_CONTRACT.md](INTERFACE_GRAPHITE_CONTRACT.md).

## Readout context family release — 2026-10-27

User approved the Audio pilot and sequential six-Lab rollout/commit/verification/deployment. Apply shared semantics selectively: Compact Shift/Stretch/Blur/Harmonicity/Freeze captions identify source-playhead curve values, including Off effects; not rendered measurements. Preserve per-Lab behavior instead of forcing Audio calculations or adding nonexistent selection features. See `READOUT_CONTEXT_CONTRACT.md` for basis, source-range rules, verification boundary and portability.

## Shift group / Option erase — 2026-10-27

2026-10-27 — User approved extending the released Audio gesture contract to the other five Labs, preserving each Lab mapping and ordinary editor constraints, with web review before commit. The user subsequently reported no major issues in individual tests and explicitly authorized the five-Lab UI commit/deployment. Reuse only the proven normalized group transaction; do not merge differing coordinate decoders or engine paths. No DSP change. See [gesture contract](CURVE_GESTURE_CONTRACT.md).


## Readout and shortcut scope — 2026-10-28

User approved continuation after the Audio visual pilot and its release. After the five-Lab local review, the user explicitly authorized commit and deployment on 2026-10-28. Reuse the existing readout/disclosure components and copy the now-shared presentation helper; no dependency/infrastructure refactor. Preserve all app/source/DSP/gesture/transport/channel/IR logic. Guide content follows actual supported commands, with no new key policy, curve Undo or numeric editing.

Scoped UI evidence: 30 focused command checks, 15 same-size before/after pairs, 25 candidate layouts and 15 help-boundary states passed. Actual native zoom, new Granular file playback, listening and native acceptance were not repeated. Publication success is verified separately; approval does not certify those untested areas.

## Toolbar placement and Engine scope — 2026-10-28

User requested consistent Timbre Shortcuts placement and higher Oscillator clear/reset utilities, then chose: fixed processor names in information; useful dynamic status retained. Move the fixed Spectral STFT name into Files information. Keep seven current-value fields and the existing source-playhead basis, units and Off semantics. Preserve musical behavior and use web review before any new publication.

The user confirmed both position changes and authorized commit/deployment on 2026-10-28, including the already-approved processor information scope. UI evidence does not certify new listening, native confirmation keyboard or Windows behavior.


## 2026-10-29 — Shared musical default source

User approved the72BPM weak-room MP3 as the shared default/example asset and authorized all six commits/deployments. Preserve each Lab's source handling and keep an example recording distinct from an IR. See [default source](DEFAULT_SOURCE.md).

## Read-only admission before source replacement (2026-10-29)

USER-APPROVED SCOPE, IMPLEMENTED; release authorized2026-10-29. Extend the already shared audio-import module instead of creating another decoder or DSP sanitizer. Scan all decoded channels before adoption; reject nonfinite data rather than silently replacing samples. Preserve a previous valid input on failure. Bounded copy reads avoid mutating view readback in the observed Brave environment. Normal hot/clipped/DC/silent audio keeps its existing processing meaning. Verification/release/listening are separate. See [input contract](INPUT_VALIDATION.md).


## Output sample-peak guard — 2026-10-30 (local review)

Supersedes historical no-output-protection statements only. Linked0.98 Preview sample ceiling,instant attack/60ms recovery,no new latency; below-ceiling unity history stays unchanged. Nonfinite processed output stops/reports with explicit retry recovery. Spectral WAV uses one global down-only output gain; clip status reports its applied attenuation. Raw FFT/phase/mapping/channel/duration are unchanged. See [policy,evidence and unverified listening limits](OUTPUT_PEAK_PROTECTION_2026-10-30.md). Not committed/deployed; no Native implementation.


## Output protection release authorization — 2026-10-30

The user approved verification, commit and public deployment of the reviewed output-protection candidate. Source processing, parameter mappings, spatial/channel rules and time axes remain unchanged. Protection may alter dynamics when engaged; this is not listening, physical-device or full-product acceptance. Publication proof is tracked separately in Interface QA `space-spectral-output-release-20261030`.
