# Phase 6 — Spectral Blur와 Stretch 표기 정리

2026-09-27. 사용자가 승인한 범위: Stretch를 배속으로 오해하지 않도록 표기를 수정하고, 시간 방향의 spectral smoothing을 별도 Blur 곡선으로 구현한다.

## 사용자에게 보이는 동작

- Stretch의 축·노드 tooltip·readout에서 ×를 제거했다. 안내는 `Compress ↔ Expand frequency spacing · 1 = original · Duration unchanged`이다. 버튼 설명에 1 kHz 중심과 재생 속도 유지도 명시했다.
- Spectral Blur는 독립적인 금색 곡선, 범위 0–100%, 기본 0%이다. 노드 추가/이동/삭제, Clear Current, Reset All, 실시간 변경과 WAV 저장을 기존 방식으로 공유한다.
- Blur는 주파수 bin을 이동시키거나 고역을 깎지 않는다. 이전 프레임의 성분 크기를 시간 방향으로 남겨 음색 변화와 어택을 완만하게 한다. Stretch와 구별되는 목표는 지속음의 주파수 유지, 교대하는 두 음의 시간적 겹침이다.
- 처리 순서: Stretch → Blur → Shift. 세 곡선은 함께 적용한다. 화면에는 선택한 곡선만 표시한다.
- 원본 길이를 유지한다. Blur 잔향은 파일 끝에서 잘리며, 이 버전에는 tail 연장이나 별도 fade 기능이 없다. Stop/seek는 잔여 상태를 지우고, Pause/resume은 상태를 보존한다.

## 구현

`src/spectral-blur.js`를 추가하고 공통 `spectral-engine.js`에 연결했다. Worklet과 render Worker가 같은 구현을 사용한다. Blur 0은 스펙트럼을 바꾸지 않는 bypass이다. 곡선에는 20ms smoothing을 적용하며, 크기 평활의 시간 상수는 `0.5 × amount²`초이다. 따라서 100%는 500ms 시간 상수이며 고정 지연이나 정확한 잔향 길이를 뜻하지 않는다.

각 bin의 크기에 exponential averaging을 적용한다. 입력이 충분히 남아 있으면 현재 위상을 사용하고, 사라진 성분에는 저장한 위상 진행을 사용한다. 순간 주파수 추정은 크기가 안정된 프레임에서만 갱신하여 음 끝에서의 불안정한 추정을 줄였다. 작은 새 성분의 위상도 초기화하도록 보완해 반대 위상의 스테레오 채널에서 나타난 오차를 해소했다. FFT 2048/hop512 preview, 4096/hop1024 render와 기존 채널별 callback 분산을 유지한다. 모듈 캐시 버전은 전체 그래프에서 함께 갱신했다.

비교 대상으로 [CDP BLUR 공식 문서](https://www.composersdesktop.com/docs/PDF/blur.pdf)의 시간 방향 스펙트럼 평균화와 어택 완화 개념을 확인했다. 이 구현은 CDP의 시작/끝 프레임 보간을 복제한 것이 아니라, 실시간 처리를 위한 인과적 exponential averaging이다.

## 확인한 결과

- 기존 neutral 72 cases, Shift 검사, Stretch 40 tonal cases 및 180초 스트리밍 회귀 통과. Stretch neutral의 Shift 단독 회귀 최대 오차 0.
- Blur 0 원본 대비 최대 오차 1.88e-16.
- 500 Hz와 6 kHz 지속음: 입력 진폭 0.2에 대해 안정 구간 출력 약 0.19976. 저역·고역 모두 같은 정도로 유지되어 단순 Low-pass와 구별됨을 확인했다.
- 750 Hz 짧은 소리: 초기 진폭 약 0.069–0.072로 완화되고, 원본이 무음인 구간에도 약 0.091–0.095의 같은 주파수 성분이 남았다.
- 500→1500 Hz 교대: 이전 성분 약 0.091–0.096과 새 성분 약 0.114–0.116이 함께 존재했다. 두 FFT 크기에서 확인했다.
- 반대 위상 스테레오의 채널 비율 최대 오차 1.46e-11. 짧은 입력, 잘못된 곡선 거부, seek 후 새 엔진과 동일한 상태 복원 검사 통과.
- 세 효과를 함께 적용한 180초 스테레오 스트리밍 연산 약 4.59초, peak 0.10533 이하, 모든 샘플 finite. 실제 180초 장치 재생 검사는 아니다.
- 브라우저의 실제 AudioWorklet/OfflineAudioContext 및 Worker WAV: Blur 0/50/100% × 단독/Stretch+Shift 조합 총 6 cases 통과. 144,000 frames, 48 kHz/24-bit, stereo ratio 오차 5.97e-8 이하. 수치용 wrapper는 시작 준비를 미리 실행한다.
- 실제 AudioContext 세 효과 8초 검사: 3,008 callbacks, 총 처리 779ms, 최대 2ms, 2.667ms 기준 초과 0회, 참조 출력과 최대 오차 0. Date.now 1ms 해상도이며 9.7375%라는 처리 시간 비율은 OS CPU 사용률이 아니다. 장치 underrun은 측정하지 않는다.
- UI: Stretch 설명과 × 제거, Blur 축/색상, 곡선 전환 시 독립 노드 유지, 노드 이동/삭제 확인.
- 실제 cello.wav fixture를 동일한 앱 로딩 함수로 디코딩했다. Blur 편집, Play/Pause/resume/Stop, 자연 종료와 WAV 다운로드를 확인했다. 결과: mono 49,732 frames, 48 kHz/24-bit, 149,240 bytes. 파일 선택창 자체는 검증하지 않았다.
- JavaScript 17개 구문 검사 통과. 로컬 미리보기 HTTP 200.

수치 기록: `blur-results.json`, `blur-stress-results.json`, `blur-browser-results.json`. 실행: `npm test`, `tests/browser-blur.html`, `tests/realtime.html?stretch=1&shift=1&blur=1`, `tests/fixture.html`.

## 남은 한계

사람의 청감 평가는 수행하지 않았다. 복잡한 음성·환경음·급격한 피치 변화에서는 위상 진행 때문에 금속성이나 흔들림이 생길 수 있다. 고정 주파수 및 교대음 검사 통과를 모든 음원의 완벽한 피치 보존으로 해석하면 안 된다. Preview/render는 FFT 크기가 달라 비중립 결과가 조금 다르다. 큰 Blur는 초기 레벨을 낮추고 파일 끝에서 꼬리를 자른다. 자동 limiter/normalization은 없으며 seek나 tail 절단에서 click이 생길 수 있다. Harmonicity, Freeze, spectrogram은 아직 구현하지 않았다.
