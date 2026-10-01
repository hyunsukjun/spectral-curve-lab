# 제품 결정 기록

확정된 제품 방향/현재 구현 선택만 적는다. 과거 단계 보고서의 당시 미구현 목록은 현재 상태가 아니다. 수치 검증과 **청감 승인**은 구별한다.

| 날짜 | 결정 · 이유 · 영향 | 근거/상태 |
| --- | --- | --- |
| 2026-09-27 | 초기 제품을 Shift → Stretch → Blur의 단계로 만들고 각 곡선을 독립 보관한다. 기능별 수치와 브라우저 검증을 거쳐 확장한다. | [초기 사양](INITIAL-SPECIFICATION.md), Phase 4–6. 현재 세 기능 IMPLEMENTED/검사 범위 VERIFIED |
| 2026-09-27 | Stretch는 1 kHz 중심의 **주파수 간격** 변형이며 재생 속도/길이를 바꾸지 않는다. 기본 1, 범위 0.5–2, 축·tooltip에서 `×`를 제거한다. 배속 오해를 없애기 위한 UI·DSP 계약. | [Phase 5](PHASE-5-REPORT.md), [Phase 6](PHASE-6-REPORT.md); 청감 최종 매핑 승인 UNKNOWN |
| 2026-09-27 | Blur는 별도 0–100% 곡선으로 시간적 성분 변화만 완만하게 한다. Stretch와 다른 목표이며 주파수 축 low-pass가 아니다. 처리 순서를 Stretch → Blur → Shift로 고정한다. | [Phase 6](PHASE-6-REPORT.md), [spectral-engine.js](../src/spectral-engine.js); 청감 sweet spot UNKNOWN |
| 2026-09-27 | SOURCE/OUTPUT 비교를 Harmonicity/Freeze보다 먼저 제공한다. 관찰 피드백이 필요하되 Canvas 커브를 주 작업 영역으로 유지한다. 기본 OFF, 편집 후 stale/수동 갱신, Preview 결과라고 명시한다. | [비교 보고서](SPECTROGRAM-REPORT.md); Harmonicity/Freeze는 현재 미구현 |
| 2026-09-29 | 자연 종료가 마지막 출력 callback에서 발생하고 늦은 위치 메시지가 UI를 되돌리지 않도록 token/메시지 순서를 보완한다. | [안정성 보고서](STABILITY-20260929.md), `tests/transport.mjs` |
| 2026-09-29 | Audio Curve Lab의 공통 디자인 언어를 Spectral에 적용하되 Cyan `#31B8C6`는 브랜드, 세 효과 색은 의미 색으로 유지한다. DSP·좌표/편집 계약은 바꾸지 않는다. | [디자인 보고서](DESIGN-SYSTEM-V1.md), [디자인 토큰](../CURVE_LAB_DESIGN_SYSTEM.md) |
| 2026-09-29 | 현재 웹 구현을 스탠드얼론 제품 지식의 참조로 문서화한다. 프레임워크 선정·preset 포맷·DSP 포팅은 아직 결정하지 않는다. | 사용자 제공 master setup; [이관 기록](STANDALONE_MIGRATION.md) |

**보류:** Shift soft guard, Stretch pivot/보간, Blur 시간 상수의 최종 청감 승인; 라이브 입력/plug-in, preset/host automation, 비교 화면의 native UI 형태. 새로운 값으로 바꾸기 전 이전 값과 근거·실제 청감 결과를 [PARAMETER_SPEC.md](PARAMETER_SPEC.md)에 남긴다.

청취로 아직 승인하지 않은 실험값과 사용자 피드백은 [청취 판단 기록](LISTENING_DECISIONS.md)에, 실패·수정·미해결 문제의 이유는 [실패·수정·보류 이력](FAILURES_AND_FIXES.md)에 보존한다.
