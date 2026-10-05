# 사용자 상호작용 계약

2026-10-02 구현 기준. 이벤트 이름이나 HTML ID가 아니라 사용자가 얻는 결과를 정의한다. 현재 웹 연결은 [app.js](../src/app.js), 데이터 연산은 [curve-editor.js](../src/curve-editor.js)다.

| 행동 | 제품 의미와 경계 | 현재 웹 구현·검증 |
| --- | --- | --- |
| 효과 선택·On/Off | 시작 시 다섯 버튼 모두 Off, 선택 커브 없음. 다른 켜진 효과를 누르면 그 커브를 선택한다. 선택된 버튼을 다시 누르면 Off, 꺼진 버튼을 누르면 On과 동시에 선택된다. Off인 커브도 편집할 수 있다. | 버튼 색/하단선은 활성·편집 대상을 구별하며 `aria-pressed`는 On/Off를 나타낸다. 선택된 Off는 범례/readout에 표시한다. 선택 전 Clear Current와 캔버스 점 편집은 비활성. |
| Signal Chain | Input과 Output 사이에 **켜진 효과만** 실제 처리 순서로 표시한다. 블록 클릭은 커브 선택만 한다. 블록을 다른 블록에 놓으면 그 앞에 삽입하고, Output에 놓으면 맨 뒤로 보낸다. Off는 커브 점을 지우지 않고 Preview/Render/비교 화면에 중립값을 전달하며, 다시 On하면 보관한 점을 사용한다. | 다섯 효과 모두 켠 순서대로 추가한다. 드래그로 순서를 바꾸면 Preview와 비교 화면을 갱신 대상으로 표시하고 기존 WAV를 무효화한다. Off 후 다시 On하면 체인 맨 뒤에 재삽입한다. Shift가 중간에 있으면 뒤쪽 효과는 두 번째 STFT 단계에서 처리한다. HTML drag-and-drop은 데스크톱 조작으로 검증했으며 touch/keyboard 재정렬은 아직 미검증이다. |
| Pen | 기본 도구. 기존 점을 잡아 이동하거나 빈 위치에 중간 점을 추가한다. 드래그는 해당 시간의 궤적을 만든다. | pointer capture; `addNode`/`moveNode`; 정규화 좌표. 기존 점과 충분히 가까우면 새 점을 만들지 않음 |
| Select | 기존 점만 선택·이동한다. 빈 곳에서는 새 점을 만들지 않는다. | `selectedTool='select'` |
| Eraser | 기존 **중간 점**을 삭제한다. 빈 곳은 아무것도 만들거나 변경하지 않는다. | 10 CSS px 반경 hit-test; `eraseNode`가 양 끝점 거부. Mac Command-click/그 외 Ctrl-click은 임시 삭제 동작 |
| 끝점과 순서 | 첫/마지막 점은 삭제 불가이며 시간 좌표 `x=0/1` 유지. 값 `y`는 수정 가능. 중간 점은 이웃 사이에서만 이동. | `moveNode`/`eraseNode`; [커브 테스트](../tests/neutral.mjs) |
| Clear Current | 활성 곡선 하나를 중립 두 점으로 복원하고 재생을 정지한다. | `defaultCurves[activeCurve]`; 다른 곡선 유지 |
| Reset All | 확인 후 다섯 곡선을 중립 두 점으로 복원하고 재생 정지. On/Off 상태는 유지한다. 취소/Escape/대화상자 바깥 클릭은 변경하지 않는다. | modal dialog; Undo 없음 |
| Play/Pause/Stop | Play는 현재 위치에서 재생, 재생 중 같은 버튼은 Pause. Pause/재개는 위치와 DSP 상태 보존. Stop은 0초로 돌아가고 상태를 초기화한다. 자연 종료도 0초로 돌아간다. | AudioWorklet messages + token; `Spacebar`는 버튼과 같은 Play/Pause, 텍스트 입력·대화상자 중에는 작동하지 않음. [transport 검사](STABILITY-20260929.md) |
| OUTPUT TIME | 원본 채널 파형을 클릭·드래그해 출력 시간축에서 탐색한다. 재생 중에는 이어서 재생하고 정지·일시정지 중에는 위치만 설정한다. 방향키 1초, Shift+방향키 0.1초, Home/End 처음/끝. | 기존 worklet seek와 token을 재사용한다. 첫 재생 전에 지정한 위치도 엔진 초기화 후 전달한다. 커브·분석 결과는 바꾸지 않는다. [검증](OUTPUT-TIME-20261005.md) |
| 출력 레벨 | L/R 각각 RMS 바·peak 바/hold·dB 표시, 0.999 이상 CLIP 래치. CLIP 버튼은 표시를 초기화한다. | 실제 Preview 출력 뒤의 분석 전용 분기; 모노 원본도 현재 Worklet은 두 채널에 같은 신호 출력. WAV 렌더 레벨을 뜻하지 않음 |
| 커브창과 탐색 분리 | 커브창의 double-click seek와 하단 Position 슬라이더는 제거한다. 커브 점 편집은 기존 방식이며 탐색창 조작은 점을 바꾸지 않는다. | OUTPUT TIME의 role=slider와 현재 초/전체 길이 접근성 값을 제공한다. hard seek의 기존 준비 무음/click 가능성은 별도 개선 대상 |
| 파일 열기 | 새 파일을 읽으면 waveform/길이와 재생 위치가 바뀐다. 현재 다섯 커브는 유지된다. | file chooser, `decodeAudioData`; 선택창 검증 기록과 제한은 [디자인 회귀](DESIGN-SYSTEM-V1.md) |
| 기본 소스 | 시작 시 8초 Noise intervals를 불러온다. Demo 선택 메뉴는 없으며 Open Audio로 사용자 파일을 불러온다. | 기존 백색소음 생성 함수를 그대로 사용한다. 새로고침하면 기본 소스로 돌아간다. |
| Download WAV | 현재 곡선을 전체 파일에 렌더하여 다운로드한다. 진행 중 다시 누르면 취소한다. 편집 시 이전 URL은 폐기되고 새 export가 필요하다. | Worker/Blob/object URL; PCM24, 48 kHz |
| SOURCE/OUTPUT 비교 | 기본 꺼짐. 켜면 원본과 현재 **Preview 처리 샘플**을 같은 축으로 비교한다. 커브 변경 후 이전 그림은 stale로 표시하고 수동 Update한다. 재생/Export 중 새 분석을 시작하지 않는다. | 별도 Worker; [비교 보고서](SPECTROGRAM-REPORT.md). 소리 편집 표면이 아님 |

시간축 데이터는 Canvas 크기, browser zoom, devicePixelRatio와 독립이다. Canvas는 왼쪽 파라미터 눈금 영역을 제외한 plot 폭을 `[0,1]` 시간으로 변환하고, 위쪽을 `y=1`, 아래쪽을 `y=0`으로 본다. native mouse/trackpad/touch에서도 이 의미를 유지하되 10px hit-test 같은 웹 구현 치수는 기기별 조절 가능하다. 현재 코드는 `pointercancel`에서 drag 상태를 지우지만, 창 focus 상실(`window blur`)에서는 cursor만 갱신한다. 따라서 focus 상실 시 drag 종료 보장은 **UNKNOWN**이다. 실제 touch 제스처·접근성 전 범위도 **UNKNOWN**이다. 커브의 시간 해상도와 급격한 제스처의 오디오 반영은 [시간 동작 기록](CURVE_TEMPORAL_BEHAVIOR.md)을 따른다.
