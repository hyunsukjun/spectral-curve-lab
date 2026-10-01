# Spectral Curve Lab 개발 지침

현재 웹 앱은 실행 가능한 참조 구현이다. 제품 동작은 `docs/FEATURE_REGISTRY.md`와 `docs/INTERACTION_SPEC.md`, 수치/데이터 계약은 `docs/PARAMETER_SPEC.md`와 `docs/DSP_BEHAVIOR.md`, 플랫폼 교체 항목은 `docs/STANDALONE_MIGRATION.md`에 기록한다. 재현 음원, 청취 판단, 시간 제스처, 실패·보류 경험은 각각 `docs/REFERENCE_SOUND_SET.md`, `docs/LISTENING_DECISIONS.md`, `docs/CURVE_TEMPORAL_BEHAVIOR.md`, `docs/FAILURES_AND_FIXES.md`에 축적한다. 실제 소스가 구현 진실이며, 문서는 의도와 검증 범위를 보존한다.

## 구조와 상태

- `index.html`/`src/styles.css`: UI 구조와 시각 토큰. `src/app.js`: 브라우저 상태, Canvas paint, 로딩, transport와 편집 이벤트. `src/curve-editor.js`: 정규화 점과 보간.
- `src/spectral-core.js`: FFT/STFT; `spectral-stretch.js`, `spectral-blur.js`, `spectral-shift.js`, `spectral-engine.js`: 처리 모델. `spectral-worklet.js`: 재생; `offline-render.js`/`render-worker.js`/`wav.js`: 파일 생성. `spectrogram-*`: 관찰 화면.
- 현재 커브는 메모리 안의 `curves.shift/stretch/blur`이며 영구 preset 저장은 **미구현**이다. 저장 형식을 임의로 신설하거나 기존 커브 좌표를 바꾸지 않는다. 신규 기능은 UI label과 안정적 ID를 분리한다.
- Canvas 좌표는 정규화된 `[0,1]` 시간/값으로 변환해서만 제품 데이터에 넣는다. resize, 확대, devicePixelRatio는 그 데이터에 영향을 주면 안 된다. 고해상도 backing store는 CSS 크기와 분리한다.

## 오디오 경계

- 파일 입력은 `decodeAudioData`로 읽고 mono/stereo만 허용한다. 기본 예제는 48 kHz, 8초 stereo noise intervals다. Preview는 AudioWorklet, Render는 Worker가 같은 `SpectralEngine`을 사용하지만 FFT 크기가 다르다. 두 경로의 정확한 차이와 파일 변환은 `docs/DSP_BEHAVIOR.md`를 따른다.
- 곡선 편집은 출력 파일과 비교 화면을 stale로 만든다. 재생 중 곡선은 프레임 경계에 적용한다. Render는 진행·취소·오류를 처리하고 결과의 길이/채널/PCM 형식을 검증한다.
- 긴 파일은 복사·디코딩·출력 버퍼의 메모리 비용이 있다. AudioWorklet callback의 처리 시간을 늘리는 계산이나 할당은 성능 측정 후 도입한다. 다른 브라우저에서의 동작은 실제 검증 기록으로만 주장한다.

## 화면과 의존성

- 작업 순서는 brand/header → transport → parameter/tool toolbar → 얇은 status strip → 가장 큰 Canvas workspace이다. 좁은/넓은 viewport, pointer 매핑, high-DPI, focus-visible, disabled, reduced-motion을 확인한다.
- 외부 UI 프레임워크·폰트·런타임 패키지는 현재 필요하지 않다. 추가 시 재현성, 오프라인 실행, 성능 근거를 남긴다. 브라우저 호환성을 추정하지 말고 사용한 환경과 제약을 기록한다.

## 검증과 기록

- 동작 변경 시 `npm test`(또는 `package.json`의 여섯 테스트), `node --check src/*.js`, 관련 브라우저 fixture를 실행한다. 실제 파일 로딩, Play/Pause/Stop, 모드/도구/점 조작, Reset 취소, 비교 갱신, Preview, WAV 다운로드, 화면 크기·console을 확인한다.
- DSP 수치 통과는 청감 승인이 아니다. 청감 테스트에는 입력 ID·해시, 파라미터와 실제 커브, Preview/WAV 경로, 레벨 보정, 청취 환경(알 때만), 들린 차이, 결과·상태·날짜를 적는다. 아직 없으면 `UNKNOWN`으로 둔다. 실패한 설정과 그 이유도 남긴다.
- 기능/파라미터/DSP/상호작용/디자인/이관 결정이 바뀌면 해당 문서를 같은 변경에 갱신하고, 중요한 기존 값은 이유 없이 지우지 않는다. macOS framework는 지금 확정하지 않는다.
