# ARS 3차 — 인용 무결성 검사

- **검사 대상**: `C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\EASWA_논문_v17.md` (610행, 2026-09-09 07:19 기준)
- **로컬 원문 저장소**: `C:\Users\bmffr\Desktop\Research\ERP2026\` (PDF 35개)
- **투고처 형식**: 한국현장과학교육학회 규정 제10조
- **검사일**: 2026-09-09 · **원고는 읽기만 했고 한 글자도 고치지 않았다.**

판정은 세 값만 쓴다 — **원문 확인(쪽수 포함)** / **원문에 없음** / **확인 못 함**.
심각도는 **상**(게재 전 수정 필수) / **중**(권고) / **하**(선택).

---

## 0. 검사한 문헌 수 — 분모를 먼저 밝힌다

| 구분 | 수 |
|---|---|
| 참고문헌 총 항목 | **60** (국문 10 · 영문 50) |
| 로컬 PDF로 원문을 직접 연 항목 | **34 / 60** |
| 웹에서 원문·서지를 확인한 항목 | 3절 참조 |
| 원문을 전혀 못 본 항목 | 4절 참조 |

`Desktop\Research\ERP2026\`의 PDF는 35개이지만 그중 **`Paczyski1986.pdf`는 Paczyński(1986)가 아니다**(2-3 참조).
따라서 로컬에서 실제로 대조에 쓸 수 있었던 원문은 34편이다.

**「전부 확인했다」고 말할 수 없다.** 아래 각 판정에는 그 판정의 근거가 원문 어느 쪽인지를 함께 적었다.

---

## 1. 본문 ↔ 참고문헌 양방향 대조

원고 본문(1행–436행)과 부록(505행–610행)의 인용을 기계로 전수 추출해 목록(437행–503행)과 맞췄다.

| 항목 | 결과 |
|---|---|
| 본문에 있으나 참고문헌에 없는 인용 | **0건** |
| 참고문헌에 있으나 본문에 한 번도 안 나오는 항목 | **1건** |
| 저자·연도가 같은데 a·b 구분이 없는 항목 | **1쌍** |

### 1-1. 인용되지 않은 참고문헌 1건 — **상**

**L470 `Goodman, A. A., Fay, J., Muench, A., Pepe, A., Udomprasert, P. and Wong, C. (2012) WorldWide Telescope in research and education. arXiv:1201.1285.`**

본문·부록 어디에서도 이 항목을 가리키는 인용이 없다. 본문의 `(Goodman, 2012)`는
L93·L119 두 곳뿐이고 둘 다 **시각적 표상**을 근거로 드는 자리여서, 바로 위 항목인
`Goodman, A. A. (2012) Principles of high-dimensional data visualization in astronomy`를
가리킨다(2-1에서 원문 확인). WorldWide Telescope 자체는 L49에서 Rosenfield et al.(2018)로,
WWT 기반 교육 프로그램은 L51에서 Guo et al.(2024)·Udomprasert et al.(2012)로 인용한다.

> v16 검사(`ars2_2026-09-08/integrity.md` 3-8)에서 미인용 참고문헌이 10건이었다.
> v17에서 9건이 해소되고 이 1건만 남았다.

### 1-2. `Goodman, 2012`이 두 항목을 동시에 가리킨다 — **상**

L469와 L470이 모두 `Goodman, A. A. ... (2012)`다. 본문의 `(Goodman, 2012)`만으로는
독자가 둘 중 어느 것인지 알 수 없다. 1-1을 삭제하면 함께 풀리고, 남긴다면 `2012a`·`2012b`가 필요하다.

---

## 2. 원문 대조 — 로컬 PDF로 직접 연 34편

### 2-1. 지시된 우선 항목

#### Sweller (1988) — 2.3과 표 3-1

- **서지**: PDF 1쪽 머리글 `COGNITIVE SCIENCE 12, 257-285 (1988)`. 목록의 `Cognitive Science 12: 257-285`와 **일치**.
- **2.3(L89) 「작업기억의 용량이 제한되어 있으므로 학습 목표와 직접 관련되지 않은 처리 요구가 증가할 경우 개념 이해와 문제 해결에 사용할 인지 자원이 줄어들 수 있다」**
  → **원문 확인 (p.261)**. 「Cognitive Processing Capacity」 절: *"The cognitive-processing capacity needed to handle this information may be of such a magnitude as to leave little for schema acquisition, even if the problem is solved."*
  작업기억의 제한은 p.264 *"human short-term memory is severely limited and any problem that requires a large number of items to be stored in short-term memory may contribute to an excessive cognitive load"*에서도 확인된다.
- **표 3-1(L115·L118)의 「외재적 부하」** → **원문에 없음**.
  `extraneous`는 이 논문 29쪽 전체에서 **0회**다. Sweller(1988)의 어휘는 `cognitive load`,
  `limited cognitive processing capacity`, `short-term memory`이며 **내재적·외재적·본유적 부하의 삼분은 이 논문에 없다**
  (Chandler & Sweller 1991, Sweller·van Merriënboer & Paas 1998 이후의 개념이다).
  본문 2.3은 「학습 목표와 직접 관련되지 않은 처리 요구」라고 풀어 써서 문제가 없는데,
  표 3-1만 `외재적 부하`라는 용어를 쓰면서 Sweller(1988)를 근거로 달았다. **상**

#### Chinn & Malhotra (2002) — 표 3-1

- **서지**: 본문 시작 쪽이 175, 44쪽 분량이므로 175–218. 목록의 `Science Education 86: 175-218`과 **일치**.
- **표 3-1(L116) 「탐구 과업에서 연구 질문의 생성이 갖는 위치」**
  → **원문 확인 (Table 1, p.180 / 본문 p.183)**.
  Table 1 첫 행 `Generating research questions`: 실제 연구는 *"Scientists generate their own research questions."*,
  단순 실험·단순 관찰·단순 예시 셋 모두 *"Research question is provided to students."*
  본문 p.183: *"In simple inquiry tasks, students are told what the research question is ... in authentic research, scientists must develop and employ strategies to figure out for themselves what their research question is."*
- **2.1(L73)이 든 비교 축 여덟 가지** → **원문 확인 (Table 1, pp.180–182 / Table 2, p.188)**.
  연구 질문의 형성=`Generating research questions`(p.180), 연구 설계=`Designing studies`(p.180),
  관찰=`Making observations`(p.181), 자료 변환=`Transforming observations`(p.181),
  결함 검토=`Finding flaws`(p.181), 간접 추론=`Indirect reasoning`(p.181),
  일반화=`Generalizations`(p.181), 이론과 자료의 조정=`Theory–data coordination`(p.187 절, Table 2 p.188).
- **2.1(L73) 「학생이 다른 연구자의 보고를 읽는 활동은 포함되지 않았다」**
  → **원문 확인 (Table 1, p.182)**. `Studying research reports` 행이 세 유형 모두 *"Students do not read research reports."*
- **2.1(L73) 「무엇을 측정할지도 지시되며」**
  → **원문 확인 (Table 1, p.180)**. `Selecting variables` 행: *"Students investigate one or two provided variables"* /
  *"Students observe prescribed features"* / *"Students employ provided variables."*

#### Elo & Kyngäs (2008) — 3.6의 세 자리

지시받은 대로 **세 자리를 각각 쪽수로 분리**했다. PDF 2쪽이 학술지 107쪽이므로 학술지 쪽 = PDF 쪽 + 105.

| 원고가 붙인 주장 | 판정 | 근거 쪽 |
|---|---|---|
| ① 서술형 응답을 **질적 내용분석 절차**로 처리(L155) | **원문 확인** | 논문 전체(JAN 62(1) **pp.107–115**). 초록: *"Both inductive and deductive analysis processes are represented as three main phases: preparation, organizing and reporting."* |
| ② **내적 타당도를 확인하는 방법이 하나로 정해져 있지 않다**(L157) | **원문 확인** | **pp.112–113**. p.112 끝: *"The internal validity of content analysis can be assessed as face validity or by using agreement coefficients (Weber 1990)."* → 두 갈래를 나란히 둔다. p.113 첫 문단: *"However, there are various opinions about seeking agreement (Graneheim & Lundman 2004), because each researcher interpret the data according to their subjective perspective and co-researchers could come up with an alternative interpretation (Sandelowski 1995)."* 같은 쪽: *"there is no simple, 'right' way of doing it."* |
| ③ **1차 범주를 초기 범주로 쓰되 새 범주 추가를 허용**(L155) | **원문 확인** | **pp.111–112**. p.111: *"When using an unconstrained matrix, different categories are created within its bounds, following the principles of inductive content analysis."* p.112 첫 문단: *"aspects that do not fit the categorization frame can be used to create their own concepts, based on the principles of inductive content analysis."* |

**②의 뒷부분에만 어긋남이 있다.** 원고 L157은 「**연구자 한 사람이 분석을 수행할 때** 부호화자 간
합의 절차가 반드시 적절한 것은 아니라는 지적」이라고 조건을 달았는데, Elo & Kyngäs가 p.113에서
말한 것은 **연구자 수와 무관하게** 합의 추구에 여러 견해가 있다는 것이다. 「연구자 한 사람일 때」라는
조건은 이 논문에 없다. 그 조건을 지탱하는 것은 함께 인용한 McDonald et al.(2019)이어야 하며,
그 확인 결과는 3절에 있다. **중**

- **서지**: PDF 2쪽 `Journal of Advanced Nursing 62(1), 107–115`. 목록의 `Journal of Advanced Nursing 62: 107-115`와 **일치**.

#### Daylan et al. (2021) — 표 4-5의 문헌값

- **0.12488 ± 0.00072** → **원문 확인 (Table 2, 프리프린트 9쪽)**.
  arXiv:1909.03000v2의 `Table 2. Parameters, posterior quantiles, and priors of the fitted and derived parameters of the global light curve model.` 첫 행
  `Rp/R⋆  0.12488 ± 0.00072`(FBSC = Flat Baseline Single planetary Component, 논문의 nominal fit).
  같은 값이 11쪽 사후분포 그림에도 `Rp/R⋆ = 0.12488 ± 0.00072`로 적혀 있다.
- **4.4(L247) 「문헌과 같은 자료(TESS 섹터 7, 2분 케이던스)」** → **원문 확인 (2쪽)**.
  *"mission at 2 minute cadence during Sector 7."*
- 표 4-5의 「문헌값 대비」 백분율 5개를 다시 계산했다 — −12.8 / −8.6 / −8.9 / −4.9 / −2.8 **모두 일치**한다.

#### Claret (2017) — 4.3의 주연감광 표 값

- **4.3(L229) 「주연감광 계수는 모항성의 물성에 따른 표 값을 기본 고정값으로 두었다」**
  → **원문 확인 (초록 1쪽 · 3절 2쪽)**.
  초록: *"new gravity and limb-darkening coefficients for a wide range of effective temperatures, gravities, metallicities, and microturbulent velocities"*,
  *"computed specifically for the photometric system of the space mission TESS"*.
  2쪽: *"These grids cover together 19 metallicities ranging from 10⁻⁵ up to 10⁺¹ solar abundance, 0 ≤ log g ≤ 6.0 and 1500 K ≤ Teff ≤ 50000 K. The values of the microturbulent velocities (Vξ) are 0, 1, 2, 4, 8 km/s."*
  표 자체(Tables 2–29)는 논문에 실리지 않고 CDS에 전자자료로 있다(1쪽 각주).
- 로컬 파일은 arXiv:1804.10295v1(2018-04-26 게시)이라 A&A 600:A30(2017)이라는 권·논문번호는
  여기서 확인되지 않는다 — 3절 참조.

#### Michels et al. (2026), Song et al. (2026), Uddin (2026) — 1.2와 5.5

| 원고가 붙인 주장 | 판정 | 근거 |
|---|---|---|
| L53 「자연어로 의도를 기술하고 생성된 코드를 실행해 확인하는 개발 방식」(Michels) | **원문 확인 (초록 1쪽)** | *"vibe coding — AI-assisted software development in which the developer describes intent in natural language and validates results by running rather than reading the generated code"* |
| L53 「전문 개발자가 아니어도 웹 응용을 구성할 수 있는 범위가 넓어졌으며」(Michels) | **원문 확인 (3.2절, 4쪽)** | *"Browser-based full-stack builders (Bolt.new, Lovable, v0 by Vercel, Replit) allow non-developers to generate complete web applications from a description"* |
| L53 「교사가 이 방식으로 자신의 수업에 쓸 학습 도구를 직접 만드는 과정을 다룬 연구」(Song) | **원문 확인 (서론, 3–4쪽)** | 제목이 `A Guiding Framework for K-12 Teachers in Creating AI-powered Learning Technologies through Vibe Coding`이고, 4쪽에 *"we address these gaps by proposing a guiding framework to support K-12 teachers in creating AI-powered learning technologies through AI-assisted vibe coding ... we conducted an eight-week design workshop with three teachers"* |
| L53 「이렇게 생성한 코드는 오류 없이 실행되면서도 산출값이 틀릴 수 있다」(Uddin) | **원문 확인 (초록 1쪽 · 2쪽)** | 초록: *"the threat of silent failures, wherein generated code compiles perfectly but executes flawed mathematical safety logic"*, *"an alarming ~45% overall Silent Failure Rate"* |

- Michels의 arXiv 번호는 PDF 1쪽 여백에 `arXiv:2608.20446v1 [cs.SE] 20 Aug 2026`으로 찍혀 있어 목록과 **일치**.
- Song·Uddin의 PDF에는 arXiv 도장이 없다. 목록의 `arXiv:2607.05406`·`arXiv:2604.12311` 확인은 3절 참조.
- Song의 저자 6인(Yukyeong Song, Seoyeon Choi, Jinhee Kim, Yeongje Kim, Lauren Weisberg, Jewoong Moon)이 목록과 **일치**.

### 2-2. 그 밖에 로컬 원문으로 확인한 문헌

| 문헌 | 원고가 붙인 주장(행) | 판정 | 근거 쪽 |
|---|---|---|---|
| Delrez et al. (2016) | 공전 주기·식 중심 시각을 문헌값으로 고정(L229) | **원문 확인** | 초록 1쪽 `transits every 1.2749255⁺⁰·⁰⁰⁰⁰⁰²⁰ days`, 광도곡선 매개변수 표에 `T0 - 2 450 000 [HJD_TDB]`와 `Orbital period P [d] 1.2749255` |
| Kreidberg (2015) | batman 기반 식현상 모델 적합(L229) | **원문 확인** | 초록 1쪽 *"batman, a Python package for modeling exoplanet transit and eclipse light curves"* |
| Mandel & Agol (2002) | 위와 같은 자리 | **원문 확인** | 초록 1쪽 *"exact analytic formulae for the eclipse of a star described by quadratic or nonlinear limb darkening"* |
| Foreman-Mackey et al. (2013) | 표본 기반 추정(MCMC)은 선택 기능(L229) | **원문 확인** | 초록 1쪽 *"a stable, well tested Python implementation of the affine-invariant ensemble sampler for Markov chain Monte Carlo (MCMC)"* |
| Bressan et al. (2012) | PARSEC 등시선(L229·부록2) | **원문 확인** | 1쪽 제목·초록 `PARSEC: stellar tracks and isochrones with the PAdova & TRieste Stellar Evolution Code` |
| Cantat-Gaudin et al. (2020) | 성단의 거리·나이·소광 기준값(L231) | **원문 확인** | 초록 2쪽 *"estimate the distance, age, and interstellar reddening for about 2000 stellar clusters"*, 3쪽 *"targets are the cluster age, extinction, and distance modulus"* |
| Wang & Chen (2019) | 성간소광을 Gaia 통과대역 계수로 적용(L231) | **원문 확인** | 초록 1쪽. Gaia G·G_BP·G_RP를 기준 밴드로 삼아 상대소광 A_λ/A_GRP를 21개 밴드에서 결정 |
| Gaia Collaboration et al. (2023) | Gaia DR3 카탈로그(L231) | **원문 확인** | 1쪽 `Gaia Data Release 3: Summary of the content and survey properties` |
| Wenger et al. (2000) | SIMBAD가 식별 정보·좌표·문헌·측정 정보를 제공(L49) | **원문 확인** | 초록 1쪽 *"It contains identifications, 'basic data', bibliography, and selected observational measurements for several million astronomical objects."* |
| Ochsenbein et al. (2000) | VizieR가 여러 카탈로그·표 자료 검색(L49) | **원문 확인** | 초록 1쪽 *"a database grouping in an homogeneous way thousands of astronomical catalogues"* |
| Rosenfield et al. (2018) | WWT가 하늘 지도 위 다파장 영상 탐색(L49) | **원문 확인** | 2쪽 *"explore all-sky surveys across the electromagnetic spectrum"*, 본문 후반 *"users can pan and zoom with the mouse, display multiple layers from all-sky surveys"* |
| Baines et al. (2017) | ESASky가 영상·카탈로그 탐색과 자료 제품 내려받기(L49) | **원문 확인** | 초록 1쪽 · 본문 *"provides a simple way to search and download multi-..."*, *"access to download the data products from"* |
| Giordano et al. (2018) | 위와 같은 자리 | **원문 확인** | `Science-Ready Data Download` 절 |
| Fischer et al. (2012) | 시민과학이 대중을 실제 관측자료 분류·검토에 참여(L51) | **원문 확인** | 제목 `Planet Hunters: The First Two Planet Candidates Identified by the Public using the Kepler Public Archive Data` |
| Raddick et al. (2019) | 위와 같은 자리 | **원문 확인** | 초록 1쪽 *"Galaxy Zoo ..., an online citizen science project in which public volunteers classify galaxies"* |
| Zellem et al. (2020) | **「NASA Exoplanet Watch」**가 시민 관측자료를 활용(L51) | **부분** — 3-1 참조 | 초록 2쪽 |
| Fitzgerald et al. (2014) | 공공 천문자료가 학교 천문탐구의 자료적 기반(L37) | **원문 확인** | 3쪽 ARiC 정의 기준 (2): *"Data should be from a research-grade instrument and detectors"* |
| Hasan & Hasan (2021) | 위와 같은 자리 | **원문 확인** | 초록 1쪽 *"how analysis of astronomy data can be used for an educational purpose"* |
| Goodman (2012) | 여러 차원의 자료에 시각적 표상이 필요(L93·L115~121) | **원문 확인** | 초록 1쪽 *"in the case of high-dimensional data sets ... interactive exploratory data visualization can give far more insight"* |
| Hassan & Fluke (2011) | 위와 같은 자리 | **원문 확인** | 1쪽 머리글 `Publications of the Astronomical Society of Australia, 2011, 28, 150–170`, 초록 *"a critical role will remain for visualization-based knowledge discovery"* |
| Kjelvik & Schultheis (2019) | 자료의 진정성뿐 아니라 학습자 수준에 맞춘 매개가 중요(L77·L365) | **원문 확인** | p.2 *"it is crucial that instructors not overlook the context of a data set as they help students develop their data-literacy abilities."* p.5 `Scaffolding Data Complexity` 절 *"while not moving beyond their current problem-solving abilities"* |
| Belland et al. (2017) | 스캐폴딩이 인지적 성과에 소–중 평균 효과(L91) | **원문 확인** | 초록 p.309 `ḡ = 0.46`. 「소–중」이라는 표현 자체는 p.332 *"an effect size of 0.37 (a) would be labeled small to medium by Cohen's (1988) guidelines"*. 다만 5-2 참조 |
| Kang et al. (2026) | 경험 연구 42편(2000–2023) 분석, 강조되는 실천이 분야·학년·자료 유형에 따라 달라짐(L83) | **원문 확인** | 초록 p.1 *"analyzing 42 peer-reviewed empirical studies (2000–2023)"*, *"we observe systematic differences in how these practices are emphasized across disciplines, grade levels, and data types"*, *"we conceptualize SDL as a multifaceted and iterative process"* |
| Wong et al. (2026) | 미국 중등 지구과학 교육자 155명, 자료 접근 53%·수업 통합 47%, 구조적 조건의 문제(L45) | **원문 확인** | 초록: *"surveys with 155 secondary Earth science educators across the United States"*, *"datasets (53%), time constraints (42%), and integrating data into lessons (47%)"*. 4.2절: *"our findings point to systemic factors that shape implementation. The struggle that 53% of educators report in accessing relevant datasets indicates a structural barrier beyond individual teacher knowledge or skills."* 서지도 PDF 머리글 `Educ. Sci. 2026, 16, 171`로 일치 |
| 김미림·손정주 (2022) | 실제 천문자료와 데이터 사이언스를 활용한 교사교육 프로그램(L39) | **원문 확인** | p.59 요약. 히파르쿠스 위성 자료와 AAVSO 아카이브를 입력자료로 쓴 'H-R도' 교사교육 프로그램. 머리글 `현장과학교육 16(1) pp 59-74`로 서지 일치 |
| 윤진아·남윤경 (2024) | 공공기관 자료와 빅데이터가 탐구활동의 자료원(L39) | **원문 확인** | p.321 요약: *"기존의 데이터(공공기관 자료 API, 빅데이터 등)활용 및 직접 데이터 수집 활동으로 나눌 수 있으며"*. 머리글 `2024, Vol. 28, No. 4, pp. 321-336`로 서지 일치 |

### 2-3. 로컬 PDF 하나가 다른 논문이다 — 검사 절차 문제

`C:\Users\bmffr\Desktop\Research\ERP2026\Paczyski1986.pdf`를 열면
**Gates, Gyuk & Turner (1995), "Gravitational Microlensing and the Galactic Halo", arXiv:astro-ph/9508071**이 나온다.
Paczyński(1986)가 아니다. 따라서 **Paczyński(1986)는 로컬에서 확인할 수 없었다** — 3절 참조.

원고 파일의 문제가 아니라 자료 수집 쪽 문제다. 파일을 받아 두려면 다시 받아야 한다.

---

## 3. 원문 대조 — 웹 확인

(작성 중)

---

## 4. 확인 못 한 것

(작성 중)

---

## 5. 서지사항 오류

### 5-1. 쪽 범위가 틀렸다 — **상**

**L468 Giordano et al. (2018) `Astronomy and Computing 24: 97-108`**
→ 실제는 **24: 97-103**이다.
CrossRef의 출판사 등록 메타데이터(DOI 10.1016/j.ascom.2018.05.002)가 `page: 97-103`이고,
NASA ADS 서지코드도 `2018A&C....24...97G`(시작 97쪽)다. 끝 쪽 108은 근거가 없다.

### 5-2. 쪽이 아닌 것을 쪽으로 적었다 — **상**

**L484 McDonald et al. (2019) `Proceedings of the ACM on Human-Computer Interaction 3: 72`**
→ **72는 쪽이 아니라 논문 번호(Article number)**다.
저자 배포본 1쪽의 ACM Reference format이 *"Proc. ACM Hum.-Comput. Interact. 3, CSCW, Article 72 (November 2019), 23 pages"*이고,
CrossRef는 `volume 3, issue CSCW, page 1-23`이다. 정식 표기는 **3(CSCW): Article 72, 1-23**.

### 5-3. 권·쪽이 빠졌다 — **중**

**L472 Hasan & Hasan (2021)** — 현재 `Proceedings of the International Astronomical Union, IAU Symposium No. 367.`로 끝난다.
Cambridge Core 서지: **vol. 15, Symposium S367, pp. 151–154**, DOI 10.1017/S174392132100034X.
학회 양식이 「저널 권: 시작-끝」이므로 최소한 `151-154`는 넣어야 한다.

### 5-4. 저자를 생략해 실제 저자 수를 알 수 없다 — **중**

참고문헌 목록에서 저자를 `et al.`·`외`·`…`로 줄인 항목이 **14건**이다.
학회 규정 제10조의 예시(`Smith PA, Spencer CD and Jones DE (1992)`)는 저자를 모두 적는 형태다.

| 행 | 항목 | 실제 저자 수 | 비고 |
|---|---|---|---|
| L471 | `Guo, Q., Chen, Y., Qiao, C., et al. (2024)` | **4명** | `et al.`이 가리는 저자가 **한 명뿐**이다(Yu, Y.). 바로 아래 Qiao et al.(2024)는 같은 4인을 다 적었다 — 같은 저자군인데 표기가 갈린다 |
| L458 | `Cantat-Gaudin, T., ... Soubiran, C., … Kounkel, M. (2020)` | **13명** | 말줄임표(…)는 APA 7에서 저자 21명 이상일 때만 쓴다. 13명이면 전원 표기가 맞다 |
| L454 | `Baines, D., et al. (2017)` | 20명 | `Baines, D., et al.`의 쉼표는 어느 양식에도 없다 |
| L462 | `Daylan, T., Günther, M. N., Mikal-Evans, T., et al. (2021)` | 25명 | |
| L463 | `Delrez, L., Santerne, A., Almenara, J.-M., et al. (2016)` | 22명 | |
| L464 | `Fischer, D. A., et al. (2012)` | 31명 | |
| L467 | `Gaia Collaboration et al. (2023)` | 약 480명 | 단체저자 표기라 관행상 허용 |
| L468 | `Giordano, F., et al. (2018)` | 19명 | |
| L503 | `Zellem, R. T., et al. (2020)` | 44명 | |
| L444·448·449 | `김연귀 외`, `이기영 외`(2건) | 교과서 | |
| L445·446 | `신영준 외`(2건) | 정책연구보고서 | |

저자가 20명 넘는 천문 논문까지 전원 표기하라는 뜻은 아니다. **어디까지 적고 어디서 줄일지 규칙을
하나로 정하고 그 규칙을 목록 전체에 똑같이 적용하라**는 것이다. 지금은 4명짜리를 줄이고 4명짜리를
다 적는 상태다.

### 5-5. 서지가 맞는 것으로 확인된 항목

아래는 원문 또는 출판사·DOI 등록기관 기록과 대조해 **저자·연도·제목·권·쪽이 모두 맞았다.**

Sweller 1988 · Chinn & Malhotra 2002 · Elo & Kyngäs 2008 · Hsieh & Shannon 2005 ·
Graneheim & Lundman 2004 · Richey & Klein 2007 · Quintana et al. 2004 · Banchi & Bell 2008 ·
Belland et al. 2017 · Kjelvik & Schultheis 2019 · Kang et al. 2026 · Wong et al. 2026 ·
Qiao et al. 2024 · Guo et al. 2024(저자 수만 5-4) · Raddick et al. 2019 ·
Fischer et al. 2012 · Zellem et al. 2020 · Fitzgerald et al. 2014 · Hassan & Fluke 2011 ·
Goodman 2012(AN 333(5-6): 505-514) · Goodman et al. 2012(arXiv:1201.1285) ·
Wenger et al. 2000 · Ochsenbein et al. 2000 · Rosenfield et al. 2018 · Baines et al. 2017 ·
Paczyński 1986 · Bressan et al. 2012 · Cantat-Gaudin et al. 2020 · Claret 2017 ·
Delrez et al. 2016 · Daylan et al. 2021 · Kreidberg 2015 · Mandel & Agol 2002 ·
Foreman-Mackey et al. 2013 · Wang & Chen 2019 · Gaia Collaboration et al. 2023 ·
Michels et al. 2026 · Song et al. 2026 · Uddin 2026 ·
공병민 외 2023 · 김미림·손정주 2022 · 윤진아·남윤경 2024 · 조훈·손정주 2022 ·
교육부 2022 · 신영준 외 2022a · 신영준 외 2022b

몇 가지 확인 메모:

- **Delrez et al. (2016)의 제목은 원고 쪽이 맞다.** 로컬 PDF(arXiv:1506.02471)의 「a hot Jupiter in a
  polar orbit and close to tidal disruption」은 **투고 전 제목**이고, 출판본(MNRAS 458(4): 4025-4043,
  DOI 10.1093/mnras/stw522)은 원고와 같은 「a hot Jupiter close to tidal disruption transiting an
  active F star」다.
- **Baines et al. (2017)의 `Visualization`(미국식 z)도 원고 쪽이 맞다.** arXiv판만 `Visualisation`이고
  PASP 출판본은 z다. 출판 시기도 온라인 2016-12-28 / 지면 2017-02이므로 2017이 맞다.
- **Rosenfield et al. (2018)의 `A seamless`도 원고 쪽이 맞다.** arXiv판만 관사가 없다.
- **Claret (2017)의 2017년도 맞다.** 로컬 PDF는 2018-04-26에 올라온 arXiv:1804.10295이지만 그
  레코드의 journal_ref가 `A&A 2017, 600A, 30C`다. 출판 1년 뒤에 올린 프리프린트다.
- **교육부 (2022)** 고시 제2022-33호 [별책 9]가 과학과 교육과정인 것을 확인했다.
- **신영준 외 (2022a·2022b)**의 제목과 발간번호(11-1342000-000877-01 / 11-B552111-000030-01),
  발행 주체(한국과학창의재단, 수행 경인교육대학교 산학협력단)를 한국과학창의재단 성과관에서 확인했다.
  다만 **연구책임자가 「신영준」인지는 확인하지 못했다** — 4절 참조.

---

## 6. 학회 규정 제10조 형식 적합성

규정이 제시한 형태는 두 가지다.
국문 「김창석, 문제인 (2006) 패러데이 법칙과 금속 탐지기. 새물리 23: 157-159.」
영문 「Smith PA, Spencer CD and Jones DE (1992) …」

### 6-1. 영문 항목 50건 중 49건이 규정 형태가 아니다 — **상**

규정의 영문 형태는 **성 뒤에 이니셜을 마침표·쉼표 없이 붙이고**, 저자 사이는 쉼표,
마지막 저자 앞에만 `and`를 둔다. 지금 목록은 APA식(`Belland, B. R., Walker, A. E., Kim, N. J. and
Lefler, M.`)이다.

규정 형태를 지킨 항목은 **L474 `Herrold A and Prather E (2023)` 단 하나**다.
나머지 49건이 다른 형태이므로, 규정 쪽으로 통일하든 APA 쪽으로 통일하든 **한 방향으로 49건 또는
1건을 고쳐야 한다.** 어느 쪽으로 갈지는 9절의 판단 항목으로 남긴다.

국문 10건은 규정 형태(`성명, 성명 (연도) 제목. 학술지 권: 쪽.`)와 맞는다.

### 6-2. 알파벳 순서가 어긋난 항목 2건 — **중** (v16 검사에서도 같은 지적, 미반영)

L473~L477이 `Hassan → Herrold → **Elo** → **Graneheim** → Hsieh → Kang` 순서다.

- **Elo & Kyngäs (2008)**는 Delrez와 Fischer 사이에 와야 한다.
- **Graneheim & Lundman (2004)**는 Goodman과 Guo 사이에 와야 한다.
- Hsieh는 Herrold 뒤가 맞으므로 그대로 두면 된다.

> `ars2_2026-09-08/integrity.md` 1-3에서 이미 지적된 항목이고 v17에서도 그대로다.

### 6-3. 한 목록 안에 두 가지 서지 양식이 섞여 있다 — **중**

아래 4건만 APA식(쉼표 + 괄호 안 호수 + DOI)이고 나머지 56건은 학회식(`학술지 권: 쪽.`)이다.

| 행 | 항목 |
|---|---|
| L469 | `Goodman, A. A. (2012) ... Astronomische Nachrichten, 333(5-6), 505-514.` |
| L479 | `Kjelvik ... CBE-Life Sciences Education, 18(2), es2. https://doi.org/10.1187/cbe.18-02-0023` |
| L487 | `O'Reilly ... Biochemistry and Molecular Biology Education, 50(5), 466-472. https://doi.org/10.1002/bmb.21663` |
| L489 | `Qiao ... International Journal of STEM Education, 11, Article 25. https://doi.org/10.1186/s40594-024-00484-5` |

DOI도 이 3건에만 붙어 있다(60건 중 3건). 학회 규정 예시에는 DOI가 없으므로 **전부 빼거나 전부
넣거나** 둘 중 하나여야 한다.

### 6-4. 본문 괄호인용에서 `&`와 `and`가 섞여 있다 — **중**

두 저자를 잇는 기호가 괄호 안에서 두 가지로 나온다. 같은 문헌이 자리마다 달라지는 경우까지 있다.

| `&`를 쓴 자리 | `and`를 쓴 자리 |
|---|---|
| L35 `(Chinn & Malhotra, 2002; Kjelvik & Schultheis, 2019)` | L365 `(Kjelvik and Schultheis, 2019)` |
| L91 `Koedinger와 Aleven(2007)` | L375 `(Koedinger and Aleven, 2007)` |
| L155 `(Hsieh & Shannon, 2005; Elo & Kyngäs, 2008)` | L155 `(Graneheim and Lundman, 2004)` |
| L229 `(Mandel & Agol, 2002)` | L231 `(Wang and Chen, 2019)` |
| L37 `(Hasan & Hasan, 2021)`, L93 `(Hassan & Fluke, 2011)` | L51 `(Herrold and Prather, 2023)` |
| L101 `(Richey & Klein, 2007)` | 부록2 `(Richey and Klein, 2007)`, `(Hsieh and Shannon, 2005)` |

**Kjelvik & Schultheis(L35 vs L365)와 Koedinger·Aleven(L91 vs L375), Richey & Klein(L101 vs 부록2),
Hsieh & Shannon(L155 vs 부록2)이 같은 원고 안에서 두 형태로 나온다.** 하나로 통일하면 된다.

### 6-5. 여러 문헌을 함께 든 괄호의 순서 — **하**

APA는 세미콜론으로 이은 복수 인용을 성의 알파벳 순으로 둔다. 두 자리가 어긋난다.

- L118 `(Sweller, 1988; Quintana et al., 2004; 2.3)` → Quintana가 먼저다.
- L155 `(Hsieh & Shannon, 2005; Elo & Kyngäs, 2008)` → Elo가 먼저다.

국문에서도 L39·L45·L47의 `(조훈·손정주, 2022; 공병민 외, 2023)`이 가나다 역순이다.
학회 규정이 순서를 정해 두지 않았다면 그대로 둬도 된다.

### 6-6. 표 4-2가 교과서를 저자·연도로 부르지 않는다 — **하**

표 4-2의 출처 표기가 `(행성우주과학, 비상, p.39)`, `(지구과학, 비상, pp.182–183)` 식이다.
그 교과서는 참고문헌 L448·L449의 `이기영 외 (2025a·2025b)`이므로, 본문 표기도
`(이기영 외, 2025b, p.39)`처럼 목록과 이어져야 독자가 대조할 수 있다.

---

## 7. 부수 지표

| 지표 | 값 | 판정 |
|---|---|---|
| 참고문헌 총수 | 60 (국문 10 · 영문 50) | — |
| 본문 미인용 참고문헌 | 1건 (1-1) | 조치 필요 |
| 참고문헌 없는 본문 인용 | 0건 | 통과 |
| **자기인용 비율** | **2/60 = 3.3%** | 통과(기준 15% 이하) |
| 최근 5년(2022–2026) 문헌 | 20/60 = **33%** | — |
| 10년 초과(2016년 이전) 문헌 | 26/60 = **43%** | 아래 설명 |
| DOI 표기 | 3/60 | 6-3 |

자기인용 2건은 교신저자 손정주가 공저자인 `김미림·손정주 (2022)`와 `조훈·손정주 (2022)`다.

**10년 초과 43%는 이 원고에서 문제가 아니다.** 26건의 성격을 보면
① 이론 근거의 원출처(Sweller 1988, Collins et al. 1989, Wharton et al. 1994, Chinn & Malhotra 2002,
Quintana et al. 2004, Hsieh & Shannon 2005, Graneheim & Lundman 2004, Richey & Klein 2007,
Koedinger & Aleven 2007, Banchi & Bell 2008)와
② 분석에 실제로 쓴 도구·자료의 원논문(Paczyński 1986, Mandel & Agol 2002, Wenger et al. 2000,
Ochsenbein et al. 2000, Bressan et al. 2012, Foreman-Mackey et al. 2013, Kreidberg 2015,
Delrez et al. 2016)이다. 둘 다 최신 문헌으로 바꿀 수 없는 자리다.

인용이 하나도 없는 문단은 3장·4장의 절차·결과 서술과 5장의 해석 문단인데, 이는 원고 자신의 방법과
자료를 기술하는 자리여서 인용이 없는 것이 맞다. 한 문장에 5건 넘는 과다인용도 없다(최대 3건).

---

## 8. 원고를 고쳐야 하는 것

(작성 중)

---

## 9. 소유자가 판단할 것

(작성 중)
