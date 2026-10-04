# Spectral Curve Lab 작업 규칙

적용 범위는 이 디렉터리의 Spectral Curve Lab뿐이다. 작업 전에 `README.md`, 실제 코드, 관련 `docs/` 기록과 테스트를 확인한다. 코드와 문서가 어긋나면 실제 동작을 조사하고 차이를 보고한다. 추측으로 어느 한쪽을 정답으로 확정하지 않는다.

우선순위는 기존 오디오·DSP 동작 → 파라미터 의미와 fine-tuning → 정규화된 커브 데이터와 보간 → 사용자 상호작용 → 파라미터 ID와 상태 호환성 → 디자인 시스템 → 이관 가능성 → 장식이다. UI 변경을 이유로 DSP를 바꾸거나, 스탠드얼론 준비를 이유로 정상 작동하는 웹 구현을 대규모로 다시 작성하지 않는다. DSP와 UI 변경은 구분하여 검증한다.

`shift`, `stretch`, `blur`의 ID, 범위, 기본값과 커브의 정규화 좌표·시간축을 보호한다. 점 편집, 끝점 보호, Pen/Eraser, Command/Ctrl 보조 삭제, Spacebar, Play/Pause/Stop, Preview와 Render의 동작을 변경할 때에는 명시적으로 검증한다. 새 dependency와 대규모 refactor는 별도 요구나 명확한 근거가 없으면 추가하지 않는다.

변경에 맞춰 `docs/FEATURE_REGISTRY.md`(기능), `docs/PARAMETER_SPEC.md`(파라미터·fine-tuning), `docs/DSP_BEHAVIOR.md`(DSP), `docs/INTERACTION_SPEC.md`(상호작용), `docs/DECISIONS.md`(중요 결정), `docs/STANDALONE_MIGRATION.md`(이관 영향), `CURVE_LAB_DESIGN_SYSTEM.md`(디자인)를 갱신한다. 청감·재현 음원·시간 제스처·실패에서 얻은 지식은 `docs/REFERENCE_SOUND_SET.md`, `docs/LISTENING_DECISIONS.md`, `docs/CURVE_TEMPORAL_BEHAVIOR.md`, `docs/FAILURES_AND_FIXES.md`에 남긴다. 청감 결과와 승인 여부를 추측하지 말고 `UNKNOWN`으로 남긴다. 제품 동작·데이터 모델·웹 구현을 구분하여 기록한다. GitHub commit, push, 공개 배포는 사용자의 명시적 지시가 있을 때만 한다. 다른 Curve Lab은 수정하지 않는다.

## 브랜드 기준

Hub v0.10 Spectral #FF7047과 원본 아이콘을 사용한다.
`docs/IDENTITY_PILOT.md` 참고. 파라미터·스펙트로그램 색은 독립적으로 유지한다.
