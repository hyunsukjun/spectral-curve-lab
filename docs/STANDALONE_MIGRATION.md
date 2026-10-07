# macOS Standalone 이관 자산과 위험

목표는 웹 코드를 그대로 복사하는 것이 아니라 **동일한 제품 행동과 음악적 결과**를 재현하는 것이다. 이 문서는 2026-09-29 실행 구현의 이관 지도이며 Swift/C++/JUCE/Audio Unit 등 프레임워크 선택은 **미결정**이다. Audio Plug-in은 가능성만 있고 현재 구현되지 않았다.

이관할 청감 자료는 현재 미완성이다. [Reference Sound Set](REFERENCE_SOUND_SET.md)은 확보·누락된 음원을, [청취 판단 기록](LISTENING_DECISIONS.md)은 승인되지 않은 fine-tuning을, [커브 시간 동작](CURVE_TEMPORAL_BEHAVIOR.md)은 급격한 제스처와 Preview/Render 차이를, [실패·수정 이력](FAILURES_AND_FIXES.md)은 재발 방지 근거를 구분한다.

| 기능 / 우선순위 | 재사용할 계약·fine-tuning 데이터 | 웹 의존성 → native 대체 / 위험 |
| --- | --- | --- |
| 다섯 곡선·파라미터 / 최상 | ID `shift/stretch/blur/harmonicity/freeze`, `{x,y}` 정규화 점, smoothstep 보간, 범위/기본/로그·선형 매핑, 끝점·시간축. [파라미터](PARAMETER_SPEC.md) | Canvas/pointer→native editor. 저장/host automation이 새로 생길 때 시간 기준과 ID를 보존. `x`를 화면 픽셀로 직렬화하지 말 것 |
| 공통 엔진·DSP / 최상 | Hann² weighted OLA, FFT/hop 설정, 다섯 효과의 활성 순서. Shift가 마지막이면 단일 STFT, Shift 뒤에 효과가 있으면 analytic Shift 출력을 두 번째 STFT로 다시 분석한다. channel state/seek, 10/20ms·500ms 상수, 경계 guard·보간. [DSP](DSP_BEHAVIOR.md) | JS typed arrays/AudioWorklet/Worker→native audio engine. 두 번째 pass의 buffer/lookahead·phase reset과 CPU 비용, FFT 관례·float precision·resampler 차이로 소리 달라질 위험. neutral/tones/경계/실제 음원 골든 샘플과 청감 비교 필요 |

| 재생·탐색 / 높음 | Play/Pause/Stop/자연 종료, pause 상태 보존, seek reset, 커브 갱신의 프레임 경계. [상호작용](INTERACTION_SPEC.md) | Web Audio callback/message token→native callback/상태 동기화. 현재 시작 준비 무음과 hard seek click을 우연히 다르게 만들거나 버그까지 무비판적으로 이식하지 말고 의도별 승인 필요 |
| 하단 위치·미터 / 높음 | 동일 시간축의 Position/플레이헤드, Preview 최종 L/R peak·RMS·hold·CLIP 래치/초기화. [적용 기록](PLAYBACK-BAR-20261001.md) | DOM range·AnalyserNode→native timeline 및 출력 tap. 모노 입력의 현행 스테레오 복제와 WAV 원채널 유지 구분; 미터가 DSP를 바꾸지 않도록 함 |
| 파일·WAV / 높음 | mono/stereo, 동일 길이, 48 kHz/24-bit export, 무 normalization/limiter, PCM clamp. [DSP](DSP_BEHAVIOR.md) | `decodeAudioData`/`OfflineAudioContext`/Blob→native decode/resample/encode. 브라우저별 resampling·float→PCM 양자화 차이 검증. 큰 파일 스트리밍/메모리 설계 필요 |
| 진단 예제 / 중간 | 기본 Harmonic notes의 네 음·배음·어택/쉼과 선택 가능한 Noise intervals. 생성 신호이므로 재배포 권리 문제가 없고 비교 재현성이 있다. [Reference Sound Set](REFERENCE_SOUND_SET.md) | `AudioBuffer` 생성 코드는 native 버퍼로 대체. 예제의 존재를 실제 악기 청감 승인으로 오인하지 말고, 실제 소스 A/B 세트를 별도로 구축 |
| 비교 스펙트로그램 / 중간 | SOURCE/OUTPUT 동일 축, −90…0dBFS, 로그 Hz, 평균 채널 power, 512×192 overview, stale 갱신. [비교 기록](SPECTROGRAM-REPORT.md) | Worker/Canvas→native background analysis/view. Preview를 분석하는 의미를 유지하고 Render exact 분석으로 오표기하지 말 것 |
| 디자인 시스템 / 중간 | deep navy/charcoal 의미, Cyan 브랜드와 의미 색 분리, 작업 영역 계층, 키보드 초점/모션 정책. [디자인](../CURVE_LAB_DESIGN_SYSTEM.md) | CSS custom properties/DOM→native tokens/controls. 픽셀값보다 대비와 계층을 재현 |

모듈 UI의 enabled 상태와 체인 순서는 커브 점과 별도로 보존한다. 기본값은 다섯 개 모두 Off·빈 체인이다. Off는 해당 효과의 중립 커브를 DSP에 전달한다. 다섯 효과는 활성화 순서대로 시작하며, 하단 블록 드래그로 이 순서를 바꿀 수 있다. 블록 클릭은 편집 선택으로 순서를 바꾸지 않는다. Shift가 중간에 있으면 그 출력을 두 번째 STFT에 전달하되, Shift 자체는 phase-continuous oscillator를 유지한다. Native 모델은 이 pass 경계와 seek 시 두 단계의 상태 초기화를 명시해야 같은 소리가 난다. 현재 Off는 성능 최적화가 아닌 음향 우회다. 저장/preset schema는 아직 없다.

## 상태·preset 경계

현재 앱은 메모리의 곡선만 가지며 **영구 preset, 직렬화 schema, 프로젝트 저장은 미구현**이다. 신규 이식 형식을 설계할 때 `schemaVersion`, `product`, `module`, `parameters`, `curves`, `settings`를 고려하되 **제안일 뿐 현재 확정 포맷이 아니다**. 파라미터 ID와 매핑 버전을 명시하고, 파일 길이가 달라질 때 정규화 시간의 의미를 정한다. 로드 파일 자체를 preset에 포함할지도 미결정. 향후 format 확정 전에 웹/Standalone 간 round-trip, 이전 버전 migration, 유효하지 않은 점/범위 처리 테스트가 필요하다.

## 검증 이관 계획

1. 현재 JS 엔진의 neutral·다섯 효과 단독/조합·극단·seek·stereo 수치 fixture를 참조 자료로 고정한다. [기존 보고서](PHASE-6-REPORT.md)의 측정 조건을 함께 보존한다.
2. Native 엔진에서 Preview와 offline render를 각각 비교한다. 현재 두 경로 FFT 크기가 다르므로 무조건 sample-exact를 합격 기준으로 삼지 않는다. 주파수·레벨·시간 궤적과 청감 기준을 별도로 세운다.
3. 실제 음성, 현/관/타악, 환경음, 급격한 곡선, 긴 파일에서 청감/성능을 기록한다. 현재 useful range·sweet spot·모니터 환경·승인 여부는 **UNKNOWN**이다.
4. 제품 상호작용과 접근성·window resize·Retina·키보드 조작을 native UI에서 재검증한다. Audio Plug-in을 추진할 경우 host time, automation, state 저장, 실시간 할당 제한은 신규 설계가 필요하다.

## Identity asset pilot

STANDALONE ASSET: `assets/identity/spectral-app.svg` 및 symbol/micro와 공통
색상표. 실제 네이티브 패키징/Dock 검증은 수행하지 않음.

OUTPUT TIME 탐색은 원본 채널별 peak 요약을 동일 길이의 출력 시간축에 그리는 UI이다. 렌더 파형이나 실시간 분석기가 아니다. native에서도 커브 시간축과 좌우 경계를 맞추고, 미리 선택한 위치는 오디오 엔진 초기화 후 적용한다. 드래그 중 늦은 위치 보고를 무시하는 계약과 seek token 검증을 유지한다.

## 2026-10-06 — Render 입력 변환 검증 (로컬, 미배포)

변환기 계약: 원본 PCM 채널 수 유지, round(sourceFrames * 48000 / sourceRate), 48k bypass, 입력 배열 보존, 취소 확인. STFT 전에 변환하며 Preview/효과 순서/파라미터는 변경하지 않았다.


## 2026-10-07 WAV result feedback — PROJECT-SPECIFIC

Carry forward post-render sample-peak/clipped-channel-sample metadata and explicit clipped-result review. The measurement contract is portable; Blob links and worker messages are browser implementation details.
