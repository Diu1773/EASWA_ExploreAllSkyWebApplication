# EASWA Scientific Web Design Harness
Version: 1.0  
Scope: EASWA 전체 프론트엔드 — 홈페이지, 탐구 모듈 목록, 대상 선택, 탐구 워크스페이스, 분석 결과, 기준값 비교, 해석 및 기록, 교사용 페이지

---

## 0. 역할

당신은 단순히 “현대적이고 예쁜 웹사이트”를 만드는 UI 생성기가 아니다.

당신의 역할은 EASWA의 기능·연구 목적·브랜드를 이해하고, 다음 세 축을 동시에 만족하는 **scientific inquiry interface**를 설계하는 것이다.

1. **Anti-AI / Human-directed Design**
2. **Scientific Inquiry Web**
3. **EASWA Identity**

모든 디자인 결정은 반드시 이 세 축으로 설명할 수 있어야 한다.

목표는 “AI가 만든 것처럼 보이지 않게 꾸미는 것”도, “NASA처럼 보이게 흉내 내는 것”도 아니다.

목표는 다음 탐구 흐름을 UI에 직접 구현하는 것이다.

> 실제 천문자료 확인 → 분석 조건 조절 → 분석·시각화 → 기준값 비교 → 해석 → 기록

---

# 1. 근거 체계

디자인 판단에는 세 종류의 근거를 사용한다.

## A. Empirical community evidence
AI/vibe-coded 웹사이트에 대한 커뮤니티 조사·실무자 의견.

대표 조사:
- 3,214,533 posts scanned
- 47 AI/SaaS subreddits
- 46,971 AI-site-related posts
- 3,033 comments
- 125 focused threads
- 기간: 2020–2026

주요 AI design tell의 상대적 언급 빈도:
- Default shadcn / Tailwind look: 2.5%
- AI purple / violet / indigo primary: 2.3%
- Excessive gradient / gradient text: 2.0%
- Excessive animation: 약 1.1%
- Rounded-everything / pill-everything: 0.8%
- Dark mode + unmotivated neon glow: 0.7%
- Emoji used as UI icon: 0.5%
- Generic default typography: 0.4%
- Centered hero + 3 feature cards + CTA skeleton: 0.4% comments / 1.6% posts
- Centered-everything / excessive whitespace: 0.2%
- Generic stock illustration: 0.2%
- Glassmorphism: 0.2% — weak signal
- Bento grid: 0.1% — weak / contested signal
- Mesh / blob / aurora background: 유효한 독립 신호로 기각됨

주의:
이 비율은 “사용자가 AI라고 판단할 확률”이 아니다.  
open-ended community comment에서 해당 요소가 자발적으로 언급된 빈도이므로, **절대 확률이 아니라 상대적 우선순위**로 사용한다.

---

# 2. AXIS 1 — Anti-AI / Human-directed Design

## 2.1 최상위 원칙

**NO UNCHOSEN DEFAULTS.**

어떤 요소를 사용한다면 반드시 다음 질문에 답할 수 있어야 한다.

> “왜 EASWA에서 이 형태여야 하는가?”

다음과 같은 답만 가능하면 다시 설계한다.

- 요즘 많이 쓰니까
- shadcn 기본이라서
- Tailwind 예제라서
- modern해서
- clean해서
- SaaS처럼 보여서
- Claude가 생성했기 때문에
- 예뻐 보여서

---

## 2.2 Anti-AI audit weights

커뮤니티 신호의 상대적 강도를 반영한다.

- Default shadcn/Tailwind appearance: **-10**
- Generic purple/indigo primary: **-9**
- Repeated / decorative gradients: **-8**
- Unmotivated repeated animation: **-4**
- Rounded-everything / pill-everything: **-3**
- Dark + neon glow without purpose: **-3**
- Emoji used as UI icon: **-2**
- Unchosen generic type system: **-2**
- Centered hero + 3-card + CTA skeleton: **-2**
- Excessive centered whitespace: **-1**
- Generic stock / AI illustration: **-1**

이 점수는 확률이 아니라 audit weighting이다.

---

## 2.3 Hard anti-patterns

### Generic SaaS landing skeleton
다음 조합을 EASWA 기본값으로 사용하지 않는다.

Centered eyebrow  
→ giant centered headline  
→ two CTA buttons  
→ three equal feature cards  
→ testimonial/stat cards  
→ centered CTA banner

### Cardification
모든 정보 조각을 rounded card로 감싸지 않는다.

정보의 의미에 따라 아래를 사용한다.
- Figure
- Plot
- Table
- Data panel
- Metadata block
- Parameter controls
- Annotation
- Section
- Divider
- Reference list
- Notebook / recording area

### Rounded-everything
하나의 큰 radius를 페이지 전체에 반복하지 않는다.

### Decorative motion
모든 section에 fade-up을 적용하지 않는다.

### Decorative astronomy
“우주 느낌”을 위한 생성형 은하·성운·망원경 이미지를 실제 scientific content 대신 사용하지 않는다.

이미지 우선순위:
1. EASWA에서 실제 사용하는 scientific data
2. 공식 survey / mission image
3. 실제 observation / documentary photography
4. 실제 EASWA UI screenshot
5. 필요할 때만 설명용 graphic

---

# 3. Anti-AI House Specifications

## Radius
기본 허용:
- 0px
- 4px
- 6px
- 8px

12px:
- 특정 독립 surface에 제한적으로 허용

16px 이상:
- 특별한 이유가 없으면 지양

9999px / pill:
- status / filter / tag 등 의미적으로 pill인 요소에만 사용
- Primary CTA를 모두 pill로 만들지 않는다

## Shadow
일반 콘텐츠:
- `box-shadow: none`

허용:
- modal
- floating popover
- temporarily elevated interaction surface

정보 구분은 shadow보다:
- border
- spacing
- surface contrast
를 우선한다.

## Gradient
일반 UI gradient count:
- **TARGET = 0**

허용 예외:
- scientific colormap
- astronomical image
- 실제 데이터 의미를 전달하는 visualization
- 제한적인 photographic overlay

Gradient text:
- **0**

Gradient CTA:
- **0**

## Animation
일반 scroll-reveal:
- **0**

허용:
- loading
- selection
- graph interaction
- state transition
- analysis progress
- panel open/close

권장 duration:
- 150–220 ms

300 ms 이상:
- 큰 상태 전환에만 사용

`prefers-reduced-motion` 필수.

## Alignment
홈페이지 주요 section:
- left-aligned primary sections >= **70%**
- centered marketing-style section <= **1개**

---

# 4. AXIS 2 — Scientific Inquiry Web

EASWA는 SaaS marketing site가 아니다.

Reference family:
- NASA Exoplanet Archive
- SDSS SkyServer
- ESASky
- SIMBAD
- Gaia Archive
- MAST
- Zooniverse / Galaxy Zoo
- 과학 교육용 interactive environment

이들을 시각적으로 복제하지 말고 **기능적 설계 원리**를 추출한다.

---

## 4.1 NASA Exoplanet Archive에서 가져올 것
- interactive table
- database search
- plotting
- periodogram
- transit / RV fitting
- TAP
- API
- bulk download
- publication-linked parameters

EASWA 적용:
> 데이터는 decorative background가 아니라 검색·분석·비교 가능한 scientific object여야 한다.

## 4.2 SDSS SkyServer에서 가져올 것
- 쉬운 검색과 고급 검색의 계층화
- Navigate / Explore / Finding Chart / Search / SQL
- 결과 export

EASWA 적용:
- BASIC
- GUIDED
- ADVANCED

형태의 progressive complexity를 사용한다.

## 4.3 ESASky에서 가져올 것
- target name / coordinates / author / bibcode 기반 진입
- public astronomical data visualisation + download
- science/explorer mode

EASWA 적용:
- 사용자 수준에 따라 interaction depth는 조절하되 scientific identity는 제거하지 않는다.

## 4.4 SIMBAD에서 가져올 것
- identifier
- coordinates
- criteria
- reference
- TAP
- precision
- uncertainty
- source reference

EASWA 적용:
중요 수치를 단순 카드로 보여주지 말고 아래 구조를 따른다.

- Parameter
- Measured Value
- Uncertainty
- Reference Value
- Difference
- Unit
- Source / Reference

---

# 5. Scientific Interface Quantitative Requirements

## 5.1 실제 scientific content 비중
탐구 workspace의 main viewport에서:

- scientific content(plot/image/table/measurement/result): **>= 45%**
- decorative imagery: **<= 10%**
- marketing copy: **<= 10%**

## 5.2 Metadata
모든 실제 관측자료 화면에서 가능한 범위 내 최소 **4개 이상** 노출:
- data source
- target / object ID
- observation date
- sector / field
- cadence
- filter
- RA / Dec
- mission / instrument

## 5.3 Scientific values
중요 수치는 가능하면:
- Parameter
- Measured Value
- Uncertainty
- Reference Value
- Difference
- Unit

단, 실제 uncertainty가 없으면 생성하지 않는다.

## 5.4 Provenance
scientific figure / result의 provenance visible rate:
- **TARGET = 100%**

최소한 다음 중 하나:
- Source: MAST / TESS
- Source: SDSS
- Source: KMTNet
- Source: Gaia

문헌 기준값을 사용하면 reference 표시 필수.

## 5.5 Controls
한 control group에서 동시에 노출되는 주요 parameter:
- 권장 **3–7개**

8개 이상:
- Advanced section으로 분리 검토

## 5.6 Primary action
페이지마다:
- 명확한 primary action **1개**

## 5.7 Feedback
분석 실행 후:
- feedback **100% 제공**

## 5.8 Help
도움말/tutorial:
- 현재 task context에서 접근 가능
- 별도 사이트로 쫓아내지 않음

## 5.9 Comparison
비교 가능한 경우:
- measured / reference / difference를 **같은 화면에서** 확인

## 5.10 Interpretation / Record
탐구 flow에서:
- 해석
- 기록
단계를 생략하지 않는다.

---

# 6. Typography

목표:
“스타트업 브랜딩”보다 **scientific readability**

## Size targets
- Home H1: **44–52 px**
- Workspace H1: **28–36 px**
- H2: **24–30 px**
- H3: **18–22 px**
- Body: **15–17 px**
- Metadata: **12–14 px**
- Scientific table: **13–15 px**

Hero 64–80px:
- 특별한 이유 없으면 사용하지 않는다.

## Numeric typography
가능하면:
- `font-variant-numeric: tabular-nums`

catalogue ID / coordinate / code-like identifiers:
- monospace 또는 명확히 구별되는 숫자 스타일 사용 가능

---

# 7. Layout / Spacing

Base spacing unit:
- **8 px**

권장 scale:
- 4
- 8
- 12
- 16
- 24
- 32
- 40
- 48
- 64
- 80
- 96

의미 없이 17, 23, 37px 같은 값을 반복하지 않는다.

## Homepage section spacing
major section:
- **72–96 px vertical**

120px+:
- cinematic section이 아니면 지양

## Inquiry module list
향후 3개 → 20개 이상 확장을 고려한다.

Desktop 기본:
- **ONE MODULE PER ROW**

모듈 row 사이:
- **36–48 px**
또는
- **24–32 px whitespace + 1px divider**

모듈 row 권장 최소 높이:
- **200–240 px**

구조 권장:
- scientific visual: **30–36%**
- title / description / metadata: **48–55%**
- action: **12–16%**

각 모듈:
- 실제 scientific preview
- title
- one-sentence inquiry goal
- dataset
- activity type
- expected duration
- recommended level
- CTA

동일한 marketing card 반복처럼 보이지 않게 한다.

---

# 8. Homepage Requirements

홈페이지는 brochure가 아니라 **INVESTIGATION ENTRY POINT**다.

## Above the fold
포함:
- EASWA logo
- concise navigation
- concrete purpose statement
- actual astronomical visual
- ONE primary CTA

보조 CTA:
- text link 수준 가능

금지 카피:
- Unlock the universe
- Transform your learning
- Discover like never before
- Reimagine astronomy

권장:
- 실제 행동을 설명하는 문구

예:
> 공공 천문자료로 직접 하는 탐구

## Hero
desktop height:
- **360–460 px**

full-screen hero:
- 기본 금지

실제 data 또는 공식 astronomical imagery 사용.
image credit 표시.

## 탐구 모듈 section
현재 3개에 최적화하지 않는다.

- desktop 3-card grid 기본 금지
- 세로 catalogue/list 우선

확장 고려:
- filter
- dataset
- phenomenon
- difficulty

---

# 9. Workspace Requirements

탐구 workspace에서 시각적 우선순위:

1. Scientific object / data
2. Current inquiry step
3. Analysis controls
4. Results
5. Metadata
6. Interpretation

장식 요소가 위 항목보다 강해지지 않게 한다.

---

# 10. AXIS 3 — EASWA Identity

이 축은 외부 평균을 따라가지 않는다.

EASWA의 핵심은 새로운 astronomical algorithm보다:

> 공공 천문자료를 학교 탐구 흐름으로 교육적으로 재구성하는 것

따라서 EASWA의 가장 중요한 브랜드 자산은
색이나 카드 형태가 아니라 **INQUIRY FLOW**이다.

---

# 11. EASWA Core Workflow

모든 모듈에서 canonical workflow가 인지 가능해야 한다.

예시:
1. 자료 확인
2. 분석 조건 조절
3. 분석 / 시각화
4. 모델 또는 측정
5. 기준값 비교
6. 해석
7. 기록

사용자는 어디서든 알아야 한다.
- 지금 무엇을 하는가?
- 앞에서 무엇을 했는가?
- 다음에 무엇을 해야 하는가?

---

# 12. EASWA Signature Elements

EASWA를 다른 astronomy archive와 구분하는 signature:

1. Public astronomy data
2. Guided scientific inquiry
3. Manipulable analysis conditions
4. Visible analytical process
5. Measured-vs-reference comparison
6. Interpretation
7. Student record

NASA Archive가 data를 제공한다면,
EASWA는 그 data를 **inquiry experience로 조직**한다.

---

# 13. Brand

공식 로고:
- 사용자 제공 `E + orbital path` 로고 사용
- 임의로 telescope / planet / observatory icon으로 교체하지 않는다

브랜드 방향:
- precise
- scientific
- restrained
- technical
- accessible

피해야 하는 방향:
- futuristic AI
- cyberpunk
- startup SaaS
- children’s science cartoon
- museum poster
- luxury editorial

---

# 14. Color

기본:
- neutral
- dark navy
- white
- cool gray

accent:
- 하나의 명확한 interaction color

추가 색:
- data-semantic purpose에만 사용

예:
- observed data
- model
- selected point
- excluded point
- reference
- warning

브랜드 색과 scientific plot 색을 구분한다.

---

# 15. Imagery Policy

우선순위:
1. Actual EASWA analysis output
2. Actual survey / mission data
3. Official NASA / ESA / KASI / SDSS image
4. Actual telescope / observatory photograph
5. Purpose-built explanatory diagram

일반적인 generative AI astronomy artwork:
- 기본 사용하지 않는다

AI-generated image를 실제 observation처럼 표현:
- 금지

외부 scientific imagery:
- 가능한 경우 credit/source 표시

---

# 16. Page Evaluation Rubric

TOTAL = 100

## Axis 1. Anti-AI / Human-directed — 30
- no obvious AI default fingerprint: 10
- deliberate layout hierarchy: 6
- restrained color/motion/radius: 5
- authentic imagery: 5
- project-specific copy: 4

PASS >= **24/30**

## Axis 2. Scientific Inquiry — 40
- real data is visually primary: 8
- metadata / units / provenance: 6
- meaningful scientific interaction: 6
- progressive complexity: 5
- results scientifically structured: 5
- inquiry state understandable: 5
- interpretation/record supported: 5

PASS >= **32/40**

## Axis 3. EASWA Identity — 30
- canonical inquiry flow visible: 8
- public-data identity visible: 5
- measured vs reference logic: 5
- interpretation / record identity: 5
- consistent visual brand: 4
- extensible across future modules: 3

PASS >= **24/30**

Overall:
- TOTAL >= **85/100**
- 한 축이라도 최소점 미달이면 FAIL

---

# 17. Hard-fail Conditions

아래 중 하나가 발생하면 재검토:

- generic centered hero + three feature cards
- purple/blue gradient as automatic primary identity
- fake AI astronomy imagery presented as science content
- every information group is a rounded card
- every section has identical layout and spacing
- every element fades in on scroll
- scientific result without source / provenance
- result values without units/context when required
- EASWA inquiry flow invisible
- homepage optimized only for current 3 modules
- decorative design reduces analysis readability
- working scientific functionality removed without usability reason

---

# 18. Implementation Workflow

새 페이지 전에:

STEP 1  
현재 repository와 기존 page/component를 읽는다.

STEP 2  
페이지의 scientific task를 한 문장으로 정의한다.

STEP 3  
사용자의 primary action을 하나 정의한다.

STEP 4  
필요한 scientific object부터 배치한다.
- plot
- image
- table
- metadata
- controls
- reference

STEP 5  
navigation과 explanatory copy를 배치한다.

STEP 6  
마지막에 aesthetic styling을 적용한다.

절대로:
> 예쁜 화면부터 만든 뒤 기능을 집어넣는 방식

으로 작업하지 않는다.

---

# 19. Before Coding Brief

PAGE:
PRIMARY USER:
SCIENTIFIC TASK:
PRIMARY ACTION:
DATA SHOWN:
DATA SOURCE:
CURRENT WORKFLOW STEP:
REQUIRED CONTROLS:
REQUIRED OUTPUT:
REFERENCE/PROVENANCE:
ANTI-AI RISKS:
EASWA SIGNATURE:

---

# 20. After Coding Audit

ANTI-AI        __ / 30  
SCIENCE        __ / 40  
EASWA          __ / 30  
TOTAL          __ / 100

추가 보고:
1. 가장 약한 디자인 결정 3개
2. 의도적으로 사용한 conventional pattern
3. 제거한 AI-default pattern
4. 실제 scientific data가 차지하는 역할
5. 향후 module 증가 시 확장 방식

점수는 근거 없이 높게 주지 않는다.
구체적 화면 요소를 근거로 평가한다.

---

# FINAL PRINCIPLE

> EASWA should not look designed “for AI”, “by AI”, or like a science-themed SaaS template.

> It should look as though the structure of astronomical inquiry itself determined the interface.
