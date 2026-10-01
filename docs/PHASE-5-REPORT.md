# Phase 5 — Spectral Stretch

2026-09-27. 이번 범위는 Stretch 추가와 Shift 회귀 검증이다. Blur, Harmonicity, Freeze, spectrogram은 포함하지 않는다.

## 동작과 설계

- Stretch 범위 0.5–2.0×, 기본 1.0. 1 kHz를 고정 중심으로 주파수 간격을 압축하거나 펼친다. 식은 `f′ = 1000 × (f / 1000)^stretch`이다. 시간 길이는 변하지 않는다.
- 500/1000/2000 Hz는 Stretch 2에서 250/1000/4000 Hz가 된다. Shift +200 Hz까지 적용하면 450/1200/4200 Hz이다.
- Shift와 Stretch 곡선은 독립적으로 보관한다. 활성 곡선 하나를 표시하며 기존 Select/Pen/Eraser, 끝점 보호, Clear Current/Reset All을 유지한다. Stretch의 세로축은 로그 배율이다.
- 처리 순서는 **Stretch → Shift**. `spectral-engine.js`에서 한 STFT 분석·합성 경로를 공유한다. Preview FFT 2048/hop 512, render FFT 4096/hop 1024이다.
- `spectral-stretch.js`는 국소 peak의 순간 주파수를 추정하고, 인접 영역의 상대 위상을 유지하며 주파수를 이동한다. 분수 bin은 4점 cubic Lagrange 보간으로 분배한다. 범위 밖 성분은 버린다. 20ms smoothing과 neutral 인접 영역의 혼합으로 전환한다.
- 접근의 참고 문헌은 [Laroche & Dolson, New Phase-Vocoder Techniques for Pitch-Shifting, Harmonizing and Other Exotic Effects](https://www.ee.columbia.edu/~dpwe/papers/LaroD99-pvoc.pdf)이다. 이 구현의 고정 pivot 곡선과 간소화된 peak 처리는 별도 설계이며, 논문 전체 알고리즘을 재현했다고 주장하지 않는다.
- Stretch 1에서는 기존 스펙트럼을 그대로 넘긴다. Shift 단독 결과와 최대 오차 0을 확인했다.

## 실시간 보완

스테레오의 프레임 준비를 채널별로 나누어 128-sample callback에 분산했다. 재생 중 곡선 수정은 프레임 경계에서 반영하여 양 채널이 같은 곡선을 사용한다. 48 kHz에서 시작/seek 준비 무음은 약 18.7ms(7 callbacks)이며 장치 자체 지연은 별도다. Pause/resume은 준비 과정을 반복하지 않는다. 일시정지 중 편집은 해당 위치에서 다시 준비한다.

첫 실시간 조합 검사에서 최대 3ms/기준 초과 1회가 관측되어 분산 처리를 적용했다. 최종 8초 검사에서는 3,008 calls, 총 710ms, 최대 2ms, 2.667ms 기준 초과 0회, 참조 신호 최대 오차 0이었다. 처리 시간 합/음원 길이는 8.875%였다. 이는 1ms 해상도의 Date.now 측정이며 OS CPU 사용률이나 장치 underrun 측정이 아니다.

의존 모듈 캐시가 이전 버전과 섞여 초기화 오류를 일으키는 경우를 확인하여 전체 모듈 URL의 버전을 함께 갱신했다.

## 검증 결과

- Neutral 72 cases 통과. 최대 오차 7.51e-17. 180초 스트리밍 및 기존 worklet/WAV 검사 통과.
- Stretch neutral 최대 오차 6.58e-17, 기존 Shift 단독 회귀 최대 오차 0.
- 두 FFT 크기, 다섯 Stretch 값, 네 입력 주파수의 40 tonal cases 통과. 입력 진폭 0.3에 대해 출력 0.29105–0.30000. 조합 mapping, stereo 비율, 극단 곡선, 짧은 입력, seek/수정, Nyquist 초과 제거 검사 통과.
- Stretch+Shift 180초 스테레오 스트리밍: 약 3.305초 연산, 최대 절댓값 0.32014. 실시간 재생 시간이나 청감 검사가 아니다.
- 실제 browser AudioWorklet/OfflineAudioContext와 render Worker: Stretch 0.5/1/2 × Shift 0/+200의 6조합 통과. 각 96,000 frames, 48 kHz/24-bit WAV, stereo 비율 오차 5.97e-8 이하. 이 수치용 worklet wrapper는 시작 준비를 미리 수행하므로 transport 지연은 별도 실시간 검사로 확인했다.
- 기존 Shift 브라우저 회귀: 입력 44.1/48/96 kHz × Shift 0/±200의 WAV 9 cases 및 실제 Worklet +200 mapping 통과.
- UI: 두 곡선의 독립 노드 유지, Clear Current의 선택 곡선 한정 초기화, Reset All, 재생/일시정지 및 재개/Stop 확인.
- 실제 cello.wav fixture를 앱과 같은 로딩 함수로 읽고 두 비중립 곡선을 적용했다. 재생 위치·파라미터 변화와 자연 종료를 확인했다. 다운로드 파일은 149,240 bytes, mono, 49,732 frames, 48 kHz/24-bit이었다. 파일 선택창 자체는 이번 검증에서 사용하지 않았다.

수치 기록: `stretch-results.json`, `stretch-stress-results.json`, `browser-stretch-results.json`, `stretch-realtime-results.json`. 재실행: `npm test`, `tests/browser-stretch.html`, `tests/browser-shift.html`, `tests/realtime.html?stretch=1&shift=1`.

## 한계와 다음 검증

보간 때문에 검사한 단음에서도 최대 약 3% 진폭 감소가 있다. 서로 가까운 성분, 강한 어택, 음성·환경음처럼 peak가 불안정한 신호는 변조·거친 음색이 생길 수 있다. Preview/render는 FFT 크기가 달라 비중립 출력이 동일하지 않다. 사람의 청감 승인, 다양한 긴 실제 음원, 장치 출력의 끊김 검증은 남아 있다. 임의 seek의 click 및 출력 clipping에 대한 기존 제한도 유지된다.

기존 Curve Lab 원본에는 이번 작업의 편집을 적용하지 않았다. 다만 초기 reference hash 39개 중 33개만 현재 일치하고 SpaceCurveLab의 6개는 달라져 있다. 별도 작업 가능성이 있어 수정하거나 이전 버전으로 되돌리지 않았다. 따라서 전체 원본이 초기 상태와 동일하다고 보고하지 않는다.
