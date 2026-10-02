# Signal Chain 순서와 DSP 검토 — 2026-10-03

## 문제와 결정

초기 모듈 화면은 다섯 효과를 모두 On으로 시작했고 하단 체인과 DSP 순서는 고정이었다. 다음 단계에서 네 FFT 효과만 활성화 순서로 처리하고 Shift를 마지막에 고정했다. 이때 활성화 순서 120가지를 검사했지만 실제 다섯 효과의 처리 순서는 120가지가 아니었다. 예를 들어 Shift→Freeze→Blur를 눌러도 Freeze→Blur→Shift로 재배치됐다. 이는 사용자가 기대한 순차 연결과 달랐다.

현재는 다섯 효과 모두 Off·선택 커브 없음으로 시작하며, **다섯 효과 모두 켠 순서가 실제 Input→Output 순서**다. Off 후 다시 On하면 이전 자리를 복원하지 않고 맨 뒤에 추가한다. 체인 블록 클릭은 커브 편집 대상만 바꾸며 드래그 재배열은 아직 제공하지 않는다.

## 실제 신호 경로

Shift가 마지막이거나 Off이면 기존 단일 pass다: `decoded PCM → Hann STFT → 활성 FFT 효과(On 순서) → Shift analytic spectrum → inverse FFT/Hann² WOLA → 연속 oscillator → 출력`. 기존 Shift의 음색·위상 경로를 그대로 사용한다.

Shift 뒤에 활성 효과가 하나라도 있으면 두 pass다: `decoded PCM → 첫 STFT(Shift 앞의 효과) → analytic Shift/WOLA/연속 oscillator → 두 번째 STFT(Shift 뒤의 효과) → 출력`. 두 번째 pass는 Shift가 **실제로 만든 시간영역 신호**를 다시 분석하므로 뒤쪽 효과가 Shift 결과에 작용한다. Shift를 단순한 FFT bin 이동으로 바꾸지 않았다. 첫 pass의 출력을 전체 파일로 저장하지 않고 FFT 크기의 두 배인 채널별 순환 버퍼로 두 번째 pass에 공급한다. 추가 FFT·lookahead·CPU 비용이 발생하지만 출력 샘플 수와 커브 시간축은 유지한다.

- Stretch는 peak-region의 주파수 간격을 변형한다. Harmonicity는 입력 peak로 기준음을 추정하므로 둘의 순서를 바꾸면 기준음과 결과가 달라질 수 있다.
- Blur는 각 bin의 시간 변화량을 평활하고 Freeze는 그 시점의 복소 스펙트럼을 포착한다. Shift 뒤에 두면 이동된 신호를 대상으로 작동한다.
- Off 커브는 보존하고 DSP에는 중립 두 점을 전달한다. Off FFT processor는 첫 pass의 중립 경로에 남아 있으므로 Off가 CPU 최적화라는 뜻은 아니다.
- Preview Worklet은 순서·커브를 프레임 경계에서 반영하고, WAV Worker와 스펙트로그램 Worker는 시작 시 전달된 동일 순서를 사용한다. Shift가 두 pass의 경계를 가로질러 이동하면 현재 출력 위치에서 overlap·phase·효과 상태를 다시 준비한다.

## 검증과 한계

`tests/module-routing.mjs`는 120가지 활성화 순서 및 각 기능의 Off/On 재진입 위치가 그대로 체인이 되는지 검사한다. `tests/chain-order.mjs`는 FFT 2048/4096 모두에서 Shift 앞/뒤 배치의 출력 차이, Shift 중간의 neutral 복원, seek 시 두 pass 초기화, Preview Worklet의 순서 변경, 30초 스테레오 유한 출력을 검사한다. Shift 뒤에 효과가 있는 neutral 두 pass의 최대 오차는 합성 신호에서 약 1.5×10⁻¹⁶이었다. 단일 pass인 Shift-last 경로는 유지한다.

브라우저에서는 Shift→Freeze→Blur→Stretch→Harmonicity를 켠 순서대로 체인에 표시하고 Preview 재생·L/R 미터와 WAV 렌더 완료를 확인했다. 이것은 순서 구현과 기본 실행 검증이지 **청감 승인**은 아니다. 두 번째 pass의 실제 악기·음성·타악에서 어택, phase 질감, 레벨, click과 장치 underrun은 아직 확인해야 한다. 실시간 순서 변경 시 재준비에 따른 click 위험, Preview(2048)와 Render(4096)의 비중립 파형 차이, 장치별 CPU 여유 역시 **UNKNOWN**이다.

Standalone에서는 커브, enabled, 활성 순서 배열을 분리해 보존한다. Native 엔진에도 Shift 앞/뒤의 pass 경계, 순환 버퍼, seek와 실시간 순서 변경 시 상태 초기화 정책을 명시하고 단일 pass Shift-last를 기준음으로 비교해야 한다.
