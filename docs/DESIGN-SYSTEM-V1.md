# Curve Lab Design System v1.0 — Spectral 적용

## 기준과 범위

Audio Curve Lab 기준 경로의 index.html, src/styles.css, src/app.js를 읽어 디자인 토큰·브랜드 SVG·캔버스 paint를 이식했다. 공개 URL은 웹 도구에서 열리지 않아 로컬 기준 소스를 근거로 적용했다. Spectral Curve Lab만 수정했으며 commit/push/배포는 수행하지 않았다.

## 변경 파일

- index.html: 동일한 브랜드 SVG와 brandCopy/brandAccent 구성, CSS/app 캐시 v=20260929-design1.
- src/styles.css: deep navy/charcoal 토큰, Cyan #31B8C6, 시스템 글꼴, 38px 컨트롤, 34px 툴바 버튼, 헤더/트랜스포트/상태 strip, ambient와 reduced-motion, focus/hover/disabled. 파일 입력을 키보드로 접근할 수 있도록 시각적으로만 숨김.
- src/app.js: 캔버스 배경·major/minor grid·waveform·눈금·playhead·tooltip 배경과 글꼴의 paint만 변경.
- tests/fixture.html: 제품과 같은 헤더 및 캐시 버전 반영.

Shift #6DE0C0 / Stretch #EB6F75 / Blur #DAB877의 커브·노드·active 테두리·배경·tooltip 테두리를 유지했다. legend는 각 모드의 고유색으로 표시한다. 브랜드 아이콘의 SVG path, 크기48px(좁은 화면40px), stroke 2.4는 기준과 같다.

## 기능 연결 보존

기존 HTML ID 전체의 순서와 이름을 자동 대조했다. JS의 active/eraseMode class 및 이벤트 연결을 유지했다. 좌표·보간·노드·transport 함수는 수정하지 않았다. 오디오/DSP/Worker 모듈은 적용 전 SHA-256과 동일하다. 외부 UI·폰트·패키지를 추가하지 않았다. 백업과 검사 목록은 work/design-v1-before에 있다.

직접 참조하는 ID:

blurMode, blurReadout, cancelResetButton, clearCurveButton, confirmResetButton, curveLegend, downloadButton, downloadReadout, eraserTool, fileInput, fileStatus, modeReadout, penTool, playButton, playheadReadout, pointsReadout, resetButton, resetDialog, selectTool, shiftMode, shiftReadout, spectrogramPanel, spectrogramStatus, spectrogramToggle, stopButton, stretchMode, stretchReadout, timeStatus, updateSpectrogram, waveCanvas, sourceSpectrogram, outputSpectrogram.

## 검증 결과

- 초기화 및 기본 8초 white-noise intervals 확인.
- 실제 파일 선택창을 통해 cello.wav 로딩 성공.
- Play/Pause, 재개, Stop, 자연 종료 후 초기 위치, Spacebar 재생/일시정지 확인. Spacebar는 기존대로 Pause이며 Stop으로 변경하지 않음.
- Shift/Stretch/Blur 모드와 단위·색상 확인.
- Pen 추가·drag 이동·Eraser 삭제, 빈 곳에서 점 생성 없음, 왼쪽 끝점 삭제 방지 확인. 양 끝점 보호는 기존 자동 검사도 통과.
- Command-click 삭제(3→2 points), Select 빈 곳 클릭 시 추가 없음 확인. Ctrl 동작 코드는 변경하지 않았으며 Windows 실제 Ctrl-click은 미검증.
- Clear Current 기본 2점 복원, Reset All 취소 시3점 유지, 확인 시2점 복원.
- 1024×768, 1280×800, 1920×1080 반응형 검사. 1024와1920에서 문서 너비가 viewport 이내임을 확인. 1024 리사이즈 후 클릭으로 노드 추가 확인. 넓은 화면 screenshot은 도구에서 일부 잘렸으므로 DOM 경계도 함께 검사했다. viewport override는 복원했다.
- 비중립 Shift 곡선의 SOURCE/OUTPUT preview 완료 및 WAV 다운로드 확인.
- neutral/shift/stretch/blur/spectrogram/transport 6개 자동 검사 모음 통과; transport128 cases 포함. 로그는 work/design-v1-*.log.
- 실제 브라우저 Worklet/Worker WAV: Blur0/50/100% × 단독/조합6 cases 모두 통과. 각144000frames/24-bit, stereoError≤5.97e-8.
- src/*.js 전체 구문 검사 통과. 최종 초기화 console error/warn 없음.
- prefers-reduced-motion에서 ambient animation/transition 비활성화 규칙을 소스로 확인했다. OS 설정 전환 및 장시간 장치 청감 검사는 별도이다.

마지막 저장 파일 헤더: 1ch / 48000 Hz / 24-bit / 49732 frames.

최종 화면: design-v1.png. 미리보기: http://localhost:8769/?review=design-v1-final
