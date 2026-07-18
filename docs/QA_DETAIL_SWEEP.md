# EASWA 시각 디테일 QA 스윕 (block-ux-overhaul)

- 검사일: 2026-07-11 / 대상: `http://localhost:5895` (커밋 f8ca03f 빌드)
- 방법: puppeteer-core + Chrome 헤드리스, viewport 1440×1150 / 1900×1150, deviceScaleFactor 1.5, 전체 문서 높이 캡처(내부 스크롤 해제 후 fullPage)
- 경로: 홈 `/` → 모듈 인트로 `/modules/exoplanet-transit` → 랩 `/lab/wasp_6_b?...&workflow=transit` Step 0~6 (비로그인, 측광 미실행 상태)
- 코드 수정 없음 — 발견·제안까지만.

## 요약

| 심각도 | 건수 |
|---|---|
| 상 | 1 |
| 중 | 12 |
| 하 | 9 |
| 합계 | 22 |

참고: `탐구 기록` 텍스트영역이 패널 전폭이 아닌 것은 결함이 아님 — `index.css:10461`에서 `.inquiry-record-field { max-width: 860px }`로 읽기 폭을 의도적으로 제한한 설계.

## 발견 목록

| # | 화면(캡처 파일명) | 위치 | 문제 | 심각도 | 구체 수정 제안 (CSS 선택자/컴포넌트) |
|---|---|---|---|---|---|
| 1 | step4_1440 / step4_1900 (zoom_step4_substepper_*) | Step 4 내부 하위 스테퍼 | 하위 단계 6개(`STEPS`, TransitLab.tsx:76-83) 중 6번째 "결과 기록"이 두 해상도 모두 컨테이너 오른쪽으로 잘려 원 일부만 보임. 스크롤바·잘림 표시가 없어 학습자는 하위 단계가 5개라고 인지하게 됨 | **상** | `.transit-step-indicator`(index.css:2350)에 데스크톱에서도 `flex-wrap: wrap` 허용, 또는 `.transit-step-label`을 현재 단계 외에는 축약(번호만)·`min-width:0` + `text-overflow:ellipsis`로 6개가 항상 들어오게. 최소한 overflow-x:auto + 잘림 페이드 표시 |
| 2 | intro_1440 / intro_1900, (모듈 인트로 Step 0) | 궤도 3D 시연 스테이지 | `.transit3d-stage`가 `width:100%; aspect-ratio:16/9`(index.css:9962)라 1900에서 높이 ~660px의 거의 빈 검정 박스가 화면 절반을 차지. 별은 중앙의 작은 원뿐 — 미로드 박스로 오해될 수 있고 학습 목표·탐구 기록이 폴드 훨씬 아래로 밀림 | 중 | `.transit3d-stage { max-height: 480px; }` + `max-width` 제한 후 중앙 정렬, 또는 aspect-ratio를 2.2/1 수준으로. 카메라 줌을 키워 별-행성이 스테이지를 채우게 하는 것도 병행 권장 (Transit3DScene.tsx) |
| 3 | intro_1440 / intro_1900 | 시연 하단 개념 광도곡선 | 범례는 "transit 깊이 -5.2%"인데 그려진 딥은 플롯 높이의 ~50%. y축 눈금이 없어 과장 스케일임을 알 수 없음 — "미세한 딥"이라는 본문 설명과 시각이 상충(설계원리 3: 정직한 가시화) | 중 | Transit3DScene.tsx `transit3d-curve-svg`: 곡선 옆에 "세로축 과장" 배지 또는 y축 최소 눈금(0%, -5.2%) 표기. 딥 부근에 -5.2% 수치 라벨을 붙이는 방법도 가능 |
| 4 | home_1440 / home_1900 | 히어로 CTA "탐구 바로 시작" | 버튼이 히어로 콘텐츠 전폭(1900에서 ~1030px)으로 늘어남 — 불필요한 전폭 스트레치, 터치 목표라기보다 배너처럼 보임 | 중 | `.home-hero-actions .btn-primary { flex: 0 0 auto; align-self: flex-start; padding: 12px 32px; }` (HomePage.tsx:115) |
| 5 | step1_1440 / step1_1900 | "다음 행동" 패널 | 패널은 전폭인데 내용(제목 1줄+문장 1줄+버튼 1개)이 좌측 1/3에 몰려 우측 2/3가 빈 영역 — 1900에서 특히 두드러짐 | 중 | InquiryLayout.tsx:131 부근 action 패널에 `max-width`(≈720px) 부여 또는 우측에 해당 행동의 결과 미리보기/힌트 요약을 배치해 2열 구성 |
| 6 | step2_1440 / step2_1900 | "하늘에서 보기" 우측 메타 칩 | 칩 4개(TESS Sector·케이던스·총 프레임·픽셀 스케일)가 우측 열 상단만 채우고 그 아래 DSS 이미지 높이만큼(~500px) 빈 검정 영역 | 중 | `.inquiry-skydata-chips`(index.css:10342)를 `align-content: start` 유지하되 열 폭을 칩 2열로 좁혀 이미지 옆 세로로 쌓기, 또는 칩을 이미지 아래 가로 1행으로 이동 |
| 7 | step2_1440 / step2_1900 | "자료 출처" 패널 | 카드 2장(제공 기관/접근 방식)이 좌측 ~40%만 차지, 나머지 우측이 통째로 빈 영역 | 중 | 카드 그리드를 `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`로 패널 폭에 맞게 신장하거나 패널에 max-width 부여 |
| 8 | step0~step6 공통 (예: step5_1440) | 대상 요약 카드(대상으로/식현상 Lab: WASP-6 b) | 좌측 텍스트 3줄과 우측 썸네일 사이 중앙 ~60%가 빈 공간인 카드가 매 스텝 ~200px 세로를 반복 소비 | 중 | `.inquiry-target-context`(index.css:5329): P(주기)·별자리 외에 등급·좌표 등 핵심 메타를 중앙에 채우거나, 카드 높이를 낮추고(썸네일 축소) 스텝 이동 시에는 접힌 1행 요약으로 |
| 9 | step3_1440 (zoom_step3_sliders) | 구경 시뮬레이터 슬라이더 3개 | 1번(구경 반지름)만 주황 채움(progress fill)+주황 값 표기, 2·3번(고리 안쪽/바깥)은 전체가 밝은 트랙이라 채움 상태·강조 규칙이 슬라이더끼리 불일치 | 중 | ApertureSandbox.tsx 슬라이더에 동일한 fill 스타일 적용(accent-color 또는 gradient 트랙 공통화). 값 강조색도 3개 모두 동일 규칙으로 |
| 10 | step5_1440 / step5_1900 | 산출값/비교값 표 라벨 | 라벨 언어·표기가 혼재: "카탈로그 식 깊이"(한글)·"SQRT(DEPTH) RP/R*"(영문 대문자) / 우측 "TRANSIT DEPTH"·"RP/R*"(영문 대문자)·"공전 주기"(한글) — 같은 표 안에서 규칙 없음 | 중 | 비교 패널(step5 정의, workflows/transit 또는 InquiryLayout compare 섹션): 라벨을 "한글 (영문 기호)" 단일 규칙으로 통일. 예: "식 깊이 (transit depth)", "반지름비 √depth = Rp/R★", "공전 주기 (P)" |
| 11 | step6_1440 / step6_1900 | 마지막 스텝 하단 내비 | 6/6에서 하단이 전폭 "이전 단계" 버튼만 남고 완료·기록 저장/내보내기 CTA가 없어 흐름이 시각적으로 막다른 길. (RecordSavePanel `.inquiry-record-save`는 비로그인이라 미노출로 추정) | 중 | `.inquiry-step-footer`(index.css:6058): 마지막 스텝에서는 우측 슬롯에 "기록 저장/내보내기"(비로그인 시 비활성+로그인 안내 툴팁) 배치 — 미지원 기능은 숨김이 아니라 비활성 표시 원칙과 일치 |
| 12 | step2_1440 / step2_1900 | 케이던스 칩 | Sector 2·29·69·96 혼합 사용인데 케이던스가 "2분 (120초)" 단일값으로 표기 — FFI cutout은 섹터에 따라 30분/10분/200초로 다름. 수치 출처 확인 권장(철칙 6) | 중 | transit_service/프리뷰 메타 응답 확인 후, 섹터별 상이하면 "섹터별 상이(30분~200초)" 또는 선택 섹터 기준으로 동적 표기 |
| 13 | step3_1900 (1900 전용) | "직접 해보기 — 구경 측광" 패널 | 시뮬 이미지+방사 프로파일 묶음이 좌측 고정폭으로 붙고 우측 ~500px가 빈 영역 (1440에서는 플롯이 패널을 채움) | 중 | ApertureSandbox 2열 래퍼에 `flex:1` / `minmax(0,1fr)`로 플롯이 잔여 폭을 채우게 하거나 패널에 max-width 부여 |
| 14 | step3_1440 (zoom_step3_plot) | 방사 프로파일 y축 라벨 | "픽셀 값"이 rotate(-90) 세로 렌더링 — 한글 회전 라벨은 가독이 급락하고 1.5x 캡처에서도 뭉개져 보임 | 하 | ApertureSandbox.tsx:380: rotate 대신 라벨을 y축 상단에 가로로 배치(`x=plot.L, y=plot.T-8, textAnchor:start`) |
| 15 | step3_1440 / step3_1900 (zoom_step3_plot) | "배경 추정 20.0" 주석 | 주석 텍스트가 플롯 우측 경계에 밀착·점선 위에 겹침, 1900에서는 플롯 테두리 밖으로 반 발 걸침 | 하 | ApertureSandbox.tsx:405-412: `x`를 `plot.L+plot.innerW-6`으로 안쪽 고정, 점선과 세로 오프셋 2~3px 추가 |
| 16 | step3_1440 (zoom_step3_sliders) | 측광 통계 칩 5개 | "배경 추정 (고리 평균, 참값 20)" 라벨만 2줄로 값 기준선이 다른 칩보다 내려앉아 행 리듬이 어긋남 | 하 | 칩 라벨 축약("배경 추정 ⓘ" + title 툴팁) 또는 칩 내부 `justify-content: space-between`으로 값을 하단 정렬 통일 |
| 17 | step0_1440, intro_1440 | 학습 목표 카드 | 카드 제목이 페이지 h1과 동일한 "외계행성 식현상 탐구블럭" 반복 + 제목과 불릿 사이 과대 여백으로 세로 리듬 붕괴 | 하 | InquiryLayout.tsx:98 부근: 카드 제목을 목표 요약 문구로 교체하거나 제거하고 불릿을 위로. 여백 `gap` 축소 |
| 18 | step2 vs step4 | "생각해보기" 컴포넌트 | 두 구현이 병존: Step2·3은 SelfCheckPanel(이모지 없음·비접이식·O/X 좌측), Step4는 StepGuide(🤔 이모지+접이식+Q. 프리픽스) — 같은 목적의 요소가 다른 시각 문법 | 하 | SelfCheckPanel.tsx / StepGuide.tsx 중 한 쪽 스타일로 헤더(킥커·아이콘·접기)와 질문 프리픽스 통일 |
| 19 | step1_1440 | 스텝 제목/패널 제목 | "탐구 대상 또는 자료 선택"(스텝 제목) 바로 아래 "대상 또는 자료 선택"(패널 제목) — 근접 중복으로 위계가 흐려짐 | 하 | 패널 제목을 행동 지시형("이 대상으로 계속하기" 등)으로 바꾸거나 킥커("다음 행동")만 남기고 제목 제거 |
| 20 | step0~6 공통 | "Transit Planet" 칩 | 대상 카드의 유형 칩만 영문 모노스페이스 — 본문 용어는 "식현상"으로 통일돼 있어 이질적 | 하 | 칩 텍스트를 "식현상 행성 (Transit Planet)" 또는 한글 우선 + lang 분기 (대상 카드 렌더 컴포넌트) |
| 21 | step4_1440 / step4_1900 | 좌측 사이드바 | 별 선택·구경 슬라이더 이후 사이드바 하단 ~400px가 빈 공간(우측 패널 높이에 끌려 늘어남) | 하 | `.lab-sidebar` 내부를 `align-content: start`로 하고 하단에 선택 요약(선택 sector·비교성 수) 카드로 채우거나 사이드바 배경을 콘텐츠 높이까지만 |
| 22 | home_1440 / home_1900 | 탐구 모듈 카드 3장 이미지 열 | 이미지 스타일 혼재: 벡터 일러스트(TESS)/실사진(플레이아데스)/3D 렌더+원형 사진 콜라주(KMTNet) — 카드 첫인상 톤이 제각각 | 하 | 3장 모두 실관측 사진 또는 모두 일러스트로 통일하고 출처 캡션 위치·스타일(`좌하단 소문자`)만 공통 유지 |

## 1900 전용 문제

- #13 (Step3 직접 해보기 우측 빈 영역) — 1900에서만 발생.
- #2, #5는 1440에도 있으나 1900에서 체감이 크게 악화됨.
- 그 외 레이아웃은 max-width 컨테이너가 잘 잡혀 있어 1900 전용 회귀 없음.

## 캡처 파일 경로

베이스: `C:\Users\bmffr\AppData\Local\Temp\claude\C--Users-bmffr-Desktop-Result-EASWA-ExploringAllSkyWebApp\0791686b-a9dd-4463-b73c-a26752e5e467\scratchpad\qa_sweep\`

| 화면 | 1440 | 1900 |
|---|---|---|
| 홈 | home_1440.png | home_1900.png |
| 모듈 인트로 | intro_1440.png | intro_1900.png |
| 랩 Step 0 | step0_1440.png | step0_1900.png |
| 랩 Step 1 | step1_1440.png | step1_1900.png |
| 랩 Step 2 | step2_1440.png | step2_1900.png |
| 랩 Step 3 | step3_1440.png | step3_1900.png |
| 랩 Step 4 | step4_1440.png | step4_1900.png |
| 랩 Step 5 | step5_1440.png | step5_1900.png |
| 랩 Step 6 | step6_1440.png | step6_1900.png |

확대 크롭: zoom_step3_plot.png, zoom_step3_sliders.png, zoom_step4_substepper_1440.png, zoom_step4_substepper_1900.png

캡처 스크립트: `...\scratchpad\cap2\qa_sweep_full.js` (domcontentloaded + 본문 폴링, 내부 스크롤 해제 후 fullPage — networkidle 미사용)

---

# 2회차 스윕 (2026-07-11, /qa-sweep 스킬 첫 실행)

- 대상: 18캡처 (홈·인트로·Step0~6 × 1440/1900), 커밋 f105cfb 이후 폴리싱 반영 빌드.
- 직전 배치에서 라이브 검증된 화면(인트로·Step2·3·5·6, Step4@1900)은 회귀 스팟만, 미확인 화면(홈·Step0·1·Step4@1440)은 정밀 검사.

| # | 화면 | 위치 | 문제 | 심각도 | 처리 |
|---|---|---|---|---|---|
| R1 | home_1900/1440 | 히어로 CTA | 1회차 #4 수정이 무효했음 — 버튼이 여전히 컨테이너 전폭(1096px). 원인: flex/align 지정만으로는 부족(명시 width 부재 시 스트레치 지속). | 하(재발) | **자동 수정**: `.home-hero-actions .btn-*`에 `width: fit-content; min-width: 260px` — computed 260px 확인 + 1900 재캡처 육안 통과 |

- 그 외 신규 발견 0건. Step4 하위 스텝퍼는 1440에서도 6단계 전부 표시(줄바꿈) 확인.
- 1회차 보류 항목 현황: #21(랩 사이드바)·#22(홈 카드 이미지 톤) — 의도적 보류 유지 (자산/에셋 필요).

## 2026-07-18 — 3차 스윕 (전체 훑기)

- 캡처 22장 (home·intro·cmd·kmtnet·step0~6 x 1440/1900), 커밋 6cd555b 이후 빌드.
- **Step 5·6은 이번에도 미점검**: fit이 없으면 잠기는데 스윕 스크립트가 fit을 만들지 못해
  step4/5/6 캡처가 바이트까지 동일했다(475KB/526KB). 다음 스윕 전에 프로필에 fit을 심을 것.

| # | 화면 | 위치 | 문제 | 심각도 | 처리 |
|---|---|---|---|---|---|
| S1 | home / kmtnet Step0 | 대표 탐구 질문 | KMTNet만 "이 탐구에서 관측 자료로 설명하려는 현상은 무엇인가?" — 공용 템플릿 기본값 그대로. 외계행성("별빛 감소만으로 행성의 상대적 크기를…")·CMD("색-등급도 모양만으로 나이와 거리를…")는 모듈 고유 질문인데 KMTNet만 일반문. 원리 1 위반 | 중 | 보고만 — 문구가 도메인이라 사용자 확인 필요 |
| S2 | kmtnet Step0 | 영상 임베드 | 본문 영상이 YouTube 외부 임베드(youtube-nocookie/QqobzbD7k7g). 임베드 자체는 200 OK 정상이나 **학교망에서 YouTube가 막히면 대체 표시가 없다**. 연수·수업 환경 리스크 | 중 | 보고만 — 폴백 이미지·링크 추가는 판단 필요 |
| S3 | 블럭 Step3 | ApertureSandbox 본문 | `.inquiry-aperture-note`(212자)·`.inquiry-aperture-hint`가 패널 전폭으로 늘어남(1280에서 1096px, 1900에선 더). 읽기 폭 860 초과 | 하 | **자동 수정** — max-width:860px |
| S4 | 블럭 Step3 | 구경 수치 | 샌드박스는 r=12px(FWHM 7.5px 가정), 아래 분석 설정 카드는 r=2.5px(TESS). 같은 화면에 다른 숫자 병존 — 주석("여기서는 별 하나의 구경 측광만")이 일부 해소하나 혼동 소지 | 중 | 보고만 |
| S5 | home | 카드 이미지 캡션 | 출처 표기 형식 불일치: "NASA, STScI MAST" / "사진: NASA/ESA/AURA·Caltech" / "KASI KMTNet" — 접두어 유무 제각각 | 하 | 보류(S1과 함께 문구 통일 권장) |
| S6 | 블럭 Step3 | 지표 라벨 | "기기 등급 13.01"이 설명 없이 노출. 나머지 4지표(빛 포함·오염·배경 추정·SNR)보다 불친절 | 하 | 보류 |

### 잘 되어 있어 유지할 것
- CMD Step0: 실제 Gaia DR3 CMD 2종 + 성단 사진 + 전향점 표시 + 출처 명기. 원리 3의 모범.
- Step3 ApertureSandbox: "개념 시뮬레이션 · 실제 관측 아님" 라벨, 방사 프로파일·SNR·오염 실시간 표시.
- 블럭 하단 게이트 힌트("정밀 분석(Lab)에서 모델 적합까지 마치면 다음 단계가 열립니다") — 버튼을 숨기지 않고 이유를 말하는 방식. 유지할 것.

### 자동 수정 내역
- `index.css`: `.inquiry-aperture-hint`, `.inquiry-aperture-note`에 `max-width: 860px` (S3).

### 검증
- 로컬 5895 재빌드 후 재캡처. computed width 1096 → 860 확인, 육안으로 긴 문단이 한 줄 → 3줄 래핑.

### 다음 스윕 전 할 일
- `capture_all.js`가 훑는 경로가 `/lab/:targetId`인데 실제 학습자 경로는
  `/modules/exoplanet-transit?blockStep=`이다. 대상 URL 갱신 필요.
- fit 생성 단계(불러오기 → 추천 비교성 자동 선택 → 측광 → 적합)를 스크립트에 추가해야
  Step 5·6이 처음으로 점검 가능해진다.
