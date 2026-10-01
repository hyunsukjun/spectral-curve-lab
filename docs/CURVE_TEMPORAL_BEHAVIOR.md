# 커브의 시간 해상도와 소리 — 2026-09-30 구현 분석

이 문서는 커브 제스처가 실제 파라미터로 바뀌는 경로를 기록한다. 아래 시간은 [현재 코드](../src/spectral-core.js)의 48kHz 설정에서 계산한 값이며 **청감으로 승인한 경계값은 아니다**. 제품이 보존할 것은 정규화된 시간·값과 의미이고, FFT/평활의 수치를 변경하려면 Preview/WAV 음질을 다시 비교해야 한다.

## 공통 데이터·제스처

- 점 `{x,y}`: `x=0…1`은 소스 전체 시간, `y=0…1`은 각 파라미터의 정규화 값이다. 두 점 사이에서 `t=(x−x₀)/(x₁−x₀)`, `eased=3t²−2t³`, `y=y₀+(y₁−y₀)×eased`. [curve-editor.js](../src/curve-editor.js). 각 점에서 기울기가 0으로 닿지만, **점 사이 시간 폭은 제한되지 않는다**. 매우 가까운 점은 짧은 구간에 큰 값을 몰아넣을 수 있다.
- Canvas는 같은 정규화 점을 시각화하며 픽셀 간격 3으로 그린다. 이 간격은 **그림의 해상도**일 뿐 오디오 automation 해상도가 아니다. 제어점 hit-test 10 CSS px, 좌표 clamp 및 끝점 보호는 웹 편집 구현이다. [app.js](../src/app.js).
- 완만한 곡선은 여러 프레임에 걸쳐 목표값이 변한다. 매우 급격한 곡선은 각 processor의 샘플/프레임 평가와 평활에 의해 지연·완화되거나, 분석 창 안에서 양쪽 소리가 겹칠 수 있다. 이는 구현 구조에서 예상되는 결과이며, 사용자가 들은 정도와 허용 기준은 **UNKNOWN**이다.

| 경로 | FFT / hop @48kHz | 창 길이 / 새 프레임 간격 | 파라미터 평가·적용 |
| --- | --- | --- | --- |
| AudioWorklet Preview | 2048 / 512 samples | 약 42.67ms / 10.67ms | 재생 중 곡선 메시지를 양 채널에 같은 프레임 경계에서 적용. 출력은 128-sample audio callback으로 전달 |
| Worker WAV Render | 4096 / 1024 samples | 약 85.33ms / 21.33ms | 렌더 시작 시 세 곡선을 복사해 전체 파일을 계산. 실시간 편집 반영 없음 |

창 길이는 단순한 지연 또는 정확한 사건 분해능이라고 해석하지 않는다. 그러나 빠른 사건과 커브 변화를 분석·합성할 때 영향을 주는 핵심 조건이며, 두 경로의 비중립 결과가 sample-exact하지 않은 이유 중 하나다. 수치와 장치 지연의 구분은 [Phase 5](PHASE-5-REPORT.md) 및 [DSP 계약](DSP_BEHAVIOR.md)을 따른다.

## 파라미터별 시간 동작

- **Shift:** 곡선 목표는 출력 샘플마다 읽고 `1−exp(−1/(rate×0.01))`로 약 10ms 평활한다. oscillator 위상은 연속 누적된다. 다만 DC/Nyquist 보호 마스크는 STFT 프레임 중심의 **목표 Shift**로 계산된다. 따라서 급격한 커브에서 마스크의 프레임 단위 변화와 oscillator의 샘플 단위 변화가 동일한 궤적이라고 가정하면 안 된다. 0Hz 복귀의 wet 전환도 10ms다. [spectral-shift.js](../src/spectral-shift.js).
- **Stretch:** 각 STFT 프레임 중심에서 목표를 읽고 `1−exp(−hop/(rate×0.02))`로 20ms 평활한다. 중립 1 근처에서는 `min(1,|amount−1|/0.02)`로 원 스펙트럼과 처리 스펙트럼을 섞는다. 가까운 점에서 목표가 빠르게 바뀌어도 출력은 프레임별 평가·peak 추적·보간을 통과한다. [spectral-stretch.js](../src/spectral-stretch.js).
- **Blur:** 프레임 중심 목표를 20ms 평활한 뒤 매 bin의 크기에 `τ=0.5×amount²`초의 시간 평활을 적용한다. 곡선을 급히 0으로 내려도 평활된 amount가 0 근처(`1e−7` 미만)에 도달해야 bypass/reset된다. 파일 끝에서는 남은 성분을 위한 시간을 연장하지 않는다. 지속시간이 긴 번짐은 제스처 종료와 즉시 같은 소리를 뜻하지 않는다. [spectral-blur.js](../src/spectral-blur.js).

48kHz에서 Stretch/Blur의 프레임별 제어 계수는 Preview 약 **0.413**, Render 약 **0.656**이다. 두 값은 모두 같은 명목상 20ms 상수를 구현하지만 평가 간격이 달라 빠른 궤적의 결과까지 같다고 보장하지 않는다. Shift의 화면 readout은 **곡선 목표값**이고 내부 평활값이 아니다. [Phase 4의 표시 설명](PHASE-4-REPORT.md).

## 앞으로 검증할 제스처

같은 [Reference Sound Set](REFERENCE_SOUND_SET.md)에서 (1) 넓은 완만한 램프, (2) 가까운 두 점의 급변, (3) 중립을 지나는 왕복, (4) 어택과 겹치는 변화, (5) 재생 중 Pen/drag/Eraser, (6) seek 직후를 별도로 듣고 Preview/WAV를 비교한다. transient smear, click, level, peak 이동, stereo, CPU를 기록한다. 현재 어떤 최소 점 간격이나 권장 커브 속도도 음악적으로 승인되지 않았다. Native UI가 픽셀 크기와 무관하게 같은 궤적을 만들더라도, 그 경계값을 임의로 정하지 않는다.
