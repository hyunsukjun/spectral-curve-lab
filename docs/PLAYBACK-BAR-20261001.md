# 하단 재생 바 적용·검증 — 2026-10-01

## 기준과 기존 차이

Audio Curve Lab 커밋 `e0815b8`의 `index.html`, `src/styles.css`, `src/app.js`, `src/output-meter.js`를 기준으로 삼았다. Spectral은 이전에 상단 Play/Stop·시간 표시와 상태 strip의 별도 Playhead 수치를 사용했고, `AudioWorkletNode`가 `AudioContext.destination`에 직접 연결되어 있었다. 재생 토큰·Stop/자연 종료의 0초 복귀·mono 입력을 L/R로 복제하는 Worklet은 이미 있었다. Stretch는 주파수 간격만 바꾸므로 출력 시간과 소스 시간은 같다.

## 적용한 제품 동작

- 상단에는 Open Audio/Download WAV만 남기고 Play/Stop, 시간, 별도 Playhead 시간 숫자를 하단의 단일 바에 통합했다. 순서는 Play/Stop → 현재/전체 시간 → Position → L/R 출력 미터다. 넓은 화면의 미터 열은 33–38vw를 배정하고 860px 이하에서 다음 줄로 재배치한다.
- Position은 기존 Worklet `seek`에 정규화 위치를 보낸다. 사용자 이동 때 UI 시간·Canvas playhead를 바로 갱신하고, 이전 위치 메시지를 token으로 거른다. 드래그 중에는 Worklet 위치 보고가 표시를 덮지 않는다. Stop/자연 종료에서는 시간·슬라이더·playhead가 0으로 돌아간다.
- Worklet의 2채널 출력 다음에 unity gain 측정 노드를 연결했다. 같은 신호가 목적지로 전달되고 channel splitter/analyser는 측정용 분기다. `AnalyserNode`의 1024-sample 창, smoothing 0, peak/RMS, 표시 attack/release/hold, CLIP threshold 0.999와 수동 초기화는 기준 프로젝트와 같다. 모노 파일도 **Preview에서** L/R 두 채널로 복제되어 양쪽 미터가 반응한다. WAV는 기존처럼 원본 채널 수를 유지한다.
- Spectral Cyan 브랜드와 Shift/Stretch/Blur 의미 색, STFT/DSP/Worker/WAV 코드는 변경하지 않았다. 새 외부 패키지는 없다.

## 확인한 범위

- 문법 검사: `src/app.js`, 새 `src/output-meter.js` 통과. 기존 6개 Node 테스트(neutral, Shift, Stretch, Blur, spectrogram, transport) 모두 통과. 테스트가 생성한 결과 JSON은 기존 검사 산출물이다.
- Codex 내장 브라우저, 로컬 서버: 8초 기본 샘플의 Play, 재생 중 Position 이동(약 4.23/8초에서 시간·슬라이더 동시 표시), Stop→0, Spacebar 재생/일시정지, 자연 종료→0을 확인했다. L/R 미터에 기본 샘플의 약 −11dB 값이 표시됐다.
- 로컬 `tests/fixtures/cello.wav`(약 1.04초, mono) 파일 선택/재생/자연 종료를 확인했다. Preview 미터는 양 L/R에 반응했다. 별도 float WAV 시험 신호에서는 양 채널 peak가 0dBFS를 넘어 CLIP이 켜졌고, 재생 종료 뒤 CLIP 클릭으로 꺼지는 것을 확인했다.
- 1440px급 넓은 뷰에서 미터가 하단 바의 약 39% 폭을 차지했다. 390px급 좁은 뷰에서는 컨트롤이 3줄로 재배치되고 각 요소가 화면 안에 들어왔다. 브라우저 console error는 없었다.
- 첼로 WAV 렌더는 UI에서 1.0초 완료로 표시됐으며 기존 WAV 수치 테스트도 통과했다. 이 브라우저 세션은 다운로드 이벤트를 포착하지 못했으므로 **다운로드된 파일의 직접 재열기/청취까지는 이번 검사에서 확인하지 못했다**. CLIP 시험 파일은 품질 기준음원이 아니라 계기 동작 확인용이다.

사람의 음질 청취 승인이나 Preview/WAV의 비중립 청감 일치는 여전히 [청취 기록](LISTENING_DECISIONS.md)의 미검증 항목이다.
