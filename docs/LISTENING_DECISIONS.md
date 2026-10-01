# 청취 판단·파인튜닝 결정 기록

2026-09-30 현재 **확정된 청취 기반 파라미터 조정: 없음**. 수치 테스트로 정해진 구현값을 사람의 청감 승인값으로 격상하지 않는다. [PARAMETER_SPEC.md](PARAMETER_SPEC.md)의 범위·매핑은 현재 구현 계약이며, 아래 표는 실제 들은 평가와 구분한다.

| 기록 ID | 입력·설정 | 관찰 / 이유 | 판단 |
| --- | --- | --- | --- |
| LF-001, 2026-09-29 사용자 피드백 | 음원, 세 커브 값/조합, Preview 또는 WAV, 모니터 환경 **UNKNOWN** | 다른 Curve Lab에 비해 소리가 싸구려스럽고 매력이 부족하다는 제품 전체의 청감 평가. 원인은 아직 분리되지 않음. [음질 검토](QUALITY-REVIEW-20260929.md) | **NEEDS MORE TESTING**. 세 효과 각각의 실패나 특정 값의 기각으로 단정하지 않음 |

## 현재 값의 채택 근거와 미확인 사항

| 항목 | 현재 값·구현 이유로 확인되는 부분 | 청취로 아직 확인할 것 |
| --- | --- | --- |
| Shift ±2000Hz / 0Hz 중립, 10ms | 일정 Hz 이동을 만드는 제품 의미. 연속 oscillator와 평활은 프레임 위상 재시작·급변을 피하려는 구현. 100Hz soft guard는 경계 wrap을 피함. [Phase 4](PHASE-4-REPORT.md) | 실용 범위, 10ms와 다른 시간의 A/B, 경계 감쇠가 음악적으로 적절한지 **UNKNOWN** |
| Stretch 0.5–2 / 1kHz pivot, 20ms | 길이를 바꾸지 않고 간격 변형; peak-region·분수 bin 처리와 중립 부근 혼합. [Phase 5](PHASE-5-REPORT.md) | pivot·범위·보간의 음질상 우열, 강한 어택의 허용 수준 **UNKNOWN** |
| Blur 0–100% / `τ=0.5×amount²`초, 20ms | bin 크기를 시간 방향으로 부드럽게 남기며 0에서 bypass. 100%는 500ms 시간 상수. [Phase 6](PHASE-6-REPORT.md) | 유용한 시간 영역, 어택 감소와 위상 아티팩트의 허용 수준 **UNKNOWN** |

위 숫자의 **정확한 선택 과정에서 비교한 대안값과 사람의 청취 결과는 기록되어 있지 않다.** 구현 이유를 청취 이유로 대체하지 않는다.

## 다음 청취 기록 형식

새 기록마다 `날짜 / Reference Sound ID·해시 / 원본의 구간 / 이전 커브·값 / 시험 커브·값 / Preview·Render 경로 / 청취용 레벨 보정 / 모니터 환경(알 때만) / 들린 차이(어택·지속·공간·아티팩트) / CPU·클리핑 등 부작용 / 결과 APPROVED·REJECTED·NEEDS MORE TESTING / 채택·기각 이유 / 재현 파일·테스트`를 적는다. 실패한 값도 삭제하지 않고 남긴다. 새로운 결정을 승인한 후에만 [DECISIONS.md](DECISIONS.md)의 제품 결정으로 올리고, 바뀐 parameter 계약을 [PARAMETER_SPEC.md](PARAMETER_SPEC.md)에 반영한다.
