# macOS Standalone 이관 자산과 위험

목표는 웹 코드를 그대로 복사하는 것이 아니라 **동일한 제품 행동과 음악적 결과**를 재현하는 것이다. 이 문서는 2026-09-29 실행 구현의 이관 지도이며 Swift/C++/JUCE/Audio Unit 등 프레임워크 선택은 **미결정**이다. Audio Plug-in은 가능성만 있고 현재 구현되지 않았다.

이관할 청감 자료는 현재 미완성이다. [Reference Sound Set](REFERENCE_SOUND_SET.md)은 확보·누락된 음원을, [청취 판단 기록](LISTENING_DECISIONS.md)은 승인되지 않은 fine-tuning을, [커브 시간 동작](CURVE_TEMPORAL_BEHAVIOR.md)은 급격한 제스처와 Preview/Render 차이를, [실패·수정 이력](FAILURES_AND_FIXES.md)은 재발 방지 근거를 구분한다.

| 기능 / 우선순위 | 재사용할 계약·fine-tuning 데이터 | 웹 의존성 → native 대체 / 위험 |
| --- | --- | --- |
| 세 곡선·파라미터 / 최상 | ID `shift/stretch/blur`, `{x,y}` 정규화 점, smoothstep 보간, 범위/기본/로그·선형 매핑, 끝점·시간축. [파라미터](PARAMETER_SPEC.md) | Canvas/pointer→native editor. 저장/host automation이 새로 생길 때 시간 기준과 ID를 보존. `x`를 화면 픽셀로 직렬화하지 말 것 |
| 공통 엔진·DSP / 최상 | Hann² weighted OLA, FFT/hop 설정, Stretch→Blur→Shift, channel state/seek, 10/20ms·500ms 상수, 경계 guard·보간. [DSP](DSP_BEHAVIOR.md) | JS typed arrays/AudioWorklet/Worker→native audio engine. FFT 관례, phase, float precision, FFT 크기·resampler 차이로 소리 달라질 위험. neutral/tones/경계/실제 음원 골든 샘플과 청감 비교 필요 |
| 재생·탐색 / 높음 | Play/Pause/Stop/자연 종료, pause 상태 보존, seek reset, 커브 갱신의 프레임 경계. [상호작용](INTERACTION_SPEC.md) | Web Audio callback/message token→native callback/상태 동기화. 현재 시작 준비 무음과 hard seek click을 우연히 다르게 만들거나 버그까지 무비판적으로 이식하지 말고 의도별 승인 필요 |
| 하단 위치·미터 / 높음 | 동일 시간축의 Position/플레이헤드, Preview 최종 L/R peak·RMS·hold·CLIP 래치/초기화. [적용 기록](PLAYBACK-BAR-20261001.md) | DOM range·AnalyserNode→native timeline 및 출력 tap. 모노 입력의 현행 스테레오 복제와 WAV 원채널 유지 구분; 미터가 DSP를 바꾸지 않도록 함 |
| 파일·WAV / 높음 | mono/stereo, 동일 길이, 48 kHz/24-bit export, 무 normalization/limiter, PCM clamp. [DSP](DSP_BEHAVIOR.md) | `decodeAudioData`/`OfflineAudioContext`/Blob→native decode/resample/encode. 브라우저별 resampling·float→PCM 양자화 차이 검증. 큰 파일 스트리밍/메모리 설계 필요 |
| 비교 스펙트로그램 / 중간 | SOURCE/OUTPUT 동일 축, −90…0dBFS, 로그 Hz, 평균 채널 power, 512×192 overview, stale 갱신. [비교 기록](SPECTROGRAM-REPORT.md) | Worker/Canvas→native background analysis/view. Preview를 분석하는 의미를 유지하고 Render exact 분석으로 오표기하지 말 것 |
| 디자인 시스템 / 중간 | deep navy/charcoal 의미, Cyan 브랜드와 의미 색 분리, 작업 영역 계층, 키보드 초점/모션 정책. [디자인](../CURVE_LAB_DESIGN_SYSTEM.md) | CSS custom properties/DOM→native tokens/controls. 픽셀값보다 대비와 계층을 재현 |

## 상태·preset 경계

현재 앱은 메모리의 곡선만 가지며 **영구 preset, 직렬화 schema, 프로젝트 저장은 미구현**이다. 신규 이식 형식을 설계할 때 `schemaVersion`, `product`, `module`, `parameters`, `curves`, `settings`를 고려하되 **제안일 뿐 현재 확정 포맷이 아니다**. 파라미터 ID와 매핑 버전을 명시하고, 파일 길이가 달라질 때 정규화 시간의 의미를 정한다. 로드 파일 자체를 preset에 포함할지도 미결정. 향후 format 확정 전에 웹/Standalone 간 round-trip, 이전 버전 migration, 유효하지 않은 점/범위 처리 테스트가 필요하다.

## 검증 이관 계획

1. 현재 JS 엔진의 neutral·세 효과 단독/조합·극단·seek·stereo 수치 fixture를 참조 자료로 고정한다. [기존 보고서](PHASE-6-REPORT.md)의 측정 조건을 함께 보존한다.
2. Native 엔진에서 Preview와 offline render를 각각 비교한다. 현재 두 경로 FFT 크기가 다르므로 무조건 sample-exact를 합격 기준으로 삼지 않는다. 주파수·레벨·시간 궤적과 청감 기준을 별도로 세운다.
3. 실제 음성, 현/관/타악, 환경음, 급격한 곡선, 긴 파일에서 청감/성능을 기록한다. 현재 useful range·sweet spot·모니터 환경·승인 여부는 **UNKNOWN**이다.
4. 제품 상호작용과 접근성·window resize·Retina·키보드 조작을 native UI에서 재검증한다. Audio Plug-in을 추진할 경우 host time, automation, state 저장, 실시간 할당 제한은 신규 설계가 필요하다.
