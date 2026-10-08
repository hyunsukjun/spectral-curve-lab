# 제품 결정 기록

확정된 제품 방향/현재 구현 선택만 적는다. 과거 단계 보고서의 당시 미구현 목록은 현재 상태가 아니다. 수치 검증과 **청감 승인**은 구별한다.

| 날짜 | 결정 · 이유 · 영향 | 근거/상태 |
| --- | --- | --- |
| 2026-10-05 | 하단 Signal Chain의 활성 블록을 드래그하여 실제 처리 순서를 바꾼다. 블록 클릭은 편집 선택만 하며 다른 블록에 놓으면 그 앞, Output에 놓으면 맨 뒤로 이동한다. 기존 DSP 라우팅을 재사용하고 순서 변경 시 Preview·비교·WAV의 이전 결과를 무효화한다. | [상호작용](INTERACTION_SPEC.md), `tests/module-routing.mjs`, 데스크톱 브라우저 WAV A/B; touch/keyboard 조작과 청감 평가는 별도 |
| 2026-09-27 | 초기 제품을 Shift → Stretch → Blur의 단계로 만들고 각 곡선을 독립 보관한다. 기능별 수치와 브라우저 검증을 거쳐 확장한다. | [초기 사양](INITIAL-SPECIFICATION.md), Phase 4–6. 현재 세 기능 IMPLEMENTED/검사 범위 VERIFIED |
| 2026-09-27 | Stretch는 1 kHz 중심의 **주파수 간격** 변형이며 재생 속도/길이를 바꾸지 않는다. 기본 1, 범위 0.5–2, 축·tooltip에서 `×`를 제거한다. 배속 오해를 없애기 위한 UI·DSP 계약. | [Phase 5](PHASE-5-REPORT.md), [Phase 6](PHASE-6-REPORT.md); 청감 최종 매핑 승인 UNKNOWN |
| 2026-09-27 | Blur는 별도 0–100% 곡선으로 시간적 성분 변화만 완만하게 한다. Stretch와 다른 목표이며 주파수 축 low-pass가 아니다. 처리 순서를 Stretch → Blur → Shift로 고정한다. | [Phase 6](PHASE-6-REPORT.md), [spectral-engine.js](../src/spectral-engine.js); 청감 sweet spot UNKNOWN |
| 2026-09-27 | SOURCE/OUTPUT 비교를 Harmonicity/Freeze보다 먼저 제공한다. 관찰 피드백이 필요하되 Canvas 커브를 주 작업 영역으로 유지한다. 기본 OFF, 편집 후 stale/수동 갱신, Preview 결과라고 명시한다. | [비교 보고서](SPECTROGRAM-REPORT.md); Harmonicity/Freeze는 당시 미구현 |
| 2026-09-29 | 자연 종료가 마지막 출력 callback에서 발생하고 늦은 위치 메시지가 UI를 되돌리지 않도록 token/메시지 순서를 보완한다. | [안정성 보고서](STABILITY-20260929.md), `tests/transport.mjs` |
| 2026-09-29 | Audio Curve Lab의 공통 디자인 언어를 Spectral에 적용하되 Cyan `#31B8C6`는 브랜드, 세 효과 색은 의미 색으로 유지한다. DSP·좌표/편집 계약은 바꾸지 않는다. | [디자인 보고서](DESIGN-SYSTEM-V1.md), [디자인 토큰](../CURVE_LAB_DESIGN_SYSTEM.md) |
| 2026-09-29 | 현재 웹 구현을 스탠드얼론 제품 지식의 참조로 문서화한다. 프레임워크 선정·preset 포맷·DSP 포팅은 아직 결정하지 않는다. | 사용자 제공 master setup; [이관 기록](STANDALONE_MIGRATION.md) |
| 2026-10-01 | 백색소음만으로는 배음 이동과 어택 변화를 평가하기 어려워, 앱 자체 생성 Harmonic notes를 기본 예제로 두고 기존 Noise intervals를 Demo 선택지로 유지한다. 실제 녹음·청감 승인으로 오인하지 않도록 둘 다 진단 예제로 표시한다. DSP·파라미터 범위는 유지한다. | [음질 검토](QUALITY-REVIEW-20260929.md), [Reference Sound Set](REFERENCE_SOUND_SET.md); 청감 효과 **NEEDS MORE TESTING** |

| 2026-10-02 | 사용자 지시에 따라 Harmonicity/Freeze를 두 개의 독립 곡선으로 추가한다. 기존 세 효과와 neutral 경로를 유지하며, 단일음 기준음 추정과 spectral-state hold는 첫 구현값이다. 처리 순서는 Stretch → Harmonicity → Blur → Freeze → Shift. | [파라미터](PARAMETER_SPEC.md), [DSP](DSP_BEHAVIOR.md); 수치/브라우저 검증과 청감 승인 분리, sweet spot UNKNOWN |
| 2026-10-03 | Timbre Lab의 모듈 On/Off와 순서 표시를 참고하되, Spectral의 1단계에서는 편집 대상 선택과 활성화를 분리하고 처리 순서는 고정한다. Off일 때 중립 곡선을 전달해 기존 DSP 구조와 저장된 점을 보존한다. | [상호작용](INTERACTION_SPEC.md), [routing](../src/module-routing.js); 순서 변경과 청감 평가는 후속 단계 |
| 2026-10-03 | Timbre UI와의 일관성을 위해 1단계의 하단 개별 On/Off 버튼을 상단 효과 버튼의 선택·재클릭 토글로 통합하고, 하단은 활성 효과만 있는 Input→Output 체인으로 바꾼다. Spectral 편집기는 항상 선택 커브가 필요하므로 Off인 커브도 선택·편집 가능하게 유지한다. | UI 동작만 변경, `enabled`/중립 라우팅과 실제 고정 DSP 순서는 유지. 체인 드래그는 실제 DSP 순서 변경을 갖춘 후속 단계 |
| 2026-10-03 | 사용자의 초기 Off·순차 연결 지시에 따라 시작 선택 커브를 없애고, 네 FFT 효과는 활성화 순서대로 실제 처리한다. Shift는 analytic 합성 후 oscillator 방식이므로 끝에 고정한다. 화면과 Preview/Render/비교가 같은 순서를 쓰며, 음색 보존을 위해 Shift를 다른 알고리즘으로 대체하지 않는다. | [체인·DSP 검토](CHAIN-ORDER-20261003.md), [테스트](../tests/chain-order.mjs). 체인 순서의 음악적 우수성과 실시간 재배치 청감은 UNKNOWN |
| 2026-10-03 | Shift-last 제약은 사용자가 기대한 다섯 효과의 활성화 순서를 충족하지 못했다. Shift 알고리즘 자체는 유지하되 Shift 뒤의 활성 효과를 두 번째 STFT에서 처리한다. Shift-last는 기존 단일 pass를 유지하고, Off/On 재진입은 다섯 효과 모두 맨 뒤로 보낸다. | [체인·DSP 검토](CHAIN-ORDER-20261003.md), [테스트](../tests/chain-order.mjs). 두 pass의 추가 CPU와 청감·장치 underrun은 추가 평가 필요 |

**보류:** Shift soft guard, Stretch pivot/보간, Blur 시간 상수의 최종 청감 승인; 라이브 입력/plug-in, preset/host automation, 비교 화면의 native UI 형태. 새로운 값으로 바꾸기 전 이전 값과 근거·실제 청감 결과를 [PARAMETER_SPEC.md](PARAMETER_SPEC.md)에 남긴다.

청취로 아직 승인하지 않은 실험값과 사용자 피드백은 [청취 판단 기록](LISTENING_DECISIONS.md)에, 실패·수정·미해결 문제의 이유는 [실패·수정·보류 이력](FAILURES_AND_FIXES.md)에 보존한다.

## 2026-10-05 — Hub v0.10 identity pilot

PROJECT-SPECIFIC: 기존 Cyan #31B8C6과 공통 파형 마크를 Orange #FF7047과
Spectral 에너지 아이콘으로 교체. DSP/효과 순서/파라미터 의미 색 유지.
로컬 검토 완료 후 2026-10-05 사용자 요청으로 커밋/배포 승인. `IDENTITY_PILOT.md` 참고.

| 2026-10-05 | 커브와 탐색 제스처의 충돌을 줄이기 위해 원본 채널 파형을 OUTPUT TIME으로 분리하고 슬라이더·커브창 double-click seek를 대체한다. 출력 시간축과 원본 시간축 길이는 같다. 첫 재생 전 지정 위치를 초기화된 엔진에 전달한다. | [검증](OUTPUT-TIME-20261005.md); 기존 STFT/seek 상태·token 유지, 렌더 파형과 구별 |

| 2026-10-05 | 사용자 요청에 따라 기본 소스를 기존 Noise intervals로 고정하고 Demo 선택 메뉴를 제거한다. Open Audio와 백색소음 생성 알고리즘은 유지한다. 이전 Harmonic notes 기본값 결정을 대체한다. | 초기화·재생·사용자 파일 로딩 브라우저 확인 |

## 2026-10-06 — Render 입력 변환 검증 (로컬, 미배포)

비48 kHz Render 입력은 브라우저 AudioBufferSource 변환 대신 96-tap 대역 제한 변환을 사용한다. 48 kHz는 bypass한다. 프레임 수는 ceil에서 round(sourceFrames * 48000 / sourceRate)로 통일해 가장 가까운 출력 프레임으로 정한다. 기존 STFT와 worker는 유지한다.


## 2026-10-07 WAV result feedback — PROJECT-SPECIFIC

Separate detection from sound modification. Measured clipping is actionable before saving, but automatic normalization/limiting is deferred to reference listening. Safe results keep the prior download behavior; clipped results require a direct save click. The persistent link also provides browser download retry without rerendering. Actual OS saving is separate from render-ready status.

## Give editing and dialogs priority over global transport (2026-10-07)

COMMON CANDIDATE: transport shortcuts must respect the same availability as Play and must not consume form editing or modal button activation. Guard the current handlers without changing DSP or curve data. The old modal handling could start background playback (Audio/Space handler path; directly reproduced in Space) or suppress Cancel keyup (directly reproduced in Spectral). Both phases now defer to the open dialog.


## 2026-10-07 — Import before playback in Safari

File import creates the decoding context without awaiting `AudioContext.resume()`. Playback still requests activation through the default context path. This prevents a pending Safari playback permission request from blocking file decoding after the file chooser closes. Existing decoding, channel policy, curves, DSP and export format remain unchanged. Regression: `tests/import-suspended-context.mjs` exercises suspended context, decode failure/retry and playback activation (plus Spectral channel/rate policy). Standalone implementations should likewise keep file decoding independent of output-device activation.


## 2026-10-08 — Cancel pending first playback

Stop, forced Stop, and actual source replacement now advance the playback token even before the AudioWorklet node exists. Previously optional chaining skipped token advancement while setup was pending; the original Play could run after Stop or after a completed source replacement. Source chooser cancellation still preserves state. An explicit later Play works normally. DSP, curves, output rate and format are unchanged.

Verification: actual-handler deferred-initialization test `tests/initial-play-cancel.mjs` failed before the fix and passes for Stop, forced Stop, and file replacement plus explicit retry. Existing transport, keyboard and suspended-context import checks pass. Safari public baseline first click started playback; no exact cold-start latency or audible onset measurement was made. This fix addresses stale playback requests, not engine startup speed.
