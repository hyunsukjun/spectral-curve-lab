# Spectral Curve Lab — Initial Development Specification

기존 Curve Lab 프로젝트의 구조, 디자인, Curve 편집 방식 및 공통 개발 원칙을 최대한 유지하면서 새로운 **Spectral Curve Lab**을 구현한다.

이번 작업의 목표는 단순한 EQ/Filter 도구를 만드는 것이 아니라, 시간에 따라 **소리의 내부 스펙트럼 구조를 Curve로 변형하는 독립적인 Spectral Processing Lab**을 만드는 것이다.

기존 Curve Lab의 안정적으로 동작하는 공통 기능은 불필요하게 재작성하지 않는다. 가능한 한 기존 구현 패턴과 UI/UX를 재사용하고, Spectral 처리에 필요한 부분만 확장한다.

---

# 0. Naming Convention

앞으로 제품 및 각 모듈의 표기는 **CurveLab이 아니라 Curve Lab**으로 통일한다.

예:

- Audio Curve Lab
- Timbre Curve Lab
- Granular Curve Lab
- Spectral Curve Lab
- Space Curve Lab

코드 내부의 기존 identifier나 filename을 무리하게 일괄 변경하여 regression을 만들 필요는 없다.

우선 **사용자에게 표시되는 UI 명칭과 문서상의 명칭**을 `Curve Lab` 표기로 통일한다.

---

# 1. 기본 철학

Curve Lab의 공통 작업 흐름은 다음과 같다.

**Load Sound → Draw Curves → Listen → Adjust → Render**

Spectral Curve Lab 역시 이 흐름을 유지한다.

사용자는 FFT/STFT나 복잡한 spectral processing 이론을 알아야 사용할 수 있는 프로그램이 아니라, **Curve를 그려 시간에 따른 spectral transformation을 직접 듣고 조형할 수 있어야 한다.**

기술적인 FFT parameter를 UI 전면에 노출하지 않는다.

---

# 2. Curve Lab Family Consistency

Spectral Curve Lab을 별개의 새로운 앱처럼 디자인하지 않는다.

현재 존재하는 다른 Curve Lab, 특히 **Audio Curve Lab의 UI와 Curve 구현을 가장 중요한 reference implementation으로 사용한다.**

작업 시작 전에 기존 Curve Lab 코드를 먼저 분석하여 다음을 확인한다.

- 전체 page layout
- header / transport layout
- waveform display
- timeline
- playhead
- Curve drawing area
- Curve color treatment
- grid
- axis
- node appearance
- node size
- selected-node appearance
- hover behavior
- line thickness
- Curve interpolation
- default Curve
- parameter selector
- buttons
- spacing
- typography
- border
- background
- panel hierarchy
- Reset behavior
- playback behavior
- render/export behavior

특히 **Audio Curve Lab을 Curve Editor의 primary visual/interaction reference로 삼는다.**

Spectral Curve Lab을 구현하면서 새로운 디자인 언어를 임의로 만들지 않는다.

목표는 사용자가 Audio Curve Lab에서 Spectral Curve Lab으로 이동했을 때

> “다른 프로그램을 사용하는 느낌”

이 아니라

> “같은 Curve Lab에서 다른 종류의 sound transformation을 다루는 느낌”

을 받게 하는 것이다.

---

# 3. Curve Visual Language

Curve의 시각적 구현은 **Audio Curve Lab의 구현 패턴을 우선적으로 참고한다.**

다음을 가능한 한 일관되게 유지한다.

- Curve line style
- line thickness
- node shape
- node size
- node outline
- selected state
- hover state
- grid density
- time axis
- parameter axis
- playhead
- interpolation visualization
- editing feedback

Spectral Curve Lab이라는 이유만으로 지나치게 화려한 spectral/rainbow 디자인을 추가하지 않는다.

Spectrogram은 spectral information을 보여주기 위한 기능적 visualization이어야 하며, Curve Lab family의 전체 UI보다 강한 시각적 존재감을 가져서는 안 된다.

각 Lab에 고유한 accent color를 사용할 수 있으나, **색을 제외한 Curve의 기본 문법과 interaction은 동일하게 유지한다.**

---

# 4. Curve Editing Tools

기존 node 기반 Curve editing에 다음 두 개의 명확한 editing tool을 추가한다.

## Pen Tool

Pen Tool은 Curve를 직접 작성하거나 node를 추가하는 기본 도구이다.

Pen Tool의 목적은 사용자가 Curve를 빠르고 직관적으로 구성할 수 있게 하는 것이다.

최소 기능:

- Curve 영역을 클릭하여 node 추가
- 기존 node 선택
- node drag
- 필요하다면 Curve segment 생성
- 기존 Curve Lab의 interpolation system과 호환

Pen Tool이 선택되어 있을 때의 cursor 또는 selected-tool state를 명확하게 표시한다.

Pen Tool은 별도의 복잡한 drawing system을 새로 만드는 것이 아니라 **기존 node-based Curve Editor를 더 빠르게 조작하기 위한 도구**로 설계한다.

---

## Eraser Tool

Eraser Tool은 사용자가 Curve의 node 또는 편집 요소를 직관적으로 삭제하기 위한 도구이다.

최소 기능:

- node 클릭 → 해당 node 삭제

가능하다면:

- drag하면서 여러 node 삭제

를 지원할 수 있다.

그러나 첫 구현에서 drag erase가 Curve Editor 구조를 복잡하게 만들 경우 **single-node erase부터 구현한다.**

Eraser 사용 중에도 Curve 자체가 깨지거나 invalid state가 되어서는 안 된다.

필수 endpoint 또는 default node가 존재하는 구조라면 해당 node를 삭제하지 못하도록 보호한다.

삭제 후 Curve interpolation을 즉시 다시 계산한다.

---

# 5. Editing Tool Consistency

Pen / Eraser를 Spectral Curve Lab만의 기능으로 만들지 않는다.

가능하면 향후 다른 Curve Lab에서도 사용할 수 있는 **공통 Curve Editor tool architecture**로 설계한다.

단, 이번 작업 때문에 기존 Curve Lab 전체를 대규모 refactor하지 않는다.

공통화가 안전하고 작은 변경으로 가능하면 공통 component로 구현하고, 그렇지 않으면 Spectral Curve Lab에서 먼저 검증할 수 있도록 구조화한다.

장기적으로 모든 Curve Lab은 동일한 기본 editing vocabulary를 갖는 것을 목표로 한다.

예:

**Select / Pen / Eraser**

단, 현재 Audio Curve Lab에 이미 존재하는 interaction이 있다면 그것을 우선 분석한 후 중복되거나 충돌하는 tool을 만들지 않는다.

---

# 6. Spectral Curve Lab의 역할

Spectral Curve Lab은 다음 질문을 담당한다.

> **How does the internal spectrum of the sound transform over time?**

Timbre Curve Lab과 명확하게 구분한다.

### Timbre Curve Lab

Perceptual color shaping.

예:

- Brightness
- Filter / EQ
- Resonance
- Spectral Tilt
- Band Focus
- Formant / Color

### Spectral Curve Lab

Structural spectral transformation.

예:

- frequency-bin 이동
- spectral structure의 stretching/compression
- spectral smearing/blur
- harmonic ↔ inharmonic transformation
- spectrum의 시간적 정지

따라서 단순 EQ, filter cutoff, brightness control을 Spectral Curve Lab에 중복 구현하지 않는다.

---

# 7. First Prototype — Core Processing Parameters

첫 버전의 목표 processor는 다음 5개이다.

1. **Spectral Shift**
2. **Spectral Stretch**
3. **Spectral Blur**
4. **Harmonicity**
5. **Spectral Freeze**

그러나 첫 개발 단계에서 5개를 한꺼번에 구현하지 않는다.

각 processor는 공통 Curve Editor와 연결되어 시간에 따라 parameter가 변화한다.

---

# 8. Spectral Shift

전체 spectral structure를 frequency axis에서 이동한다.

일반적인 pitch shifting과 동일하게 구현하지 않는다.

각 spectral component/bin의 위치를 이동시키는 spectral transformation으로 설계한다.

Curve의 neutral/default 값에서는 원본 spectral structure를 유지한다.

---

# 9. Spectral Stretch

spectral components 사이의 frequency relationship을 확대하거나 압축한다.

**1.0 = Original Spectrum**

Curve가 증가하면 spectral interval이 확장되고, 감소하면 spectral structure가 압축된다.

단순 pitch transposition과 명확하게 다른 결과가 나야 한다.

---

# 10. Spectral Blur

시간 또는 spectral frame 사이의 변화를 smoothing하여 spectrum을 흐리게 만든다.

**0 = Original / No Blur**

값이 증가할수록 spectral movement가 점차 smear된다.

단순 low-pass filtering처럼 들리지 않도록 한다.

---

# 11. Harmonicity

원본 spectrum의 partial relationship을 점진적으로

**Harmonic ↔ Inharmonic**

방향으로 변화시킨다.

neutral position에서는 가능한 한 원본 spectrum을 유지한다.

극단값에서도 갑작스러운 discontinuity가 발생하지 않도록 interpolation한다.

---

# 12. Spectral Freeze

현재 spectral frame 또는 짧은 spectral state를 capture하여 유지한다.

Freeze 상태 동안 spectral evolution이 정지되어야 한다.

단순 Audio Freeze 또는 granular micro-loop와 구별한다.

핵심은 waveform 반복이 아니라

**spectral state의 유지**

이다.

Freeze 진입/해제에서 click/pop 또는 갑작스러운 spectral discontinuity가 발생하지 않도록 한다.

---

# 13. Curve System

기존 Curve Lab의 Curve Editor 구조를 최대한 그대로 사용한다.

공통 X axis:

**Time**

Y axis:

각 spectral parameter의 실제 의미와 단위를 명확하게 표시한다.

Curve system은 최소 다음 기능을 지원한다.

- Select
- Pen
- Eraser
- Add node
- Move node
- Delete node
- Curve interpolation
- 기존 Curve Lab의 Bezier/interpolation 방식
- Reset
- Default value
- Playhead synchronization
- realtime preview
- offline rendering

기존 Curve Lab의 node editing behavior를 특별한 이유 없이 변경하지 않는다.

---

# 14. Parameter Selection

모든 parameter curve를 한꺼번에 겹쳐 표시하지 않는다.

다음 중 하나를 선택한다.

- Spectral Shift
- Spectral Stretch
- Spectral Blur
- Harmonicity
- Spectral Freeze

선택한 parameter Curve만 **주 Curve Editing Area에 크게 표시**한다.

Curve가 항상 UI의 주인공이어야 한다.

---

# 15. Spectrogram

Spectral Curve Lab에는 Spectrogram visualization을 추가한다.

그러나 Spectrogram은 **editing surface가 아니다.**

역할은:

**Observation / Feedback**

이다.

사용자가 spectrogram 위에 직접 그림을 그려 spectrum을 수정하는 방식으로 만들지 않는다.

가능하면:

**SOURCE / OUTPUT**

보기를 제공한다.

SOURCE:
원본 audio spectrogram.

OUTPUT:
현재 spectral processing 결과.

초기 구현에서 부담이 크다면 SOURCE부터 구현하고 OUTPUT은 후속 단계로 분리한다.

Spectrogram 때문에 realtime audio processing 안정성을 희생하지 않는다.

---

# 16. Audio Engine

Spectral processing은 STFT 기반으로 구현한다.

Web 버전에서는 가능하면 Web Audio API + AudioWorklet 구조를 사용한다.

무거운 spectral processing을 main UI thread에서 수행하지 않는다.

첫 구현은 JavaScript 기반 DSP를 사용할 수 있다.

실제 profiling에서 필요성이 확인되기 전까지 WASM을 도입하지 않는다.

---

# 17. FFT / STFT 기본 원칙

FFT size를 크게 만드는 것을 곧바로 고음질이라고 가정하지 않는다.

다음을 함께 판단한다.

- frequency resolution
- temporal resolution
- transient preservation
- CPU load

초기 테스트 출발점:

Realtime Preview:
- FFT Size ≈ 2048
- overlap ≈ 4x

Offline Render:
- FFT Size ≈ 4096
- overlap ≈ 4x

이 값들은 최종 고정값이 아니다.

Listening Test 결과에 따라 조정 가능하도록 내부 구조를 설계한다.

---

# 18. Audio Quality

Spectral Curve Lab에서 **음질을 기능 수보다 우선한다.**

특히 다음을 검사한다.

- phase continuity
- transient preservation
- metallic artifacts
- spectral holes
- zipper noise
- click/pop
- frame-boundary artifacts
- parameter smoothing
- Curve의 급격한 변화에서 발생하는 artifact

analysis/synthesis window와 overlap-add가 정상적으로 동작하는지 검증한다.

Neutral/default 상태에서는 원본과 가능한 한 가까워야 한다.

---

# 19. Preview / Render

Realtime Preview와 Offline Render는 동일한 processing concept와 algorithm을 기반으로 한다.

Offline Render에서 더 높은 quality setting을 사용하는 것은 허용한다.

그러나 Preview와 Render가 음악적으로 다른 processor처럼 들려서는 안 된다.

기존 Curve Lab의 render/export infrastructure가 안정적이라면 반드시 우선적으로 재사용한다.

기존 기본 규칙:

- 48 kHz
- 24-bit WAV

---

# 20. Test Sources

최소한 다음 source로 검증한다.

1. Sine wave
2. Harmonic tone
3. White / pink noise
4. Percussive transient
5. Voice
6. Sustained instrumental sound
7. Complex field recording

특히 sine/harmonic source를 통해 Spectral Shift와 Stretch의 frequency mapping을 검증한다.

---

# 21. Neutral-State Test

모든 processor가 neutral/default 상태일 때:

**Input ≈ Output**

이어야 한다.

완전한 bit-identical 결과가 구조적으로 불가능하더라도 불필요한 coloration, gain change 또는 stereo-image 변화가 발생해서는 안 된다.

---

# 22. Extreme Curve Test

다음을 반드시 테스트한다.

- minimum/maximum parameter
- 급격한 Curve 변화
- 매우 짧은 audio
- 긴 audio
- node가 매우 가까운 경우
- playback 중 node 이동
- playback 중 Pen 사용
- playback 중 Eraser 사용
- extreme parameter values
- render 시작/끝

다음 오류가 발생해서는 안 된다.

- NaN
- Infinity
- buffer overflow
- silence lock
- crash
- runaway feedback
- invalid Curve state

---

# 23. UI Design Principle

**Audio Curve Lab 및 다른 기존 Curve Lab UI를 먼저 검토한 후 Spectral Curve Lab을 디자인한다.**

일관성을 우선한다.

새로운 DAW를 만들지 않는다.

피해야 할 것:

- mixer
- channel strip
- track-based UI
- plugin rack
- patch cable
- 불필요한 knob 집합
- FFT technical controls의 전면 노출
- Spectral이라는 이유로 과도한 시각 효과 추가

사용자가 처음 화면을 보았을 때 이해해야 하는 것은:

> **Sound + Time + Curve + Spectral Transformation**

이다.

---

# 24. Visual Hierarchy

시각적 우선순위:

1. Waveform / Time
2. Selected Spectral Curve
3. Spectrogram
4. Parameter selection
5. Pen / Eraser / Curve editing tools
6. Playback / Render
7. Technical settings

Spectrogram이 Curve보다 시각적으로 강해지지 않도록 한다.

**Curve가 항상 가장 중요한 editing interface이다.**

---

# 25. 기존 Curve Lab과의 호환성

가능한 한 기존의 다음 시스템을 재사용한다.

- audio loading
- waveform
- timeline
- playhead
- Curve editor
- node manipulation
- interpolation
- Pen/Eraser architecture가 존재한다면 해당 구조
- playback
- transport
- render/export
- file handling
- Reset behavior
- common styling

특히 **Audio Curve Lab의 Curve 색상 구현, Curve rendering pattern, node rendering 및 interaction implementation을 먼저 분석한다.**

Spectral Curve Lab을 만들기 위해 기존의 안정적인 기능을 불필요하게 재작성하지 않는다.

---

# 26. 개발 순서

### Phase 1 — Reference Analysis

먼저 기존 Curve Lab들을 분석한다.

특히 Audio Curve Lab에서 다음을 파악한다.

- Curve rendering architecture
- Curve colors
- node model
- interpolation
- mouse/pointer interaction
- coordinate mapping
- timeline synchronization
- playhead
- playback
- render
- UI components
- styling variables

가능하면 기존 component를 그대로 재사용한다.

### Phase 2 — Spectral Curve Lab Shell

Audio loading, waveform, Curve Editor, Select/Pen/Eraser, playback이 정상 작동하는 기본 shell을 만든다.

아직 spectral effect를 구현하지 않는다.

### Phase 3 — Neutral STFT

다음 pipeline만 구현한다.

**Input → STFT → unchanged spectrum → inverse STFT → Output**

이 단계에서 spectral transformation을 하지 않는다.

원본과 resynthesized output의 음질 차이를 검증한다.

**Neutral STFT가 안정되기 전에는 다음 단계로 넘어가지 않는다.**

### Phase 4

Spectral Shift 하나만 구현한다.

Curve → spectral parameter → realtime preview → render 전체 경로를 검증한다.

### Phase 5

Spectral Stretch.

### Phase 6

Spectral Blur.

### Phase 7

Harmonicity.

### Phase 8

Spectral Freeze.

### Phase 9

SOURCE / OUTPUT Spectrogram.

### Phase 10

DSP optimization / artifact reduction / regression testing.

---

# 27. 개발 원칙

**기능 수보다 음질, 일관성, 예측 가능성을 우선한다.**

5개의 processor가 불완전한 것보다 Spectral Shift 하나가 음악적으로 훌륭하게 동작하는 것이 낫다.

새로운 기능을 임의로 추가하지 않는다.

새로운 UI language를 임의로 만들지 않는다.

기존 Curve Lab의 안정적인 코드를 불필요하게 변경하지 않는다.

기존 Curve Lab family와의 일관성을 유지한다.

특히:

> **Audio Curve Lab을 Curve UI/interaction의 기준 구현으로 삼는다.**

Spectral Curve Lab의 개성은 새로운 UI 문법을 만드는 데서 나오지 않고,

> **동일한 Curve language로 spectral structure를 다룰 수 있다는 것**

에서 나온다.

---

# 28. 첫 번째 작업 범위 — IMPORTANT

현재 작업에서는 전체 Spectral Curve Lab을 완성하지 않는다.

먼저 다음까지만 진행한다.

1. 기존 Curve Lab repository 전체 구조를 분석한다.
2. Audio Curve Lab을 중심으로 공통 UI/Curve 구현을 분석한다.
3. Spectral Curve Lab에 재사용할 component를 정리한다.
4. 사용자 표시 명칭을 `Curve Lab` 표기로 맞춘다.
5. Spectral Curve Lab 기본 shell을 만든다.
6. Select / Pen / Eraser의 기본 Curve editing을 구현한다.
7. 기존 Curve 색상 및 rendering pattern을 유지한다.
8. STFT analysis → unchanged spectrum → inverse STFT의 neutral pipeline을 구현한다.
9. realtime playback에서 검증한다.
10. offline render에서 검증한다.
11. 기존 Curve Lab에 regression이 없는지 확인한다.

**여기까지 완료한 뒤 멈춘다.**

아직 다음은 구현하지 않는다.

- Spectral Shift
- Spectral Stretch
- Spectral Blur
- Harmonicity
- Spectral Freeze

작업 완료 후 다음을 보고한다.

- 분석한 기존 Curve Lab 구조
- Audio Curve Lab에서 재사용한 component
- 변경한 파일
- 새로 만든 파일
- UI consistency를 위해 유지한 규칙
- Pen/Eraser 구현 방식
- Curve data structure
- STFT architecture
- FFT size
- hop size
- window
- overlap-add 방식
- realtime CPU 상태
- neutral input/output 테스트 결과
- 발견된 artifact
- regression 여부
- 다음 단계에서 Spectral Shift를 추가할 위치와 방법

첫 단계의 목표는 많은 기능을 보여주는 것이 아니다.

> **Curve Lab family와 완전히 일관된 UI/Curve System 위에 신뢰할 수 있는 Spectral Processing Foundation을 만드는 것**

이 목표가 충족되면 작업을 중단하고 다음 지시를 기다린다.