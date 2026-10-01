# Spectral DSP 동작 계약

2026-09-29 현재 [실행 엔진](../src/spectral-engine.js)과 [테스트](../tests/) 기준. 원하는 음악적 동작은 세 독립 곡선으로 **주파수 위치 이동(Shift), 1 kHz 중심 간격 변형(Stretch), 시간 방향 잔류(Blur)**를 조합하고 소스 길이를 유지하는 것이다. 사람 청감 승인은 아직 없다. 시간축 평가·평활의 세부 사항은 [커브 시간 동작](CURVE_TEMPORAL_BEHAVIOR.md), 검증 음원의 확보 상태는 [Reference Sound Set](REFERENCE_SOUND_SET.md)을 참조한다.

## 신호 경로

`mono/stereo decoded PCM → Hann STFT → Stretch → per-bin temporal Blur → analytic Shift → inverse FFT/weighted overlap-add → Preview 또는 PCM24 WAV`. FFT는 radix-2, 창은 periodic Hann, hop은 FFT/4, 합성은 Hann² weight로 나눈다. neutral 세 곡선은 입력 복원을 목표로 한다. 입력이 파일 전체로 주어지는 lookahead 방식이며 라이브 마이크 프로세서가 아니다. 무작위성은 기본 8초 noise 예제 생성의 고정 seed에만 있다. [spectral-core.js](../src/spectral-core.js), [app.js](../src/app.js).

| 경로 | 엔진/샘플레이트 | 길이·출력 |
| --- | --- | --- |
| Preview | `AudioWorkletProcessor`, `SpectralEngine(FFT2048, hop512, AudioContext sampleRate)`; 앱은 48 kHz context를 요청 | 출력은 stereo node. mono 파일은 L/R에 같은 소스를 복사. Worklet 뒤 unity gain에서 실제 출력 신호를 L/R analyser로 분기하되 변환하지 않음. 시작/seek 준비 무음 약 18.7ms @48kHz는 기존 브라우저 측정값, 장치 latency 별도 |
| Render | `OfflineAudioContext`로 필요 시 48 kHz resampling 후 `render-worker.js`의 `SpectralEngine(FFT4096, hop1024, 48kHz)` | 소스와 같은 채널 수·프레임 길이, 48 kHz 24-bit PCM RIFF WAV. PCM 쓰기에서 `[-1,1)` 범위를 clamp; limiter/normalization 없음 |
| 비교 화면 | 원본과 Preview 설정(2048/hop512)의 출력 샘플을 Worker에서 분석 | 512 시간열 × 192 로그 주파수 행, 고정 −90…0 dBFS; WAV의 정확한 스펙트럼이 아님 |

두 오디오 경로는 같은 parameter mapping·processor 구현을 공유하나 FFT size, hop, 경계/분수 bin 근사, sample-rate 변환 때문에 **비중립 파형 동일성은 보장되지 않는다**. 기존 검사에서 neutral과 선택된 tone 사례의 일치/가까움은 확인했으나 모든 음원에서의 청감 parity는 UNKNOWN. Render의 `getSettings()` 객체는 현재 비어 있고 실제 처리에는 사용되지 않는다. WAV encoder는 signed 24-bit interleaved PCM이며 RIFF 크기 한계를 검사한다.

하단 미터는 Preview의 최종 Worklet 출력을 관찰한다. `AnalyserNode`(1024 samples, smoothing 0)의 시간영역 샘플에서 peak/RMS를 구하고 표시만 평활한다. peak 0.999 이상은 수동 초기화 전까지 CLIP으로 유지한다. 이는 신호의 gain·limiting·normalization이나 WAV 렌더 경로를 변경하지 않는다. [하단 바 적용 기록](PLAYBACK-BAR-20261001.md).

## 효과와 상태

- **Stretch:** peak의 순간 주파수 및 국소 영역을 `f′=1000×(f/1000)^amount`로 이동한다. phase rotation을 프레임 사이에 누적하고 centered 4-tap cubic Lagrange로 분수 bin을 보간한다. 범위 밖 성분은 버린다. amount는 로그 정규화, 20ms smoothing, 중립 인접 wet blend. 시간 stretch가 아니므로 duration 불변. [spectral-stretch.js](../src/spectral-stretch.js).
- **Blur:** 각 bin의 magnitude를 시간 방향 exponential averaging하고 입력이 약해질 때 위상 진행 상태를 유지한다. `τ=0.5×amount² s`, amount 제어는 20ms smoothing. `amount=0`은 bypass. 주파수 위치 이동이나 고역 저하는 목표가 아니다. 끝에서 tail을 연장하지 않는다. [spectral-blur.js](../src/spectral-blur.js).
- **Shift:** 양의 스펙트럼으로 analytic signal을 만들고, complex overlap-add 뒤 연속 oscillator로 Hz를 가산한다. 곡선 값은 10ms sample smoothing; DC/Nyquist 근처 100Hz soft guard와 중립 인접 blend가 있다. 비율 pitch scaling이 아니다. [spectral-shift.js](../src/spectral-shift.js).
- 각 채널은 독립 스펙트럼/phase state를 사용하고 같은 세 곡선을 받는다. 고정 처리 순서 때문에 합성 결과는 순서 교환에 불변이 아니다. Stop/seek는 overlap·phase·blur 상태를 초기화하며 Pause/resume은 보존한다. 재생 중 곡선 갱신은 프레임 경계에 적용한다.

## 검증 근거와 한계

정확한 수치/환경은 [neutral](PHASE-1-3-REPORT.md), [Shift](PHASE-4-REPORT.md), [Stretch](PHASE-5-REPORT.md), [Blur](PHASE-6-REPORT.md), [안정성](STABILITY-20260929.md), [비교](SPECTROGRAM-REPORT.md)를 참조한다. Stop/seek는 별도 transport fade가 없어 click이 가능하다. Stretch 보간 진폭 손실, Shift 경계 성분 손실, Blur 어택 감소·끝 tail 절단이 알려져 있다. 세 효과를 합치면 peak가 커질 수 있고 WAV clamp가 clipping을 만들 수 있다. 매우 긴 파일의 디코딩/복사/render 메모리 비용, 장치 underrun, 다양한 실제 음원의 청감 결과는 미확정이다. 버그 수정 시 기존 테스트와 실제 파일 lifecycle을 함께 확인한다.
