# 사용자 상호작용 계약

2026-09-29 구현 기준. 이벤트 이름이나 HTML ID가 아니라 사용자가 얻는 결과를 정의한다. 현재 웹 연결은 [app.js](../src/app.js), 데이터 연산은 [curve-editor.js](../src/curve-editor.js)다.

| 행동 | 제품 의미와 경계 | 현재 웹 구현·검증 |
| --- | --- | --- |
| 모드 선택 | Shift/Stretch/Blur 중 **표시·편집할 곡선 하나**를 선택한다. 다른 두 곡선의 값과 처리 상태는 유지되며 세 효과는 항상 함께 계산한다. | 버튼 3개; 각 모드의 범례/축/readout 변경. [디자인 회귀](DESIGN-SYSTEM-V1.md) |
| Pen | 기본 도구. 기존 점을 잡아 이동하거나 빈 위치에 중간 점을 추가한다. 드래그는 해당 시간의 궤적을 만든다. | pointer capture; `addNode`/`moveNode`; 정규화 좌표. 기존 점과 충분히 가까우면 새 점을 만들지 않음 |
| Select | 기존 점만 선택·이동한다. 빈 곳에서는 새 점을 만들지 않는다. | `selectedTool='select'` |
| Eraser | 기존 **중간 점**을 삭제한다. 빈 곳은 아무것도 만들거나 변경하지 않는다. | 10 CSS px 반경 hit-test; `eraseNode`가 양 끝점 거부. Mac Command-click/그 외 Ctrl-click은 임시 삭제 동작 |
| 끝점과 순서 | 첫/마지막 점은 삭제 불가이며 시간 좌표 `x=0/1` 유지. 값 `y`는 수정 가능. 중간 점은 이웃 사이에서만 이동. | `moveNode`/`eraseNode`; [커브 테스트](../tests/neutral.mjs) |
| Clear Current | 활성 곡선 하나를 중립 두 점으로 복원하고 재생을 정지한다. | `defaultCurves[activeCurve]`; 다른 곡선 유지 |
| Reset All | 확인 후 세 곡선을 중립 두 점으로 복원하고 재생 정지. 취소/Escape/대화상자 바깥 클릭은 변경하지 않는다. | modal dialog; Undo 없음 |
| Play/Pause/Stop | Play는 현재 위치에서 재생, 재생 중 같은 버튼은 Pause. Pause/재개는 위치와 DSP 상태 보존. Stop은 0초로 돌아가고 상태를 초기화한다. 자연 종료도 0초로 돌아간다. | AudioWorklet messages + token; `Spacebar`는 버튼과 같은 Play/Pause, 텍스트 입력·대화상자 중에는 작동하지 않음. [transport 검사](STABILITY-20260929.md) |
| 하단 Position | 재생 중·정지 중 슬라이더로 파일 위치를 이동한다. 같은 위치를 시간과 Canvas playhead가 표시한다. | 기존 worklet `seek` 경로를 사용. drag 중 늦게 도착한 위치 보고를 무시하고 seek마다 token을 갱신. hard seek의 준비 무음/click 가능성은 기존 경계와 같음. [하단 바 검증](PLAYBACK-BAR-20261001.md) |
| 출력 레벨 | L/R 각각 RMS 바·peak 바/hold·dB 표시, 0.999 이상 CLIP 래치. CLIP 버튼은 표시를 초기화한다. | 실제 Preview 출력 뒤의 분석 전용 분기; 모노 원본도 현재 Worklet은 두 채널에 같은 신호 출력. WAV 렌더 레벨을 뜻하지 않음 |
| 탐색 | 파형 캔버스의 double-click 위치로 소스 시간 이동한다. | 정규화 `x`로 seek; hard seek에서 click 가능 |
| 파일 열기 | 새 파일을 읽으면 waveform/길이와 재생 위치가 바뀐다. 현재 세 커브는 유지된다. | file chooser, `decodeAudioData`; 선택창 검증 기록과 제한은 [디자인 회귀](DESIGN-SYSTEM-V1.md) |
| Download WAV | 현재 곡선을 전체 파일에 렌더하여 다운로드한다. 진행 중 다시 누르면 취소한다. 편집 시 이전 URL은 폐기되고 새 export가 필요하다. | Worker/Blob/object URL; PCM24, 48 kHz |
| SOURCE/OUTPUT 비교 | 기본 꺼짐. 켜면 원본과 현재 **Preview 처리 샘플**을 같은 축으로 비교한다. 커브 변경 후 이전 그림은 stale로 표시하고 수동 Update한다. 재생/Export 중 새 분석을 시작하지 않는다. | 별도 Worker; [비교 보고서](SPECTROGRAM-REPORT.md). 소리 편집 표면이 아님 |

시간축 데이터는 Canvas 크기, browser zoom, devicePixelRatio와 독립이다. Canvas는 왼쪽 파라미터 눈금 영역을 제외한 plot 폭을 `[0,1]` 시간으로 변환하고, 위쪽을 `y=1`, 아래쪽을 `y=0`으로 본다. native mouse/trackpad/touch에서도 이 의미를 유지하되 10px hit-test 같은 웹 구현 치수는 기기별 조절 가능하다. 현재 코드는 `pointercancel`에서 drag 상태를 지우지만, 창 focus 상실(`window blur`)에서는 cursor만 갱신한다. 따라서 focus 상실 시 drag 종료 보장은 **UNKNOWN**이다. 실제 touch 제스처·접근성 전 범위도 **UNKNOWN**이다. 커브의 시간 해상도와 급격한 제스처의 오디오 반영은 [시간 동작 기록](CURVE_TEMPORAL_BEHAVIOR.md)을 따른다.
