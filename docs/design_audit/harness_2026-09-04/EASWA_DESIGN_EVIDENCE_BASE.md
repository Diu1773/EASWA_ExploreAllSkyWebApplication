# EASWA Web Design Evidence Base
Version: 1.0  
Purpose: EASWA Design Harness의 근거 자료 정리

---

# 0. 조사 목적

EASWA 웹디자인을 다음 3축으로 검증하기 위한 근거를 정리한다.

1. **AI 티가 나지 않는 웹디자인**
2. **과학탐구 웹으로서의 적합성**
3. **EASWA만의 고유한 정체성**

근거는 세 수준으로 구분한다.

- **A급**: 대규모 조사 / 학술연구 / 공식 기관 평가
- **B급**: 디자이너·프론트엔드·브랜딩 실무 커뮤니티에서 반복되는 의견
- **C급**: 개별 사용자 경험담 및 사례

Reddit의 직업·전문성 표기는 대체로 자기소개이므로 자격 검증 자료가 아니라,
**독립적인 커뮤니티에서 같은 문제가 얼마나 반복되는지**를 보는 용도로 사용한다.

---

# 1. AXIS 1 — Anti-AI / Human-directed Design

## 1.1 대규모 커뮤니티 조사

### Vibecoded Design Tells
GitHub:
https://github.com/JCarterJohnson/vibecoded-design-tells

핵심 규모:
- 3,214,533 posts scanned
- 47 AI/SaaS subreddits
- 46,971 AI-site-related posts
- 3,033 comments
- 125 focused threads
- 2020–2026

핵심 결론:
- 가장 큰 신호는 특정 요소 하나보다 **“다 똑같아 보인다”**는 인상 자체
- shadcn/Tailwind default
- AI-purple
- excessive gradient
가 구체적 tell에서 강하게 등장
- bento / glassmorphism은 상대적으로 약한 신호
- mesh / aurora background는 독립 신호로 기각

주요 상대 언급:
- Default shadcn/Tailwind: 2.5%
- purple/indigo: 2.3%
- gradient: 2.0%
- excessive animation: ~1.1%
- rounded-everything: 0.8%
- dark + neon glow: 0.7%
- emoji icon: 0.5%
- generic typography: 0.4%
- centered hero + 3 cards + CTA: 0.4% comments / 1.6% posts
- centered-everything / excessive whitespace: 0.2%
- stock illustration: 0.2%
- glassmorphism: 0.2%
- bento: 0.1%

주의:
위 수치는 AI 판별 확률이 아니라 open-ended comment에서 자발적으로 언급된 빈도다.

---

## 1.2 디자이너 / 에이전시 커뮤니티 반응

### Homogenous AI-generated websites
Reddit:
https://www.reddit.com/r/agency/comments/1skbxo0/an_entitled_rant_about_homogenous_aigenerated/

반복되는 지적:
- Tailwind / Radix / shadcn 기본형
- overall minimal and safe design
- rounded cards with thin borders
- 3-column feature grid
- soft shadows
- gradient hero
- fade-in scroll animations

반복되는 불만:
- technically polished but generic
- brand personality가 사라짐
- “마지막 20%”에 사람의 art direction이 없음

실무적 조언:
- 실제 사진 사용
- custom visual element 최소 1개
- 한 곳이라도 의도적인 asymmetry
- 불필요 section 삭제
- typography를 프로젝트에 맞게 재정의
- AI 결과를 완성품이 아니라 draft로 취급

EASWA 적용:
- “깔끔함”보다 project-specific rationale 우선
- 탐구 구조가 design language를 결정

---

## 1.3 웹디자인 커뮤니티에서 반복되는 패턴

### Every Vibecoded Websites Looks the Same
https://www.reddit.com/r/web_design/comments/1uzascg/every_vibecoded_websites_looks_the_same/

반복 언급:
- overt gradients
- everything rounded
- big hero typography
- eyebrow text above titles
- arrow-suffix text links

중요한 반론:
- Bootstrap / WordPress 시대의 획일화와 유사
- 모든 일반 사용자가 AI 티를 신경 쓰는 것은 아님
- 목적이 단순 정보 전달이면 “good enough”도 의미 있음

EASWA 적용:
> anti-AI 때문에 익숙한 UX까지 버리는 것은 잘못이다.

---

## 1.4 카드 남용 관련 커뮤니티 반응

### AI loves cards
https://www.reddit.com/r/webdesign/comments/1u9kpvo/guys_delivered_this_design_recently_for_an/

반복되는 인상:
- AI가 다양한 크기의 rounded rectangular card를 과도하게 생성
- card 하나 자체보다 “모든 정보 관계를 card로 해결”하는 방식이 문제

EASWA 적용:
- figure
- table
- metadata
- plot
- controls
- annotation
을 card보다 우선

---

## 1.5 UI 디자이너 커뮤니티에서의 AI smell

### How can you tell a design is AI?
https://www.reddit.com/r/UI_Design/comments/1uchh8o/how_can_you_tell_a_design_is_ai/

반복 지적:
- poor visual hierarchy
- no balance
- no spacing system usage
- inconsistency
- structured chaos

중요한 해석:
> AI 디자인의 문제는 “못생김”이 아니라 반복되는 구조적 패턴과 의도 부족이다.

EASWA 적용:
- spacing system
- hierarchy
- component semantics
를 명시적으로 문서화

---

## 1.6 AI-generated image 관련 반응

### AI-generated images vs stock
https://www.reddit.com/r/webdesign/comments/1jnak7i/do_you_think_using_aigenerated_images_instead_of/

반복 반응:
- lifeless
- fake
- uncanny valley

### Hired web designer using AI images and art
https://www.reddit.com/r/webdesign/comments/1kez3o8/hired_web_designer_using_ai_images_and_art/

실무적 조언:
- AI 사용 자체보다 **brand fit / art direction**이 중요
- 사이트 전체와 맞지 않는 이미지는 브랜드를 cheap하게 보이게 함
- coherent concept가 필요

EASWA 적용:
이미지 우선순위:
1. actual EASWA output
2. actual survey/mission data
3. official astronomy imagery
4. actual observatory photo
5. explanatory diagram
6. generative image는 최후 수단

---

# 2. AXIS 2 — Scientific Inquiry Web

## 2.1 NASA Exoplanet Archive

공식 사이트:
https://exoplanetarchive.ipac.caltech.edu/

주요 기능:
- interactive tables
- plotting
- periodogram
- transit fitting
- RV fitting
- TAP
- API
- bulk download
- publication-linked parameters

설계 원리:
- 실제 scientific data가 페이지의 중심
- 값이 문헌과 연결됨
- 검색 → 분석 → export가 한 생태계 안에 있음

EASWA 적용:
> 데이터는 배경이 아니라 조작·비교 가능한 scientific object다.

---

## 2.2 SDSS SkyServer

공식 사이트:
https://skyserver.sdss.org/

특징:
- Navigate
- Explore
- Finding Chart
- Imaging Search
- Spectroscopic Search
- SQL Search
- educational projects

중요한 구조:
- 쉬운 검색과 전문 검색을 명시적으로 계층화
- novice와 advanced user를 같은 시스템 안에서 지원

EASWA 적용:
- BASIC
- GUIDED
- ADVANCED

progressive complexity 권장

---

## 2.3 ESASky

공식 사이트:
https://sky.esa.int/

핵심:
- target name
- coordinates
- author
- bibcode
기반 검색

특징:
- public astronomical data visualisation
- download
- science / explorer mode

EASWA 적용:
- level에 따라 interaction depth를 조절
- scientific identity 자체는 숨기지 않음

---

## 2.4 SIMBAD

공식 사이트:
https://simbad.cds.unistra.fr/

query mode:
- identifier
- coordinates
- criteria
- reference
- script
- TAP

정보 구조:
- coordinate system
- precision
- uncertainty
- reference / bibcode

EASWA 적용:
중요 수치에는 가능한 경우:
- value
- unit
- uncertainty
- source
- reference
를 함께 제공

---

## 2.5 Zooniverse 사용자 조사

관련 글:
https://blog.zooniverse.org/2018/06/04/whats-going-on-with-the-classify-interface-part-one/

조사 규모:
- beta tester mailing list 약 100,000명
- 응답 약 1,200명

주요 불만:
- 막혔을 때 어디로 가야 할지 모르겠다
- task가 끝난 뒤 next step이 불명확
- scrolling과 mouse movement가 많다
- keyboard shortcut이 없다
- feedback이 부족
- previous classifications를 보고 싶다
- image를 더 크게 보고 싶다

설계 변화:
- tutorial을 작업을 가리는 modal 중심에서
- task area 안에서 다시 확인 가능한 형태로 개선

EASWA 적용:
- help는 현재 context 안에서 접근
- next action이 명확
- 분석 화면에서 불필요한 이동 최소화
- scientific object를 크게 확보

---

## 2.6 NASA Astrophysics Archives Review

NASA 2024 archive review PDF:
https://science.nasa.gov/wp-content/uploads/2024/10/nasa-aar2024-final-tagged.pdf

핵심 평가:
- 강력한 archive라도 novice에게는 UI가 어려울 수 있음
- Firefly 등의 interface는 신규 사용자 진입장벽이 큼
- professional UI/UX expertise 필요
- focus group / community input 중요
- community user group, survey, workshop 지속 운영 권장

EASWA 적용:
- 전문 기능을 없애는 것이 아니라 진입경로를 scaffold
- 실제 사용자 검증을 디자인 프로세스에 포함

---

## 2.7 과학교육 / Web Inquiry 연구

### Web-based inquiry scaffolding
관련 연구:
https://www.sciencedirect.com/science/article/pii/S0360131511002806

요약:
- 18개 중등 과학학급
- 347명 학생
- 기술적 scaffold가 metacognitive awareness를 높이는 데 도움
- teacher + technology scaffold 조합이 다양한 학생 지원에 유리

설계 시사점:
- 자유 탐색만 제공하면 충분하지 않음
- 탐구 단계, prompt, 비교, 해석 scaffold 필요

### Technology-augmented inquiry / pedagogical visibility
Springer:
https://link.springer.com/article/10.1007/s11251-026-09788-1

실험 구성:
- experimental 46
- comparison 48

핵심:
- platform이 학생의 탐구과정을 가시화하면
- 교사가 결과가 아니라 과정 자체를 코칭할 수 있음

EASWA 적용:
- 결과만 보여주지 말고
- 사용자가 어떤 조건을 선택했고 어떤 과정을 거쳤는지 남겨야 함

---

## 2.8 천문 수업 교사 커뮤니티

예:
https://www.reddit.com/r/ScienceTeachers/comments/rhfxfy

반복되는 문제:
- 실제 data-gathering astronomy activity를 찾기 어려움
- 야간관측 / 장비 / 날씨 / 시간 제약
- 온라인 또는 공개자료 기반 대안 필요

EASWA 적용:
- 공개 관측자료를 브라우저에서 바로 쓰는 것 자체가 제품 강점
- “실제 데이터”를 숨기지 말고 전면에 내세워야 함

---

# 3. AXIS 3 — EASWA Identity

## 3.1 브랜드 / 포지셔닝 실무자 조언

브랜딩 커뮤니티에서 반복되는 핵심:
- branding 문제를 logo나 “premium look”부터 해결하려 하지 말 것
- 먼저 positioning을 정할 것
- 누구를 위한가
- 왜 선택해야 하는가
- 무엇이 다른가
- 무엇으로 기억되고 싶은가

관련 논의:
https://www.reddit.com/r/branding/comments/1vsdct1/is_branding_actually_a_design_problem/

핵심 문장:
> visual identity는 positioning과 promise의 표현이다.

EASWA 적용:
EASWA를 “깔끔한 천문교육 사이트”로 정의하지 않는다.

권장 product statement:
> 전문가용으로 공개된 실제 천문자료를 학교에서 수행 가능한 탐구 흐름으로 재구성하는 웹 기반 과학탐구 환경

---

## 3.2 Brand system consistency

관련 커뮤니티:
https://www.reddit.com/r/branding/comments/1o19put/for_agencies_whats_your_process_for_keeping_brand/

반복 조언:
- strict guideline만으로 부족
- living system도 필요
- handoff 문서는 “무엇을 쓰는가”뿐 아니라 “어떻게 생각하는가”도 설명해야 함

EASWA 적용:
- Design Harness
- design tokens
- reference components
- page audit
를 함께 유지

Claude Code 역시 “여러 디자이너”처럼 취급하고 source of truth를 강제한다.

---

## 3.3 Design systems 관점

관련 커뮤니티:
https://www.reddit.com/r/DesignSystems/comments/1pbkl97/building_a_design_system_in_2026/

반복 조언:
- mature component library 위에
- 자체 theme / design language를 구축하는 것이 현실적

EASWA 적용:
- shadcn을 무조건 제거할 필요는 없음
- appearance는 EASWA 전용으로 재정의
- component semantics는 과학탐구 기능과 연결

---

## 3.4 Logo-swap test

관련 critique 사례:
https://np.reddit.com/r/webdesign/comments/1ne4fca/made_this_design_in_7_days_as_an_amateur_please/

실전 테스트:
> 로고를 다른 것으로 바꿨는데도 사이트가 완전히 자연스럽다면 custom identity가 약하다.

EASWA 적용:
로고를 가려도 다음이 남아야 한다.
- actual astronomy data
- inquiry steps
- analysis controls
- measured vs reference
- interpretation
- record

이 구조 자체가 EASWA signature가 되어야 함.

---

# 4. EASWA Identity로 고정할 요소

외부 평균을 따라가지 않는다.

EASWA signature:
1. Public astronomy data
2. Guided scientific inquiry
3. Manipulable analysis conditions
4. Visible analytical process
5. Measured-vs-reference comparison
6. Interpretation
7. Student record

대표 workflow:
> 자료 확인 → 분석 조건 조절 → 분석·시각화 → 기준값 비교 → 해석 → 기록

이 workflow 자체가 브랜드 패턴이다.

---

# 5. 세 축의 통합 결론

## Axis 1 — 디자이너 / 프론트엔드 커뮤니티
AI는 평균적인 UI를 빠르게 만든다.

문제:
- default
- sameness
- art direction 부재

따라서:
> 사람이 의도와 맥락을 넣어야 한다.

## Axis 2 — 과학 사용자 / 교육 연구
강력한 도구만 제공하면 novice는 헤맨다.

문제:
- 진입장벽
- next action 불명확
- 도움말 맥락 분리
- 전문성 과다 / scaffold 부족

따라서:
> 실제 data와 scientific depth는 유지하되 탐구과정을 scaffold해야 한다.

## Axis 3 — 브랜드 / 디자인 시스템 실무
로고와 색만 바꾸면 정체성이 생기지 않는다.

문제:
- generic brand shell
- component drift
- product purpose와 visual language 분리

따라서:
> EASWA가 존재하는 이유가 디자인 언어를 결정해야 한다.

---

# 6. 최종 원칙

> AI의 평균적 웹디자인을 제거하고,
> 실제 천문자료를 다루는 과학적 정보구조를 기반으로 하되,
> 그 전문 자료를 EASWA 고유의 탐구 흐름으로 조직한 인터페이스를 만든다.

---

# 7. Design Harness에 연결할 방식

각 evidence는 다음 3단 구조로 사용한다.

**EVIDENCE BASE**
→ 실제 조사 / 커뮤니티 / 공식 평가 / 교육연구

**DESIGN RULE**
→ 구현 규칙으로 변환

**AUDIT METRIC**
→ 수치 / PASS-FAIL 기준으로 검증

예:

Evidence:
Zooniverse 사용자들이 과도한 scrolling과 불명확한 next step을 불만으로 제시

Design Rule:
주요 탐구화면에서 data + primary control + primary result를 가능한 한 한 화면에서 상호참조 가능하게 배치

Audit Metric:
- primary action 1개
- persistent inquiry state 1개
- analysis viewport에서 scientific content >= 45%
- help는 current context에서 접근
