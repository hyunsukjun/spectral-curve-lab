# Spectral Curve Lab 안정성 개선 — 2026-09-29

범위: 기존 Shift / Stretch / Blur 및 SOURCE/OUTPUT 비교 유지. 새 효과와 다른 Curve Lab 수정 없음.

## 수정

- AudioWorklet에서 ended 뒤에 position을 보내던 순서 문제를 수정했다. UI가 0초로 돌아온 직후 마지막 위치로 다시 이동할 수 있었다. 수정 전 length=1, tick=15에서 회귀 검사가 실패함을 확인했다.
- 마지막 샘플을 출력한 callback에서 즉시 종료한다. 길이가 128-frame 블록과 정확히 맞아도 다음 callback을 기다리지 않는다.
- 앱에서 종료 후 seek를 progress: 0으로 명시하고 재생 token을 갱신해 이전 메시지를 배제한다.
- 브라우저 모듈 캐시 버전을 20260929-transport1로 통일했다.

## 검증

- tests/transport.mjs: 8개 길이 × 16개 위치 보고 주기의 128 cases. 종료 메시지가 마지막인지, 한 번만 발생하는지, 마지막 출력 callback에서 종료되는지, 재시작/일시정지/정지를 검사했다.
- neutral / shift / stretch / blur / spectrogram / transport 여섯 테스트 모음 통과. Neutral 72 cases 최대 오차 7.51e-17; SOURCE/OUTPUT neutral 오차 0.
- 실제 브라우저 AudioWorklet/OfflineAudioContext와 분석 Worker: neutral / shift / stretch / blur / combined 모두 maxError 0.
- 기본 8초 음원: 자연 종료 후 0초 복귀, 재시작 및 일시정지 위치 유지 확인. 분석 중 재생 시 분석 취소 확인.
- 실제 cello.wav fixture: 앱의 동일 로딩 함수로 디코딩, Play/Pause/resume/Stop/자연 종료 후 재시작 및 WAV 다운로드 확인. 커브 편집 후 Update needed, Update comparison 후 Current curves 확인.
- 로컬 서버 재시작 후 제공 응답 확인. 검증 화면: stability-20260929.png.

## 한계

파일 선택창 자체와 사람의 청감 평가, 장치 underrun은 이번 검사에 포함하지 않았다. 기존 Preview FFT2048 / WAV FFT4096 차이와 Stop/seek 클릭 가능성은 그대로 남아 있다. 180초 검사 결과는 오프라인 연산 검사이며 장치에서의 장시간 재생 보증이 아니다.
