# Curve Lab Design System v1.0 — Spectral

**상태: 적용됨.** Audio Curve Lab은 공통 시각 언어의 참고 프로젝트이며, Spectral의 기능·색 의미는 이 프로젝트의 코드가 기준이다. 적용 과정과 화면/회귀 증거는 [기존 디자인 기록](docs/DESIGN-SYSTEM-V1.md)에 있다. 이 문서는 향후 native UI에서도 유지할 **토큰의 의미**를 정의한다. 웹의 CSS 픽셀과 class 자체는 제품 데이터가 아니다.

| 의미 | 현재 토큰·값 | 사용 |
| --- | --- | --- |
| 브랜드 | `--cl-accent: #FF7047` | 좌상단 아이콘, 제목의 Curve Lab, 작은 강조 |
| 배경 | `--cl-bg: #07111c`, `--cl-bg-deep: #050b12` | 공통 deep navy 작업 환경 |
| 표면 | `--cl-surface: #0d1b29`, `--cl-surface-raised: #122438` | 패널과 컨트롤 |
| 글자 | `--cl-text: #e8f0f6`, secondary `#aabccc`, muted `#71889b` | 정보 계층 |
| 경계·초점 | border `#203a52`, strong `#345672`, focus `#ffb9a5` | 분리와 키보드 포커스 |
| 의미 색 | Shift `#6DE0C0`, Stretch `#EB6F75`, Blur `#DAB877`, Harmonicity `#B595EF`, Freeze `#79C9F0` | 커브·점·범례·활성 버튼·tooltip |
| 형태 | control height 38px, toolbar height 54px; radius 4/6/8px; spacing 4/8/12/16/24/32px | 공통 밀도와 리듬 |

브랜드색으로 전체 화면이나 다섯 파라미터를 통일하지 않는다. Header·Transport·Toolbar·얇은 상태 strip 다음에 어두운 Canvas를 가장 큰 작업 영역으로 둔다. Canvas의 major/minor grid, muted blue-gray waveform, 읽기 쉬운 scale/playhead를 유지한다. 시스템 글꼴, hover/disabled/focus-visible, 정적인 deep navy 배경, `prefers-reduced-motion`을 지원한다. 장식용 애니메이션 없이도 기능은 완전하다.

Timbre Curve Lab에서 참고한 효과 UI 규칙: 시작 시 모든 효과는 Off이고 선택 커브가 없다. 상단 버튼의 의미 색은 On 상태, 하단선은 현재 편집 커브를 뜻한다. Off는 차분한 중립색으로 표시한다. 캔버스 아래 Input→Output 체인에는 On 효과만 실제 처리 순서대로 나타난다. 블록 클릭은 편집 선택, 블록 드래그는 처리 순서 변경이며 Output에 놓으면 마지막으로 이동한다. 좁은 화면에서 체인은 가로로 스크롤한다. 브랜드 Orange은 이 의미 색을 대체하지 않는다.

노트북 화면에서는 OUTPUT TIME 탐색창과 하단 재생 바를 함께 창 아래에 고정하고, 본문 끝에 재생 바 높이 이상의 스크롤 여백을 둔다. Canvas의 표시 높이는 창 높이와 SOURCE/OUTPUT 비교 패널의 열림 상태에 따라 줄이되 최소 240px를 유지한다. 부족한 세로 공간은 보조 영역의 세로 스크롤로 제공하며, 체인과 비교 그래프는 페이지 전체를 가로로 넘기지 않는다. Canvas의 내부 해상도와 포인터 좌표는 JavaScript가 실제 표시 크기를 측정해 맞춘다. 이 수치는 현재 웹 레이아웃의 선택이며 native 구현에 고정할 값은 아니다.

현재 값의 구현 근거는 `src/styles.css`의 `:root`와 반응형 규칙, `src/app.js`의 Canvas paint, `index.html`의 배치다. 향후 native 구현은 역할과 계층을 옮기되 픽셀을 기계적으로 고정하지 않는다. 색/크기 변경은 곡선과 눈금의 대비 및 좁은 화면에서의 사용성을 먼저 검사한다.

## Hub v0.10 시범 적용 — 2026-10-05

기존 Cyan #31B8C6에서 Hub 기준 Orange #FF7047로 변경한다. 제목 아이콘과
탭 아이콘은 Hub v0.10 Spectral symbol/micro 원본이다.
`--cl-accent`는 공통 `--curve-lab-spectral`을 참조한다.
Hover #FF9475, focus #FFB9A5는 웹용 파생색이다. 다운로드 버튼은 어두운
브랜드 파생 배경을 쓴다. 파라미터 색과 스펙트로그램 색상표는 유지한다.
원본 출처·해시는 `assets/identity/palette.json`, 적용 범위는
`docs/IDENTITY_PILOT.md`에 기록한다. 커밋 전 로컬 적용이다.

OUTPUT TIME은 원본 채널의 탐색용 파형이다. 입력 모노는 한 줄, 스테레오는 L/R 두 줄이며 실제 출력 채널 수를 뜻하지 않는다. 커브와 같은 좌우 plot 여백을 사용한다. 현재 위치는 밝은 1.5px 실선과 위·아래 삼각형, hover는 같은 밝기·굵기의 점선만 표시한다. 드래그·창 이탈 중 hover는 숨기고, hover는 캐시된 탐색창만 다시 그린다.


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


## 2026-10-14 — Common Clear Current / Reset All appearance
Both actions follow Audio's neutral navy reference: background #122438, text #aabccc, 6px radius, 13px/620 type, 92px minimum width, 38px height (30px at >=900px viewport width). Clear border #3b5063; Reset border #203a52. Shared hover/pressed/focus/disabled styles live in src/curve-actions.css. Red action emphasis is removed; brand/parameter colors elsewhere stay independent. Existing IDs, handlers, reset scope, confirmation mechanism and keyboard behavior remain unchanged. This is a local visual update, separate from DSP verification.


## 2026-10-14 — 편집 UI 간소화

사용자 요청으로 중복된 Select 도구와 미선택 안내, Signal Chain 제목/설명 줄 제거. Pen/Eraser 및 체인 조작은 유지. DSP/효과 순서 규칙 변경 없음.


## 2026-10-14 — 웹 비교 스펙트로그램 제거

SOURCE / OUTPUT Spectrogram 패널·토글·Update 및 전용 스타일, app의 view import/초기화/취소/무효화 연결을 제거했다. 기존 spectrogram 분석 모듈과 연구용 테스트·보고서는 참고 자산으로 보존하며 웹 앱에서 불러오지 않는다. 실제 spectral DSP의 FFT/STFT, Preview, WAV, 커브와 재생 기능은 유지. Standalone 재도입 여부는 추후 검토하며 현시점 구현 계획으로 확정하지 않는다. 위 문서의 과거 스펙트로그램 구현 설명은 현재 웹 제공 기능을 의미하지 않는다.


## 2026-10-14 — Family file information

Approved circular dotted-i disclosure immediately left of Open Audio. Default format guidance moves into this optional panel; privacy and actual error/status notices remain. Space operates disclosure without audio transport; Escape/outside click dismiss. Output guidance: Source duration and channel count · 48 kHz / 24-bit WAV. Input limits reflect current implementation, not a device-memory guarantee. No DSP, admission, export, IDs or defaults changed.


## 2026-10-14 — Family parameter help

Static parameter descriptions are available on the relevant buttons using the Audio help design; current values, axes and activation feedback remain visible. See `docs/PARAMETER_HELP.md` (or `PARAMETER_HELP.md` in this directory). No DSP or curve mapping changes.


## 2026-10-15 — Studio family visual pilot (local)
Reference: approved Audio design, commit 3e9723b. Apply deep cool-grey surfaces,
high-contrast typography, continuous panel boundaries and framed meters through
src/studio-theme.css. Preserve this Lab's brand accent, effect identities,
parameter mapping, feature layout and audio engine. No JS/DSP change.
This is a local first-pass candidate, not deployed; Canvas-rendered colors remain
the current implementation pending individual visual review. Narrow transport
uses document flow to avoid covering the editor. Listening is not implied.

Pilot smoke evidence: 1422px viewport, no horizontal overflow; default initialization and one parameter/effect selection verified; no browser errors captured. No full audio lifecycle, narrow/zoom certification or listening repeated. Only HTML/CSS/documentation changed.

### 2026-10-15 — Canvas alignment and zoom verification

- Canvas paper `#191C20`; neutral minor/major grid `rgba(139,149,162,.08/.18)`, matching the approved Audio direction. Parameter colors and audio processing are unchanged.
- Local browser: 800 CSS px viewport; actual Brave 125% (952 CSS px, DPR 2.5) and 150% (793 CSS px, DPR 3). No document horizontal overflow in any of the five Labs. Narrow layouts use vertical scrolling.
- Parameter selection and Clear Current smoke passed in all five; no captured console errors. Timbre play/pause/rewind smoke passed.
- Oscillator only: narrow-screen curve minimum height 220 px prevents crowded frequency labels; expanded Synthesis detail remains accessible.
- Syntax, keyboard tests and whitespace checks passed. Evidence: family workspace `evidence/family-studio-zoom-checks-20261015.json` and `*-studio-150-20261015.png`.
- Not a listening approval or a complete Safari/Windows regression. Local changes only; release decision remains pending.
- Additional targeted lifecycle/render regression suites passed; full results in family `UI_DESIGN_FAMILY_CANVAS_2026-10-15.md`.

## Common button states — 2026-10-15

`src/button-states.css` is the identical six-Lab contract, loaded after studio-theme.
Available off/bypassed: Audio reference gradient #363F4B → #2D3540, text #F0F3F7, edge #626C79. Unavailable: #353B44 / #949EAC / #495360 at full opacity. Selected: preserve existing parameter-specific fill, text and border colors, replace text underline with a full-width dark lower inset bevel (3 px). Focus remains independent. No hit-target, state, DSP or timing changes.

### Common role dimensions — 2026-10-15

- Main text buttons: 13px, weight 500, line-height 18px; 4px corner radius.
- Open/Download/Save: 38px high. Parameter/effect/waveform/synthesis mode/chain/action/dialog buttons: 34px.
- Pen/Eraser: 32px with shared 4px outer group; joined inner edges remain square. Transport: 32px, existing 3px corners and CSS glyphs retained.
- Audio edit helpers: 26px, 11px text; zoom symbols 14px. Fade handles are excluded.
- Secondary status text 12px; readout labels 11px, strong values 14px. Parameter colors and state semantics unchanged.
- Verified all six at 1422px and 640px CSS widths: no document horizontal overflow or measured button text clipping. Representative mode switching passed; Timbre Flanger expanded controls inspected, Audio Pen/Eraser and zoom/Fit exercised. Keyboard regression and diff whitespace checks passed.
- This is CSS-only verification, not fresh audio/export or listening certification. Local changes remain unpublished.

## Current precedence
See `docs/SHARED_VISUAL_CONTRACT.md` for the accepted shared baseline and resolution of older pilot conflicts. Newer role/state rules supersede old underline and 30px compact-button guidance.

## Information-density pilot — local review, 2026-10-15

Selected parameter name/value visible; statistics and full overview in disclosure. Existing curve targets at mapped source playback position; Signal Chain and Off states retained. All original readout IDs and update sources preserved. Details summary Space does not start transport. COMMON CANDIDATE for standalone; not committed/deployed.

## Functional surfaces
See docs/FUNCTIONAL_SURFACE_PILOT.md. Upper controls share the title background; waveform/analysis area has its own uniform surface. This refines continuous-shell styling without changing button identity or states.

## Readout disclosure rollback — 2026-10-15
User requested removal of the newly introduced Details disclosures across the family. Original always-visible readout panels restored; Oscillator retains its pre-existing Synthesis detail panel and original contents. Value computation and audio behavior unchanged. Do not add disclosure or restructure information during color/minor-UI work. Audio also removes the border above EDIT AUDIO.

## Shared content rails — 2026-10-15 (local review)
Title/icon, primary controls, values, editor outer edges and transport contents share 20px side insets; <=600px uses 10px. Dark canvas surfaces stop at this rail with neutral #373B43 outer gutters. Internal axis labels/plot margins remain part of the canvas, not the shell rail. Space retains its two-column spatial view; Oscillator retains Synthesis detail without double insets. Colors of controls/transport and all DSP behavior are preserved. Implementation: src/content-alignment.css. No release authorized for this alignment pass.

### Spectral reviewed-family surfaces — 2026-10-15 (uncommitted preview)
Header, current values, chain surround, transport and surrounding page space share #373B43, following Timbre and Granular. Waveform and curve canvas including their gutters share Audio's #191C20; a subtle #46515E line separates waveform and curve. Remove outer chain/transport borders and the Clear Current divider; retain internal controls and meter outlines. Keep 20px content rails (10px narrow), parameter colors, chain ordering, waveform seeking and all DSP unchanged. Supersedes the initial functional-surface pilot's waveform/transport palette. Review before commit/deployment.

### Shared transport alignment — 2026-10-15 (uncommitted review)
Return / Play / Pause retain their order and behavior. Each occupies a 38 × 32px cell with 4px spacing and a centered 16px icon. Remove the first button's extra 7px offset/divider so visual spacing is uniform. Audio reference palette: surround #292F37, thin border #596472, hover #343A42, playing #5C6978; no per-button accent colors. Override generic button backgrounds only inside transport. Preserve keyboard focus and disabled states.

Release approval (2026-10-15): user approved the reviewed transport/layout changes. All six transport-keyboard suites passed (27 tests total); Oscillator syntax and diff checks passed. Prior browser measurements confirmed equal transport cells, and Oscillator point add/erase, Clear Current, Play/Pause/rewind and narrow layout were checked.
