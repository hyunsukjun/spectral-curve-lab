# Spectral identity pilot

2026-10-05 · Initial local review completed; user authorized commit and GitHub publication on 2026-10-05.

Source: `/Users/hyunsukjun/Documents/Codex/2026-09-27/referenced-chatgpt-conversation-this-is-an/outputs/CurveLabHub/DesignIdentity/iterations/2026-10-04-v0.10`.
Header symbol, tab micro, future app tile are original SVG copies with hashes
in `assets/identity/palette.json`. Palette CSS matches the other web pilots.

| Lab | sRGB |
| --- | --- |
| Audio | `#459BFF` |
| Timbre | `#F4CB38` |
| Space | `#A982FF` |
| Granular | `#EF4FA4` |
| Spectral | `#FF7047` |
| Oscillator | `#28CDB0` |

## Scope

Brand changes from #31B8C6 to #FF7047; header/favicons and download/focus treatment.
No JS, DSP, effect chain, parameter colors, spectrogram palette, curve data,
keyboard interaction or render changes. App tile is stored for future reuse,
not installed as a native icon.

## Maintenance

Update palette JSON/CSS and exact source icons with hashes together.
Baseline Git dafaecd contains the prior brand; preserve unrelated later edits.

## Validation

- Hub v0.10 원본 SVG 3종의 바이트/기록된 SHA-256 및 XML 파싱 일치.
- 공통 palette CSS는 Granular 웹 적용본과 동일.
- 기본 화면 1309px, 좁은 화면 약 434px에서 가로 넘침 없음. 헤더 아이콘 로드 및 #FF7047 적용 확인.
- 기본 8초 데모 Play → Pause 표시 → 재생 완료, Stop 후 0초 확인. 브라우저 오류/경고 없음.
- src JavaScript 전체는 baseline과 바이트 동일, 구문 검사 통과. DSP/파라미터 변경 없음.
- 청감 및 WAV export는 이번 디자인 검증 범위에서 수행하지 않음.
- Git diff 공백 검사 통과. 초기 검토는 커밋 전 상태에서 완료. 이후 사용자 승인으로 커밋/배포 진행.

