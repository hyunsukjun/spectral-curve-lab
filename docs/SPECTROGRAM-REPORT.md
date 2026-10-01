# SOURCE / OUTPUT Spectrogram — implementation and Oscillator review

2026-09-27. 사용자 승인에 따라 원래 Phase 9인 스펙트로그램을 Harmonicity/Freeze보다 먼저 구현했다. 근거: INITIAL-SPECIFICATION.md §15의 Observation / Feedback, SOURCE/OUTPUT 비교, 실시간 안정성 우선 요구.

## 구현된 비교 화면

곡선 아래에 기본 OFF인 SOURCE / OUTPUT Spectrogram 스위치를 추가했다. SOURCE는 실제 입력 오디오, OUTPUT은 현재 곡선을 스냅샷으로 받아 preview용 SpectralEngine(FFT2048/hop512)에서 나온 샘플이다. 추정용 효과 공식을 따로 그리지 않는다. 재생 엔진의 시작 준비 무음은 분석에 포함하지 않는다. WAV export는 FFT4096이므로 이 화면을 저장 파일의 정확한 분석으로 주장하지 않는다.

양쪽에 같은 시간 범위, 로그 주파수 40 Hz–20 kHz(낮은 sample rate는 Nyquist까지), 고정 −90…0 dBFS 색상 범위를 사용한다. Hann window의 coherent gain을 보정한 단측 진폭 기준이고 주파수 행 안에서는 최대 bin power를 표시한다. PSD 또는 loudness 측정기가 아니다. 스테레오는 두 채널의 power 평균이므로 반대 위상 신호가 모노 합산처럼 지워지지 않는다. 0 dBFS 이상은 같은 최상위 색으로 표시된다.

전체 길이를 512개 시간 열과 192개 주파수 행으로 요약한다. 긴 파일의 매우 짧은 이벤트는 열 사이에서 누락될 수 있으며, FFT2048의 한계보다 높은 저역 해상도를 제공하지 않는다. 두 끝 프레임은 zero padding 영향으로 더 어둡게 보일 수 있다. 이것은 편집 표면이나 정밀 분석기가 아니라 비교용 overview이다.

## 안정성과 상태 관리

- FFT와 출력 DSP는 별도 Worker에서 실행한다. 출력 전체를 추가 AudioBuffer로 만들지 않고 2048-sample ring으로 분석한다. 분석 데이터와 FFT 버퍼 크기는 파일 길이에 따라 증가하지 않는다. 입력 채널은 Worker로 넘기기 위해 한 번 복사하므로 매우 긴 파일의 메모리 비용 자체가 사라지는 것은 아니다.
- 최초 스위치 ON 때 분석하고, 이후 곡선 변경 시 이전 결과를 어둡게 표시하면서 Update needed를 명시한다. Update comparison을 누르면 재분석한다. 자동으로 드래그마다 분석하지 않는다.
- 취소, 새 파일, 곡선 변경, 패널 닫기는 Worker를 종료한다. 작업 세대 번호로 오래된 응답을 무시한다.
- 재생/내보내기 중 새 분석은 시작하지 않는다. 분석 중 재생/내보내기를 시작하면 분석을 취소한다. 완료된 결과는 재생만 했다는 이유로 오래된 결과로 바꾸지 않는다.
- 기존에 사용자가 편집 중이던 test.wav 탭은 새로고침하지 않고, 별도 미리보기 탭에서 검증했다.

## 검증

- `tests/spectrogram.mjs`: neutral SOURCE/OUTPUT 최대 오차 0, 반대 위상 스테레오와 mono 결과 동일, −6.0206 dBFS 보정 사인 검사, 입력을 1/10로 줄였을 때 정확히 20 dB 감소, 1-sample silence, Shift/Stretch 주파수 이동 및 Blur 주파수 유지 검사 통과.
- `tests/browser-spectrogram.html`: 실제 AudioWorklet/OfflineAudioContext 출력 샘플의 분석과 production 분석 Worker의 결과를 neutral/Shift/Stretch/Blur/combined 다섯 경우에 비교했다. 모든 경우 최대 오차 0. Worklet wrapper는 시작 프레임을 미리 준비한다.
- neutral, shift, stretch, blur, spectrogram의 전체 다섯 테스트 모음 및 JS 구문 검사 통과.
- 브라우저 UI: 기본 OFF, 분석 완료, 곡선 수정 후 stale 표시/업데이트, 재생 중 분석 제한과 Stop 후 재분석 확인. 기존 편집 영역과 관찰 영역을 분리한 화면을 확인했다.
- 실제 cello.wav를 앱과 같은 로딩 함수로 읽어 SOURCE/OUTPUT을 표시했다. 비중립 Shift 곡선의 휜 주파수 궤적을 확인하고 재생/Pause/resume/자연 종료/WAV 저장을 확인했다. 시스템 파일 선택창 검증과 사람의 청감 평가는 이번 범위에서 수행하지 않았다.

## Oscillator Curve Lab에서 참고한 부분

검토 대상은 `OscillatorCurveLab`이다. 다른 복사본까지 동일하다고 가정하지 않는다. 로그 주파수 표시, 기본 OFF인 관찰 기능, 곡선 중심의 UI를 참고했다. 해당 프로젝트에는 수정하지 않았다.

## Oscillator 쪽 개선 브리핑 — 코드 검토 결과

1. **P2: FFT Preview와 실제 출력의 계산 경로를 맞추기.** `src/app.js:543–565`는 각 열에서 곡선을 한 번 평가하고, `absoluteTime * voice.frequency`로 위상을 다시 만든다. 반면 `src/oscillator-worklet.js:180–188`은 누적 위상을 사용한다. 일정한 소리의 대략적인 주파수 구조는 보여줄 수 있지만 빠른 피치·변조 변화의 창 내부 움직임과 위상 이력은 실제 출력과 달라질 수 있다. 실제 렌더 샘플을 분석하거나 현재 화면을 설정 기반 예상도라고 명시하는 것을 권한다. 실제 청감 버그를 입증한 결과는 아니다.
2. **P2: 주파수 그림과 활성 파라미터의 축 분리.** `src/app.js:472–489`는 FFT 그림을 곡선 배경에 놓고, `src/app.js:709–738`은 활성 곡선에 따라 세로축을 Strength/Depth/dB/oct 등으로 바꾼다. 스펙트럼은 주파수 좌표인데 표시 축은 다른 단위가 되어 읽기 어렵다. 별도 관찰 패널 또는 항상 고정된 두 번째 Hz 축이 적절하다.
3. **P2: 비교용 밝기 기준 제공.** `src/app.js:587–593`에서 이미지 자체의 peak로 정규화하고 상대 바닥값을 적용한다. 낮은 레벨의 출력도 밝게 보일 수 있어 다른 설정 사이 레벨 비교가 어렵다. 고정 dBFS와 범례를 제공하거나 상대 밝기임을 명시하는 것이 좋다.
4. **P3: 분석을 Worker로 이동.** `src/app.js:509–512`의 타이머는 계산 시작만 지연하며 `buildSonogram` 자체는 UI thread에서 동기 실행한다. 180열 × 2048샘플 × voice 수의 계산이 편집 응답을 늦출 가능성이 있다. 실제 지연 시간은 이번에 측정하지 않았으므로 성능 위험으로만 분류한다.

우선순위 제안: 출력 계산 경로 일치 → 축 분리 → 밝기 기준 → Worker 처리. 오실레이터 수정은 별도 승인 범위로 남겼다. Harmonicity와 Freeze는 이번에도 추가하지 않았다.
