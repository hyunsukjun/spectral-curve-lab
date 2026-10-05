# 실패·수정·보류 이력

목적은 과거 코드를 보관하는 것이 아니라 **무엇이 문제였고, 왜 현재 방식이 선택됐으며, 소리/동작에 무엇을 보존해야 하는지**를 남기는 것이다. 수치 검증 성공과 사람의 청감 승인을 구분한다. 날짜와 정확한 환경·측정 조건은 링크된 당시 보고서를 따른다.

| 사례 | 이전 문제 → 현재 대응 / 이유 | 확인 범위 · standalone에서 지킬 것 |
| --- | --- | --- |
| F-01 Shift 구현 방식 | 초기 설명의 complex-bin 재배치 예상에서 analytic signal + 연속 oscillator 방식으로 전개. 정수 bin 양자화와 프레임별 위상 재시작을 피하고 소수 Hz 이동을 지원하려는 선택. | [Phase 4](PHASE-4-REPORT.md)의 tonal/경계 수치와 phase 연속성 검사. Native 구현의 내부 방식은 달라도 가산 Hz와 위상 연속성을 보존. 청감 품질 승인 아님 |
| F-02 시작·seek의 callback 집중 | 초기 neutral은 첫 callback에서 겹친 여러 frame을 처리해 2.667ms 예산 초과 관측 1회, 최대 4ms. pre-roll을 나눠 최대 2ms·초과 0회로 측정. | [Phase 4](PHASE-4-REPORT.md)의 8초/1ms 해상도 측정. 이후 stereo 프레임 준비도 callback별 분산([Phase 5](PHASE-5-REPORT.md)). Native에서 시작 지연과 deadline을 함께 측정; 실제 장치 underrun 무증거를 성능 합격으로 오해하지 않기 |
| F-03 Pause 후 상태 손실 | 일시정지/재개 시 다시 seek하던 동작을 제거해 위치와 oscillator/Blur 상태를 보존. Stop과 seek는 별도로 초기화. | [Phase 4](PHASE-4-REPORT.md), [Phase 6](PHASE-6-REPORT.md). 재개 시 처리 상태 연속성 유지가 제품 동작 |
| F-04 Stretch tonal 진폭 저하 | peak-region 이동·분수 bin Lagrange 보간을 사용하며, 검사한 단음에서 최대 약 3% 진폭 손실을 기록. 접근은 유지했지만 복잡음/어택 품질은 미해결. | [Phase 5](PHASE-5-REPORT.md). Native에서 손실을 무조건 복제할 승인 없음; 원인과 A/B 비교를 보존 |
| F-05 Blur 스테레오 위상 오류 | 약한 새 성분의 phase 초기화·안정 구간에서만 순간 주파수 갱신하도록 보완해 반대 위상 채널의 수치 오류를 줄임. | [Phase 6](PHASE-6-REPORT.md)의 stereo 비율·seek reset 검사. Native에서 채널 독립 상태와 반대 위상 fixture 유지; 전체 청감 승인 아님 |
| F-06 모듈 캐시 혼합 | 브라우저가 서로 다른 버전의 의존 모듈을 섞어 초기화 오류가 나자 전체 모듈 URL 버전을 함께 갱신. | [Phase 5](PHASE-5-REPORT.md). Web 전용 실패; Native에는 동일 파일 identity/빌드 재현성 문제로 번역, 캐시 쿼리 문자열 자체는 이식 불필요 |
| F-07 종료 후 playhead 재이동 | `ended` 뒤 늦은 `position`이 0초로 돌아간 UI를 다시 끝으로 옮길 수 있었음. 마지막 샘플 callback에서 종료·token으로 이전 메시지 무시. | [안정성 보고서](STABILITY-20260929.md)의 128 transport cases. Native에서도 종료 상태 전이가 오래된 위치 알림에 덮이지 않아야 함 |
| F-08 커브·캔버스 좁은 화면 | 초기 기준 구현의 큰 최소 폭에서 끝점이 사라질 수 있어 Spectral shell의 plot/resize 매핑을 조정. 디자인 적용 때 좌표·노드 계약은 보존. | [Phase 1–3](PHASE-1-3-REPORT.md), [디자인 보고서](DESIGN-SYSTEM-V1.md). Native에서도 창 크기 변경이 `{x,y}`를 바꾸면 안 됨 |
| F-09 현재 음질 불만 | 사용자가 다른 Lab보다 소리가 싸구려스럽고 매력 부족하다고 평가. 원인별 음원·곡선·Preview/WAV A/B가 없어 개선 채택값은 없음. | [음질 검토](QUALITY-REVIEW-20260929.md), [청취 기록](LISTENING_DECISIONS.md). **미해결 / NEEDS MORE TESTING**. 임의 gain 증폭이나 수치 통과를 해결로 표시하지 않음 |
| F-10 체인 표시와 DSP 순서 불일치 | 초기 모듈 UI는 다섯 효과를 모두 On으로 시작하고 고정 목록만 표시했다. 사용자가 누른 순서와 실제 DSP 순서가 무관해 체인이 연결된 것처럼 오해될 수 있었다. 모두 Off로 시작하고 네 FFT 효과의 활성 순서를 엔진에 전달하며, Shift의 합성 후 위치는 명시적으로 고정했다. | [체인 검토](CHAIN-ORDER-20261003.md), `tests/chain-order.mjs`, 브라우저 WAV A/B. Native에서도 표시 순서와 실제 신호 경로를 일치시키고 Shift의 위상 연속성을 보존. 청감 개선 승인 아님 |
| F-11 Shift-last가 순차 연결을 깨뜨림 | Shift를 먼저 켜도 뒤에 켠 효과가 Shift 앞으로 이동했다. 120가지 클릭 순서 테스트는 120가지 실제 DSP 순서를 뜻하지 않았다. Shift 처리 자체를 바꾸지 않고 Shift 출력 뒤에 두 번째 STFT를 연결해 후속 효과를 처리한다. Shift-last는 기존 경로로 남긴다. | [체인 검토](CHAIN-ORDER-20261003.md), `tests/module-routing.mjs`, `tests/chain-order.mjs`. 두 pass의 청감·CPU·실시간 전환 click은 추가 확인 필요 |

## 알려진 미해결 위험

- Stop/seek의 hard boundary click, WAV 인코딩 시 범위 초과 clipping, Blur tail 절단은 [DSP 계약](DSP_BEHAVIOR.md)에 남아 있다. transport fade·limiter·자동 normalization은 현재 없다. 이것은 **수정 완료 사례가 아니다**.
- Preview FFT2048과 WAV FFT4096의 비중립 소리는 동일하다고 검증되지 않았다. [시간 동작](CURVE_TEMPORAL_BEHAVIOR.md)과 [Reference Sound Set](REFERENCE_SOUND_SET.md)으로 차이를 수치·청감에서 분리할 필요가 있다.
- 창 focus를 잃을 때 drag 종료 보장은 문서와 코드가 불일치했다. 현재 확인된 코드는 `pointercancel`에서 drag 상태를 지우고 `window blur`에서는 cursor만 갱신한다. 실제 gesture 재현을 하기 전에는 안전 종료를 **검증된 기능으로 기록하지 않는다**. [상호작용](INTERACTION_SPEC.md).

## 2026-10-06 — Render 입력 변환 검증 (로컬, 미배포)

기존 비48 kHz fallback은 현재 in-app browser에서 30 kHz를 -3.12/0 dB로 남겼다. 길이 검사는 통과해도 alias 제거는 실패했다. windowed-sinc 변환으로 수정했다. 일반 앱은 48 kHz로 디코딩하므로 모든 파일 열기에 동일 문제가 있다고 일반화하지 않는다.

## 2026-10-06 — 추가 검증 완료, 미커밋·미배포

- 48 kHz mono/stereo × bypass, 5개 개별 효과, 2개 복합 순서: 총 16개에서 기존 HEAD 렌더와 WAV 바이트가 동일했다. 각 신호는 0.5초이며 긴 효과 체인/청감 검증을 대신하지 않는다.
- 44.1/48/88.2/96 kHz × 60초 stereo: 모두 48 kHz/24-bit/2,880,000 frames, 재디코딩 60초, 997 Hz 보존. tests/browser-render-minute.html.
- 실제 앱에 6초 96 kHz WAV를 열어 Play, 자연 종료, 재시작, Pause, Stop을 확인했다. WAV 저장 파일은 stereo/48k/24-bit/288,000 frames였고 앱 재열기에서 6초 확인. console 오류·경고 없음.
- 기존 11개 변환 경계 검사와 Node converter 검사는 통과. 청감 승인, 장시간/저사양/다중 브라우저 검증은 남아 있다.
