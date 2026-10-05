# Reference Sound Set — 재현 가능한 음질 검증 기준

상태: **구성 중 / 청감 기준음원 미완성** (2026-09-30). [초기 사양 §20](INITIAL-SPECIFICATION.md)은 sine, harmonic tone, white/pink noise, percussive transient, voice, sustained instrumental, complex field recording을 요구한다. 아래 표는 **현재 확보·검증한 것**과 **아직 필요한 것**을 분리한다. 수치 통과, 브라우저 동작 확인, 사람이 듣고 승인한 소리는 서로 다른 상태다.

| ID / 종류 | 재현 자료 | 확인된 결과와 근거 | 청감 판정 / 빈칸 |
| --- | --- | --- | --- |
| RS-01 단음 sine | [neutral.mjs](../tests/neutral.mjs), [shift.mjs](../tests/shift.mjs), [stretch.mjs](../tests/stretch.mjs)의 코드 생성 신호 | neutral 재구성, Shift 주파수·진폭, Stretch 40 tonal cases를 수치로 검사. [Phase 4](PHASE-4-REPORT.md), [Phase 5](PHASE-5-REPORT.md) | **청감 승인 없음**. 지속음의 금속성·위상 흔들림 기록 필요 |
| RS-02 배음 복합음·교대음 | [shift.mjs](../tests/shift.mjs)의 440/880Hz, [stretch.mjs](../tests/stretch.mjs)의 500/1000/2000Hz, [blur.mjs](../tests/blur.mjs)의 500→1500Hz 합성 신호; 앱의 8초 Harmonic notes | +200Hz Shift는 640/1080Hz, Stretch 2는 250/1000/4000Hz, Blur는 교대 성분의 시간적 겹침을 수치로 확인. 앱 예제는 196/246.94/293.66/220Hz 네 음과 5배음·어택·쉼을 포함하며 [demo-sources.mjs](../tests/demo-sources.mjs)에서 결정성·배음·헤드룸을 검사 | **청감 승인 없음**. 앱 예제는 실제 악기 녹음이 아니며 음악적 매력을 증명하지 않음 |
| RS-03 white noise | [neutral.mjs](../tests/neutral.mjs), [shift.mjs](../tests/shift.mjs)의 생성 신호; 앱 Demo에서 선택 가능한 [8초 Noise intervals](../src/demo-sources.js) | neutral·극단값 finite 및 UI/재생 경로 검사. 짧은 반복 noise burst이므로 음악적 품질의 대표 샘플이 아님. [음질 검토](QUALITY-REVIEW-20260929.md) | **청감 승인 없음**. 앱 예제와 테스트 신호는 생성법이 다름 |
| RS-04 percussive transient·짧은 tone | [neutral.mjs](../tests/neutral.mjs)의 impulse, [blur.mjs](../tests/blur.mjs)의 750Hz 짧은 tone | neutral의 시작/끝 복원 및 Blur의 어택 감소·잔류 성분을 수치로 확인. [Phase 1–3](PHASE-1-3-REPORT.md), [Phase 6](PHASE-6-REPORT.md) | 실제 타악기의 punch, pre/post-echo, click은 **미청취** |
| RS-05 짧은 첼로 | 로컬 [cello.wav 출처](../tests/fixtures/README.md). 현재 파일: mono, 22,050Hz, 16-bit PCM, 22,846 frames ≈1.03610s; SHA-256 `39095595cec44d340c26dbc5d753f309c51d89210bb23145a7111fd5d8a57b3b` | 앱 디코딩·재생·비교·WAV 다운로드 동작을 기존 브라우저 보고서에서 확인. export의 48kHz 49,732 frames는 리샘플 후 길이이며 원본 프레임 수와 다름. [안정성 기록](STABILITY-20260929.md) | **음색 청감 승인 없음**. 파일은 로컬 fixture이며 git 제외; 배포 가능한 기준음원으로 가정하지 않음 |
| RS-06 pink noise | 없음 | 초기 사양에만 존재 | 미검증 |
| RS-07 voice | 없음 | 초기 사양에만 존재 | 미검증. 자음 어택·모음 배음/포먼트 필요 |
| RS-08 긴 sustained instrumental | 없음. RS-05 첼로는 약 1초 | 180초 합성 stress는 장시간 실연음 청취의 대체가 아님 | 미검증. 지속음의 phase/레벨 변화 필요 |
| RS-09 complex field recording | 없음 | 초기 사양에만 존재 | 미검증. 다중 사건·저레벨 배경·스테레오 공간감 필요 |

## 공통 A/B 기록 절차

1. **동일 원본**에서 neutral(Shift 0Hz, Stretch 1, Blur 0%, Harmonicity 0%, Freeze 0%) → 각 효과 단독 → 조합을 비교한다. 실제 곡선 점 `{x,y}`와 소스 시간 구간을 기록한다. 과격한 곡선과 완만한 곡선을 별도로 분류한다.
2. 원본, AudioWorklet Preview, 48kHz/24-bit WAV Render를 구분해 듣고 각 경로의 피크·레벨을 측정한다. 청취용 레벨 매칭을 했다면 보정 dB를 기록한다. 매칭한 파일을 **제품 원출력**으로 오기하지 않는다.
3. 어택, 지속음, 무음 직후, 파일 끝, 급격한 커브 전환, stereo 이미지, click/clipping, CPU/dropout을 각각 메모한다. 결과는 **좋음/문제/차이 없음/판정 보류**로 구별한다. 모니터 장비·볼륨·브라우저·OS를 알 때만 기입한다.
4. 앞으로 추가할 음원은 출처·사용/재배포 권한·채널/샘플레이트·길이·해시와 고정 커브 데이터를 함께 남긴다. 원본과 승인된 출력의 비교 자료가 쌓이기 전에는 이 표를 최종 golden audio set이라 부르지 않는다.

새 실험의 판정은 [청취 결정 기록](LISTENING_DECISIONS.md)에, DSP 수치 조건은 해당 테스트/Phase 보고서에 남긴다. 현재 확인된 **음악적으로 성공한 설정**은 없다. 수치적 neutral 복원과 특정 tone mapping은 성공했지만 청감 승인과 다르다.

## 2026-10-06 — Render 입력 변환 검증 (로컬, 미배포)

기술 fixture: 44.1/48/88.2/96 kHz 1초 1 kHz sine 및 88.2/96 kHz 30 kHz sine. 실제 worker WAV 검사에서 30 kHz 제거 약 -90.18/-98.52 dB. 음악적 청취 승인은 UNKNOWN. tests/browser-render-resampling.html 및 tests/render-resampling.mjs로 재현한다.

## 2026-10-06 — 추가 검증 완료, 미커밋·미배포

- 48 kHz mono/stereo × bypass, 5개 개별 효과, 2개 복합 순서: 총 16개에서 기존 HEAD 렌더와 WAV 바이트가 동일했다. 각 신호는 0.5초이며 긴 효과 체인/청감 검증을 대신하지 않는다.
- 44.1/48/88.2/96 kHz × 60초 stereo: 모두 48 kHz/24-bit/2,880,000 frames, 재디코딩 60초, 997 Hz 보존. tests/browser-render-minute.html.
- 실제 앱에 6초 96 kHz WAV를 열어 Play, 자연 종료, 재시작, Pause, Stop을 확인했다. WAV 저장 파일은 stereo/48k/24-bit/288,000 frames였고 앱 재열기에서 6초 확인. console 오류·경고 없음.
- 기존 11개 변환 경계 검사와 Node converter 검사는 통과. 청감 승인, 장시간/저사양/다중 브라우저 검증은 남아 있다.
