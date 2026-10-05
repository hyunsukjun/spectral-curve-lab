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
