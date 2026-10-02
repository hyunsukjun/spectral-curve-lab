# Phase 7–8 — Harmonicity와 Spectral Freeze 첫 구현

2026-10-02. 사용자 지시에 따라 두 독립 곡선을 기존 세 효과와 같은 Curve Editor, Preview, WAV Render, SOURCE/OUTPUT 비교 경로에 추가했다. 기존 `shift`/`stretch`/`blur` ID·범위·기본값을 유지했다. 처리 순서는 Stretch → Harmonicity → Blur → Freeze → Shift다.

## 무엇을 구현했고 왜 이 방식인가

- Harmonicity는 중립 0%에서 정확히 bypass한다. 음수는 프레임의 저역 유의미 peak로 추정한 기준음의 정수배 쪽으로 각 peak 영역을 당기고, 양수는 기준음에 대한 주파수 비율을 최대 지수 1.12로 확장한다. Stretch의 peak-region 보간·위상 진행을 공유해 프레임별 위상 재시작을 피한다. 기준음은 70–1200Hz, 최대 peak의 16% 이상인 가장 낮은 후보에서 찾고 프레임마다 0.2로 추적한다. **단일음에 맞춘 첫 추정**이며 다성음에서 기준음 선택·음색 품질은 UNKNOWN.
- Freeze는 곡선이 2%를 넘을 때 현재 스펙트럼의 크기와 위상 진행을 포착하고, 100%에서 포착 상태만 합성한다. 중간값은 현재 프레임과 포착 상태의 혼합이다. 20ms 제어 평활로 진입/해제를 완화한다. Pause/Resume은 포착을 유지하며 Stop/Seek는 초기화해 이동 전 음이 남지 않게 한다. 재생 시계와 WAV 길이는 그대로 진행된다. 포착 음색·과도음·전환 click의 실제 청감은 UNKNOWN.
- 두 곡선 모두 정규화된 `{x,y}` 점과 기존 smoothstep 편집 계약을 사용한다. 모드 버튼은 편집할 한 곡선만 바꾸며 다섯 효과의 처리 상태는 함께 유지된다. Clear Current는 활성 곡선만, Reset All은 다섯 곡선을 복원한다.

## 검증 범위

- `tests/harmonicity-freeze.mjs`: FFT 2048/4096에서 다섯 효과 neutral 최대 오차 약 `1.5e−16`, 400/900Hz 입력의 화성화에서 약 797Hz 성분 `0.11` 이상 및 원래 900Hz 성분 감소, 비화성화의 원래 성분 감소, Freeze 중 이전 400Hz 유지/900Hz 억제, 해제 뒤 900Hz 복귀, finite 출력. 3초 스테레오 조합에서 peak `0.213` 미만, seek 후 새 엔진과 동일 블록, 잘못된 곡선 값 거부.
- 기존 `demo-sources`, `neutral`, `shift`, `stretch`, `blur`, `spectrogram`, `transport` 수치 시험 통과. 기존 180초 스트리밍 stress 검사를 포함하지만 실제 오디오 장치 underrun이나 구형 컴퓨터 성능을 증명하지 않는다.
- 로컬 브라우저: 다섯 모드 표시, Harmonicity/Freeze 점 추가 및 모드 전환 후 점 유지, Clear Current, Reset 취소/확인, 기본 Harmonic notes 재생·L/R 미터·Stop, 8초 2채널 48kHz/24-bit WAV, 실제 `cello.wav` 로드·재생·미터·1.04초 1채널 48kHz/24-bit WAV, SOURCE/OUTPUT 갱신, 760px/520px 좁은 창과 넓은 창의 겹침 없음, console error 없음.

## 미완료 판단

이는 DSP 기능 구현과 제한된 진단 검증이다. 사람의 A/B 청취, 실제 다성 음악·음성·타악, 극단적 조합에서의 음질·click·peak·CPU, Preview와 Render의 청감 일치, 장시간 재생은 아직 승인되지 않았다. 현재 수치를 sweet spot이나 standalone 최종 알고리즘으로 고정하지 않는다. 향후 이식 시 입력 파일·곡선·출력 경로·청취 환경·채택 이유를 [Reference Sound Set](REFERENCE_SOUND_SET.md)과 [청취 판단 기록](LISTENING_DECISIONS.md)에 남긴다.
