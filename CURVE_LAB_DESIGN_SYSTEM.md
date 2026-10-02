# Curve Lab Design System v1.0 — Spectral

**상태: 적용됨.** Audio Curve Lab은 공통 시각 언어의 참고 프로젝트이며, Spectral의 기능·색 의미는 이 프로젝트의 코드가 기준이다. 적용 과정과 화면/회귀 증거는 [기존 디자인 기록](docs/DESIGN-SYSTEM-V1.md)에 있다. 이 문서는 향후 native UI에서도 유지할 **토큰의 의미**를 정의한다. 웹의 CSS 픽셀과 class 자체는 제품 데이터가 아니다.

| 의미 | 현재 토큰·값 | 사용 |
| --- | --- | --- |
| 브랜드 | `--cl-accent: #31B8C6` | 좌상단 아이콘, 제목의 Curve Lab, 작은 강조 |
| 배경 | `--cl-bg: #07111c`, `--cl-bg-deep: #050b12` | 공통 deep navy 작업 환경 |
| 표면 | `--cl-surface: #0d1b29`, `--cl-surface-raised: #122438` | 패널과 컨트롤 |
| 글자 | `--cl-text: #e8f0f6`, secondary `#aabccc`, muted `#71889b` | 정보 계층 |
| 경계·초점 | border `#203a52`, strong `#345672`, focus `#73dbe4` | 분리와 키보드 포커스 |
| 의미 색 | Shift `#6DE0C0`, Stretch `#EB6F75`, Blur `#DAB877`, Harmonicity `#B595EF`, Freeze `#79C9F0` | 커브·점·범례·활성 버튼·tooltip |
| 형태 | control height 38px, toolbar height 54px; radius 4/6/8px; spacing 4/8/12/16/24/32px | 공통 밀도와 리듬 |

브랜드색으로 전체 화면이나 다섯 파라미터를 통일하지 않는다. Header·Transport·Toolbar·얇은 상태 strip 다음에 어두운 Canvas를 가장 큰 작업 영역으로 둔다. Canvas의 major/minor grid, muted blue-gray waveform, 읽기 쉬운 scale/playhead를 유지한다. 시스템 글꼴, hover/disabled/focus-visible, 정적인 deep navy 배경, `prefers-reduced-motion`을 지원한다. 장식용 애니메이션 없이도 기능은 완전하다.

Timbre Curve Lab에서 참고한 효과 UI 규칙: 시작 시 모든 효과는 Off이고 선택 커브가 없다. 상단 버튼의 의미 색은 On 상태, 하단선은 현재 편집 커브를 뜻한다. Off는 차분한 중립색으로 표시한다. 캔버스 아래 Input→Output 체인에는 On 효과만 실제 처리 순서대로 나타나며, 블록 클릭은 편집 선택이다. 좁은 화면에서 체인은 가로로 스크롤한다. 브랜드 Cyan은 이 의미 색을 대체하지 않는다.

현재 값의 구현 근거는 `src/styles.css`의 `:root`와 반응형 규칙, `src/app.js`의 Canvas paint, `index.html`의 배치다. 향후 native 구현은 역할과 계층을 옮기되 픽셀을 기계적으로 고정하지 않는다. 색/크기 변경은 곡선과 눈금의 대비 및 좁은 화면에서의 사용성을 먼저 검사한다.
