# Spectral 파라미터 계약 v1

2026-10-02 현재 구현 기준. 영구 preset/automation API는 없지만 `shift`, `stretch`, `blur`, `harmonicity`, `freeze`를 제품 ID로 기록한다. 아래 숫자는 코드와 기존 수치 검사로 확인한 값이다. **청감상 useful range·sweet spot·최종 승인 매핑은 UNKNOWN**이며, 수치 검사를 청감 승인으로 해석하지 않는다. 각 곡선은 `{x,y}` 점 배열로, `x∈[0,1]`은 소스 전체 길이의 정규화 시간, `y∈[0,1]`은 정규화 값이다. `valueAt`의 구간 보간은 `3t²−2t³`; 양 끝점은 `x=0,1`에 고정되고 삭제되지 않는다. 중간 점의 `x`는 이웃을 넘어가지 않는다. [curve-editor.js](../src/curve-editor.js), [app.js](../src/app.js).

| ID / 표시명 | 단위·타입 | 범위 / 기본 | 정규화 매핑 / 표시 | 평활·Preview·Render |
| --- | --- | --- | --- | --- |
| `shift` / Spectral Shift | Hz, 연속 | −2000…+2000 / 0 | `Hz=(y−0.5)×4000`; `y=.5` 중립. 눈금과 노드/현재값은 Hz | 샘플 기반 10ms; 양쪽 모두 같은 엔진, Preview 2048/hop512, Render 4096/hop1024 |
| `stretch` / Spectral Stretch | 무차원, 연속 | 0.5…2.0 / 1.0 | `amount=2^(2y−1)`; `y=.5` 중립. 로그 축, 3자리 표시; 재생 배속 `×` 아님 | 프레임 기반 20ms; 같은 매핑/엔진, 다른 FFT 크기 |
| `blur` / Spectral Blur | %, 연속 | 0…100 / 0 | `amount=y`, 표시 `round(100y)%`; `y=0` 중립 | 프레임 기반 20ms 제어 평활; 시간 평활 상수 `0.5×amount²`초, 100%=500ms; 다른 FFT 크기 |
| `harmonicity` / Harmonicity | %, 연속 | −100…+100 / 0 | `amount=2y−1`; `y=.5` 중립. 음수=화성 격자 접근, 양수=비화성 확장 | 프레임 기반 20ms; 단일음 중심 peak 기준음 추정. Preview/Render 동일 구현·서로 다른 FFT 크기 |
| `freeze` / Spectral Freeze | %, 연속 | 0…100 / 0 | `amount=y`; `y=0` 꺼짐. 0.02 초과에서 spectral state 포착, 100%=완전 hold | 프레임 기반 20ms wet 평활; 0.02 이하로 복귀하면 포착 해제. seek/stop에서 상태 reset |

현재 UI는 연속 점 편집이며 고정 step/양자화 없음. readout은 Shift 0.1 Hz, Stretch 소수 3자리, 나머지 정수 %로 표시할 뿐 DSP 해상도를 제한하지 않는다. 커브는 파일 시간에 묶이며 출력 duration은 변하지 않는다. 별도의 preset 저장, host automation, 개별 numeric entry는 **미구현**이다. Preview 재생 중 새 곡선은 프레임 경계에 반영되며, Render는 시작할 때 다섯 곡선을 복사한다. 파일을 바꿔도 메모리의 곡선은 유지된다(현재 `loadAudioFile`은 `curves`를 초기화하지 않음); 이 정책의 장기 제품 승인 여부는 UNKNOWN.

## `shift` fine-tuning

- 목적: 각 양의 주파수 성분에 같은 Hz를 가해 배음 간격을 유지하면서 비정상적인 음색/피치를 만든다. 예: 440/880 Hz +200 → 640/1080 Hz. 비율 피치 변환이 아니다.
- 전환: 값의 10ms 평활, 0 Hz 근처 wet 전환; 경계 DC/Nyquist에 약 100 Hz soft guard, 50 Hz 기준의 중립 인접 blend. 극단 ±2000 Hz에서는 경계 성분이 사라질 수 있다. 이는 안전한 bin wrap 회피를 위한 현 구현이다.
- 수치 근거: [Phase 4 보고서](PHASE-4-REPORT.md)의 neutral, 경계, 44.1/48/96 kHz 검사. **Useful range / sweet spot / 음악적 캐릭터 / 청감 승인값: UNKNOWN.** 음성·지속음·경계 부근 청취가 필요하다. 사람 청감 및 모니터 환경: UNKNOWN.
- 소스: [spectral-shift.js](../src/spectral-shift.js); 이관 시 oscillator phase 연속성과 soft guard를 포함해 재현한다.

## `stretch` fine-tuning

- 목적: 1 kHz 고정점을 기준으로 주파수 간격을 압축/확장하되 재생 속도·길이는 유지한다. `f′=1000×(f/1000)^amount`. 500/1000/2000 Hz, amount2 → 250/1000/4000 Hz.
- 전환: 20ms 제어 평활, 중립 근처 ±0.02 범위 wet blend. peak-region 이동, 위상 진행과 4-tap cubic Lagrange 보간. Nyquist 밖은 버린다. 단음 검사에서는 보간에 의한 최대 약 3% 진폭 감소가 기존 보고서에 있다.
- 수치 근거: [Phase 5 보고서](PHASE-5-REPORT.md). **Useful range / sweet spot / 빠른 어택·복잡 음원의 청감 / 승인 매핑: UNKNOWN.** 1 kHz pivot을 변경할 필요가 있는지 청감 검토는 미완료.
- 소스: [spectral-stretch.js](../src/spectral-stretch.js); native에선 단순 playback rate로 구현하면 안 된다.

## `blur` fine-tuning

- 목적: 위치를 옮기지 않고 각 주파수 bin의 크기 변화를 시간 방향으로 완만하게 한다. 어택이 누그러지고 연속 사건의 성분이 겹친다. 주파수 축 low-pass가 아니다.
- 전환: amount 제어 20ms 평활; `retain=exp(−hop/(rate×0.5×amount²))`; 0은 bypass. 100%의 500ms는 고정 tail 길이가 아닌 지수 시간 상수. 파일 끝에서 꼬리가 잘린다.
- 수치 근거: [Phase 6 보고서](PHASE-6-REPORT.md)의 500 Hz/6 kHz 지속음, 짧은 어택, 교대음 및 stereo 검사. **Useful range / sweet spot / 금속성·위상 흔들림의 실제 청감 정도 / 승인 매핑: UNKNOWN.** 모니터 환경: UNKNOWN.
- 소스: [spectral-blur.js](../src/spectral-blur.js); native에서도 per-bin 상태 및 seek reset을 보존한다.

다섯 파라미터는 독립 곡선이다. 각 효과의 enabled 기본값은 `false`이고 초기 체인은 빈 배열이다. 다섯 효과 모두 On으로 켠 순서대로 처리한다. Shift 뒤에 효과가 있으면 Shift 합성 결과를 다시 STFT 분석해 뒤쪽 효과를 적용한다. Off일 때 저장된 커브 대신 중립 두 점(Shift/Stretch/Harmonicity y=.5, Blur/Freeze y=0)을 Preview/Render에 전달한다. 커브, enabled, 체인 순서는 별도의 세션 메모리 상태다. 순서를 바꾸면 같은 수치여도 소리가 달라진다. 값·매핑 변경 시 이전 값, 이유, 입력 자료, 청감 결과/승인 상태, 날짜를 본 문서와 [DECISIONS.md](DECISIONS.md)에 함께 남긴다.


## `harmonicity` / `freeze` 초기 DSP 판단 (2026-10-02)

- Harmonicity는 소스의 강한 peak 중 70–1200 Hz에서 가장 낮은 유의미한 성분(프레임 최대값의 16% 이상)을 기준음 후보로 보고 프레임마다 0.2 비율로 갱신한다. 음수는 가장 가까운 정수배 주파수로 당기고, 양수는 기준음에 대한 비율을 최대 지수 1.12로 펼친다. 같은 peak-region/위상 보정/보간을 Stretch와 공유한다. 이는 단일음 진단에 맞춘 **임시 추정 방식**이며 다성음·복잡한 소스의 청감 성공은 UNKNOWN. 0은 처리 bypass이며 주파수를 바꾸지 않는다.
- Freeze는 2%를 넘는 곡선에서 현재 스펙트럼의 크기와 프레임별 위상 진행을 포착한다. 100%는 포착 상태만, 중간값은 현재 상태와 포착 상태의 혼합이다. 20ms wet 제어 평활과 프레임 간 위상 누적으로 시작/종료 불연속을 완화한다. 2% 이하로 돌아온 뒤 wet이 충분히 내려가면 포착을 해제한다. seek/stop은 포착 상태를 지우고, pause/resume은 유지한다. 출력 길이는 늘리지 않는다. 포착 시점·어택·다성음 음질은 UNKNOWN.
- 두 기능의 수치·UI·브라우저 검증은 청감 승인과 별개다. 실제 음성/악기/타악·급격한 제스처에서 useful range, click, level, CPU를 A/B로 기록해야 한다.

## 2026-09-29 사용자 청감 피드백

사용자는 현재 Spectral Curve Lab의 소리가 다른 Curve Lab보다 “너무 싸구려스럽고”, 음향적 매력을 찾기 어렵다고 평가했다. **입력 음원·세 곡선의 값/조합·Preview/WAV 중 어느 경로·청취 환경은 아직 UNKNOWN**이다. 따라서 세 파라미터 각각의 불합격 판정이나 새로운 sweet spot으로 일반화하지 않는다. 제품 수준의 청감 품질 문제로 기록하고, 중립 출력 → 세 효과 단독 → 조합, 기본 백색소음 예제 → 실제 악기/음성/타악, Preview → Render 순서의 A/B로 원인을 분리한다. 상태: **NEEDS MORE TESTING**. 분석과 개선 가설은 [음질 검토](QUALITY-REVIEW-20260929.md).

실제 청취에서 채택·기각한 값은 [청취 판단 기록](LISTENING_DECISIONS.md)에 근거와 함께 남긴다. 급격한 곡선의 프레임 평가·평활과 Preview/Render 시간 차이는 [커브의 시간 동작](CURVE_TEMPORAL_BEHAVIOR.md)에 기록한다.
