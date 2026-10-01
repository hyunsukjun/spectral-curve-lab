# Product knowledge setup — 적용 감사

대상: Spectral Curve Lab만. 2026-09-29 현재 소스와 기존 `README.md`, Phase 1–6, SOURCE/OUTPUT, 안정성, 디자인 보고서를 조사했다. Audio Curve Lab은 기존 디자인 기준으로만 참조했다. 이 작업에서 **HTML/CSS/JavaScript/DSP/파라미터는 수정하지 않았고**, `README.md` 링크와 아래 장기 지식 문서만 추가했다.

## 이전 적용과 이번 추가

| 첨부 규약 | 착수 시 상태 | 이번 결과 |
| --- | --- | --- |
| Curve Lab Design System v1.0, Cyan 브랜드/의미 색 분리 | 이미 적용. [기존 보고서](DESIGN-SYSTEM-V1.md)와 현재 CSS/Canvas 확인 | 재적용하지 않고 [토큰 의미](../CURVE_LAB_DESIGN_SYSTEM.md) 기록 |
| Shift/Stretch/Blur, 비교 화면, 재생 안정성 | 이미 구현; [Phase 6](PHASE-6-REPORT.md), [비교](SPECTROGRAM-REPORT.md), [안정성](STABILITY-20260929.md) | 기능을 복제하거나 DSP를 바꾸지 않고 제품 계약으로 연결 |
| 에이전트 규칙/개발 지침/기능·파라미터·interaction·DSP·결정·이관 문서 | 요청된 이름의 문서는 없었음; 기존 보고서는 단계별 검증 기록 | 9개 문서에 **현재 구현 내용**을 채움. 기존 보고서는 증거로 보존 |
| 청감 fine-tuning과 승인 결과 | 수치/브라우저 검증은 있으나 실제 청취 승인값은 없음 | `PARAMETER_SPEC.md`에 확인된 시간 상수·전환·경계·아티팩트를 남기고 useful range/sweet spot/모니터 환경은 UNKNOWN으로 분리 |
| preset/host automation/Standalone | 현재 미구현 | 구현인 것처럼 적지 않고 versioned schema를 제안으로만 기록 |

## 현재 구조 요약

브라우저 `app.js`는 정규화 곡선과 transport/Canvas를 소유한다. `curve-editor.js`가 점/보간을 제공하고, 하나의 `SpectralEngine`이 STFT 안에서 Stretch→Blur→Shift를 처리한다. AudioWorklet Preview(2048/512)와 Worker Render(4096/1024)가 엔진을 공유한다. WAV는 48 kHz/24-bit PCM이다. 별도 Worker가 기본 OFF인 SOURCE/OUTPUT overview를 만든다. 직접 연결된 HTML ID 목록은 [기존 디자인 보고서](DESIGN-SYSTEM-V1.md)에 이미 있어 중복 목록을 만들지 않았다. 외부 패키지나 폰트 의존성은 추가하지 않았다.

## 이번 회귀 확인

- `package.json`의 neutral/shift/stretch/blur/spectrogram/transport **6개 검사 모음 통과**. neutral 72 cases의 최대 오차 약 7.51e−17, transport 128 cases. Stretch/Blur/Shift 단독·조합 및 180초 계산 stress 포함. `src/*.js` 전체 문법 검사 통과.
- 실행 화면: 8초 기본 예제와 세 모드의 범례/readout 확인. 실제 `tests/fixtures/cello.wav`를 파일 선택창으로 읽어 1.04초 길이를 확인. Play→Stop과 0초 복귀, console error/warn 없음. WAV render는 UI에 1.0s 완료가 표시되었으나 브라우저 다운로드 이벤트 대기는 시간 초과되어 이번 실행에서 파일 저장 자체를 재검증했다고 기록하지 않는다.
- 기존 코드 변경이 없으므로 점 편집·Reset 취소·반응형·Spacebar·비교 화면·실제 WAV 파일 검사는 [디자인 적용 회귀](DESIGN-SYSTEM-V1.md)와 [안정성 검사](STABILITY-20260929.md)의 기존 증거를 참조한다. 이번 실행에서 이 항목들을 다시 조작했다고 주장하지 않는다.

## 남은 정보

실제 청취를 통한 세 파라미터의 useful range/sweet spot, 복잡한 음원의 artefact 강도, 모니터 환경, 파라미터 매핑의 최종 승인, Native framework/preset schema는 **UNKNOWN/미결정**이다. 이후 청취 시 입력·설정·환경·들린 차이·채택 여부·날짜를 [파라미터 문서](PARAMETER_SPEC.md)와 [결정 기록](DECISIONS.md)에 누적한다.
