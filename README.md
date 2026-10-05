# Spectral Curve Lab

Audio Curve Lab의 화면·노드 편집 방식을 바탕으로 만든 독립적인 STFT 기반 도구입니다. 현재 **Spectral Shift, Spectral Stretch, Spectral Blur, Harmonicity, Spectral Freeze**를 구현했습니다. SOURCE / OUTPUT 스펙트로그램도 제공합니다. Harmonicity와 Freeze의 청감 파인튜닝은 아직 진행 중입니다.

**Spectral Shift: −2000…+2000 Hz, default 0 Hz.** 모든 성분에 같은 Hz를 더합니다. 예를 들어 +200 Hz는 440/880 Hz를 640/1080 Hz로 옮깁니다. 곡선을 위로 그리면 양의 이동, 아래로 그리면 음의 이동입니다. 0 Hz의 일정한 곡선은 원본을 유지합니다.

**Spectral Stretch: 0.5–2.0, default 1.0, pivot 1 kHz.** 1 kHz를 중심으로 성분 간격을 펼치거나 압축합니다. Stretch 2는 500/1000/2000 Hz를 250/1000/4000 Hz로 옮깁니다. 시간 길이는 유지됩니다. Stretch 값은 배속이 아니므로 ×를 표시하지 않습니다.

**Spectral Blur: 0–100%, default 0%.** 주파수 위치를 옮기지 않고 시간에 따른 성분 변화를 완만하게 만듭니다. 100%에서 크기 평활의 시간 상수는 500ms입니다. 파일 길이를 유지하므로 번짐은 파일 끝에서 잘립니다.

**Harmonicity: −100…+100%, default 0%.** 감지한 저역 peak를 기준으로 음성분을 가까운 배음 간격 쪽으로 당기거나(음수), 비화성적으로 펼칩니다(양수). 현재 추정은 단일음에 맞춘 첫 구현이며 복잡한 음악·음성에 대한 유용 범위와 음질은 미승인입니다.

**Spectral Freeze: 0–100%, default 0%.** 0에서 꺼지고, 0보다 높아질 때 현재 스펙트럼 상태를 포착해 유지합니다. 100%는 포착한 상태만 출력하며 중간값은 현재 소리와 섞습니다. 재생 시간과 파일 길이는 계속 진행하며, seek/stop에서 포착 상태가 초기화됩니다.

**Signal Chain:** 시작할 때 다섯 효과가 모두 Off이며 캔버스에는 선택된 커브가 없습니다. 상단에서 효과를 누르면 On으로 켜지고 체인에 연결됩니다. 켜진 다른 효과를 누르면 그 커브를 선택하고, 선택된 버튼을 다시 누르면 Off가 됩니다. 다섯 효과는 켠 순서대로 처리되며, 하단 블록을 다른 블록 앞으로 끌어 놓거나 Output에 놓아 순서를 변경할 수 있습니다. Shift 뒤에 다른 효과가 있으면 Shift 출력을 다시 분석하는 두 번째 STFT 단계를 사용하고, Shift가 마지막이면 기존 단일 단계 경로를 유지합니다. Off 후 다시 On하면 체인 맨 뒤로 이동합니다. 체인 블록 클릭은 편집 선택이며, Off에서도 커브 점은 보존됩니다. Clear Current와 Reset All은 커브만 복원하고 On/Off·순서는 유지합니다. [체인·DSP 검토](docs/CHAIN-ORDER-20261003.md).

## 실행

[공개 웹 테스트](https://hyunsukjun.github.io/spectral-curve-lab/) — GitHub Pages에서 실행합니다. 음원은 브라우저 안에서 처리하며 업로드하지 않습니다.

이 폴더에서 `python3 -m http.server 8769 --bind 127.0.0.1` 실행 후 `http://localhost:8769`를 여세요. 로컬 HTTP 또는 HTTPS가 필요합니다. Chrome 및 Codex 내장 브라우저에서 수치·UI를 검증했으며 다른 브라우저의 청감·성능 검증은 남아 있습니다.

- Open Audio: 로컬 모노/스테레오 음원. 파일을 업로드하지 않습니다.
- Play / Pause: 재생·일시정지. Stop: 처음으로 되돌림. Space: 재생·일시정지.
- 하단 OUTPUT TIME 파형을 클릭하거나 드래그해 파일 위치를 이동합니다. 원본 채널 파형을 탐색 안내로 표시하며 최종 처리 파형은 아닙니다. 좌우 방향키는 1초, Shift+방향키는 0.1초, Home/End는 처음/끝으로 이동합니다. 하단의 L/R 미터는 Preview의 최종 출력 신호를 측정하며 CLIP은 눌러 초기화합니다. 모노 파일도 Preview에서는 L/R에 같은 신호가 나옵니다.
- Select: 기존 노드 이동. 빈 곳에 새 노드를 만들지 않습니다.
- Pen: 노드 추가·이동. Eraser: 내부 노드 하나 삭제. macOS Command-click / 다른 플랫폼 Ctrl-click도 삭제합니다.
- 양 끝 노드는 삭제할 수 없고 시간 좌표가 0/1에 고정됩니다. Y는 이동 가능합니다.
- Double-click: 해당 시간으로 seek. 기존 Pen 동작을 계승하여 첫 click이 노드를 추가할 수 있으므로 Select에서 seek하는 것을 권장합니다.
- Clear Current: 선택한 곡선을 기본값으로 복원. Reset All: Shift 0 Hz, Stretch 1.0, Blur 0%, Harmonicity 0%, Freeze 0% 모두 복원. Reset All은 기존 확인창을 유지합니다.
- Download WAV: 원본 채널 수를 유지하는 48 kHz / 24-bit PCM WAV. 렌더 중 Cancel 가능.

기본 소스는 8초간 네 개의 배음 음이 이어지는 **Harmonic notes**입니다. 어택과 짧은 쉼을 포함하므로 효과 차이를 듣기 위한 합성 진단 예제입니다. 상단 Demo에서 기존 **Noise intervals**로 전환할 수 있습니다. 두 예제 모두 앱에서 생성하며 청감상 성공한 설정이나 실제 악기 녹음으로 간주하지 않습니다. 실제 악기·음성·타악 음원은 Open Audio로 비교하세요.

모든 DSP는 AudioWorklet 또는 Worker에서 실행됩니다. 재생/seek의 STFT 준비 시간은 48 kHz에서 약 18.7ms입니다. 일시정지 후 재개는 위상과 위치를 유지합니다. 디코딩과 렌더 결과는 메모리에 유지하므로 매우 긴 파일은 메모리 제한을 받을 수 있습니다. 출력은 WAV 범위를 넘으면 PCM 인코딩에서 clipping되며 자동 normalization/limiter는 없습니다. 하단 미터는 WAV 렌더 결과를 측정하지 않습니다. [하단 재생 바 적용 기록](docs/PLAYBACK-BAR-20261001.md).

## 스펙트로그램

곡선 아래의 SOURCE / OUTPUT Spectrogram을 켜면 원본과 현재 preview 처리 결과를 비교합니다. 양쪽의 주파수·색상 기준은 같습니다. 곡선을 바꾼 뒤에는 재생을 멈추고 Update comparison을 누르세요. 이 화면은 편집 표면이 아닙니다.

기본 OFF이며 분석은 Worker에서 실행합니다. 512개 시간 열로 요약하므로 긴 파일의 짧은 이벤트를 놓칠 수 있습니다. OUTPUT은 preview 엔진 결과이며 FFT 크기가 다른 WAV의 정확한 분석은 아닙니다. [구현 및 Oscillator 검토 보고서](docs/SPECTROGRAM-REPORT.md) 참조.

## 검증

`npm test` 또는 `node tests/neutral.mjs`, `node tests/shift.mjs`, `node tests/stretch.mjs`, `node tests/blur.mjs`, `node tests/spectrogram.mjs` — FFT/역 FFT, 극단 길이·값, 스테레오, seek, 실제 worklet 클래스의 128-frame 출력과 편집 데이터 검증.

`tests/browser.html` — 로컬 첼로 fixture를 이용하는 실제 브라우저 AudioWorklet 및 render Worker 수치 비교. **OfflineAudioContext 안에서 실제 AudioWorklet을 검증**하며 실시간 CPU 측정을 대체하지 않습니다.

`tests/browser-shift.html` — 실제 Worklet의 +200 Hz mapping 및 44.1/48/96 kHz 입력의 Worker WAV 검사.

`tests/browser-spectrogram.html` — 실제 AudioWorklet 출력과 스펙트로그램 Worker의 다섯 경우 일치 검사.

`tests/browser-blur.html` — Blur 0/50/100% × 단독/기존 두 효과 조합의 6 cases Preview/Worker WAV 검사.

`tests/browser-stretch.html` — Stretch 0.5/1/2와 Shift 0/+200의 6조합 Preview/Worker WAV 검사.

`tests/realtime.html`, `tests/realtime.html?shift=1`, `tests/realtime.html?stretch=1&shift=1`, `tests/realtime.html?stretch=1&shift=1&blur=1` — 8초 실제 AudioContext neutral/Shift 출력 및 audio-thread 처리 시간 측정. 시계는 1ms 단위이며 오디오 장치 underrun은 측정하지 않습니다.

`tests/fixture.html` — 같은 앱의 로딩 함수를 호출하는 fixture UI. 파일 chooser 권한 문제를 분리해 테스트합니다. fixture 출처는 `tests/fixtures/README.md` 참조.

새 기능과 검증 범위는 [Harmonicity/Freeze 보고서](docs/PHASE-7-8-REPORT.md)를 참조하세요. [Spectral Blur 보고서](docs/PHASE-6-REPORT.md), [Spectral Shift 보고서](docs/PHASE-4-REPORT.md), [초기 neutral 보고서](docs/PHASE-1-3-REPORT.md)는 이전 단계 기록입니다. 현재 상태는 **다섯 효과 구현, 기존 세 효과와 새 두 효과의 수치·브라우저 검증 완료, 다양한 실제 음원의 청감 승인 대기**입니다.

경계 근처의 주파수는 100 Hz 폭의 soft guard로 감쇠됩니다. 0 Hz 부근에서는 경계 필터를 부드럽게 섞으므로 완전한 brick-wall 제거는 아닙니다. 곡선은 10ms smoothing을 거치고, 0 Hz로 돌아올 때 잠깐의 전환 구간이 있습니다. 임의 지점의 Stop/seek는 별도 transport fade를 넣지 않아 click이 발생할 수 있습니다.

Stretch는 20ms smoothing을 사용합니다. 검사한 단음에서 보간에 따른 최대 약 3%의 진폭 감소가 있었으며 복잡한 음원과 어택의 음질은 추가 청감 검증이 필요합니다.

2026-09-29: 자연 종료 메시지 순서와 정확한 블록 길이의 종료 처리를 보완했습니다. [안정성 검사 보고서](docs/STABILITY-20260929.md). `node tests/transport.mjs`는 128가지 종료·재시작·일시정지·정지 조합을 검사합니다.

## 디자인 시스템

Audio Curve Lab 기준의 Curve Lab Design System v1.0을 적용했습니다. Cyan 브랜드와 기존 Shift/Stretch/Blur 색상을 분리했습니다. [변경 및 회귀 검증](docs/DESIGN-SYSTEM-V1.md).

## 개발·스탠드얼론 이관 자료

현재 구현의 제품 동작과 웹 구현을 구분해 기록했습니다. [적용 감사](docs/KNOWLEDGE-SETUP-20260929.md) · [작업 규칙](AGENTS.md) · [개발 지침](DEVELOPMENT_GUIDELINES.md) · [디자인 토큰](CURVE_LAB_DESIGN_SYSTEM.md) · [기능 목록](docs/FEATURE_REGISTRY.md) · [파라미터/청감 검증 상태](docs/PARAMETER_SPEC.md) · [상호작용](docs/INTERACTION_SPEC.md) · [DSP/Preview·Render](docs/DSP_BEHAVIOR.md) · [결정 기록](docs/DECISIONS.md) · [macOS 이관 지도](docs/STANDALONE_MIGRATION.md).

청감·이관 지식은 [Reference Sound Set](docs/REFERENCE_SOUND_SET.md) · [청취 판단 기록](docs/LISTENING_DECISIONS.md) · [커브의 시간 동작](docs/CURVE_TEMPORAL_BEHAVIOR.md) · [실패·수정·보류 이력](docs/FAILURES_AND_FIXES.md)에 축적합니다. 청감 sweet spot과 승인값은 아직 UNKNOWN이며 이후 실제 청취 결과로 채웁니다.
