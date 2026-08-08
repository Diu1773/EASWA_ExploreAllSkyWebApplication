# landing/zoviz — Zoviz 시안 사본 (2026-08-08)

Zoviz 웹빌더 프리뷰(2026-08-08 저장본)를 그대로 옮긴 정적 랜딩 사본.
원본의 마크업 구조와 컴파일 CSS(퍼크 토큰 포함)를 추려서 재사용했으므로
레이아웃·간격·위계는 시안과 동일하다. 손댄 것은 아래 세 가지뿐.

## 바꾼 것

**1. 다크 섹션에서 배경에 묻혀 안 보이던 색** — 빌더가 라이트 배경용 기본
글자색(#1a1a1a 계열)을 다크 배경(#12161e/#0d1117) 위에 그대로 둔 부분.
레이아웃·크기·간격은 그대로 두고 색만 세웠다 (`index.html`의
`/* ══ 사본에서 손댄 것 전부 ══ */` 블록이 전체 목록).

- 섹션 제목 4곳(Inquiry modules / Start a guided investigation /
  How a session runs / Data sources and credits) + 항목 제목들 → 밝은 회백색
- 아이콘 스트로크 #0d1117 → 틸 #14b8a6 (아이콘 배경 틴트 rgba(20,184,166,.1)와
  원래 짝이던 색)
- 다크 배경 위 진검정 버튼(네비 CTA, Start TESS/KMTNet/Gaia) → 채움색 유지,
  흰 28% 테두리만 추가
- 캐러셀 점 탐색 #0158ad → 활성 #6499cf / 비활성 흰 28%

**2. 이미지 전부 실자료로 교체** (스톡 사진 제거)

| 위치 | 파일 | 출처 |
|---|---|---|
| 히어로 배경 | img/hero-udf.jpg | NASA/ESA Hubble Ultra Deep Field |
| TESS 행 | img/tess.jpg | NASA TESS preview (STScI MAST) |
| KMTNet 행 | img/kmtnet.jpg | KASI KMTNet |
| Gaia 행 | img/m45.jpg | 플레이아데스 M45, NASA/ESA/AURA·Caltech |
| 흐름 카드 7장 | img/step0~6.jpg | EASWA 앱 실제 화면 (docs/survey/screens/) |

FAQ의 "Image credits" 답변도 실제 출처로 고쳤다 (원문은 Unsplash 언급).

**3. 죽은 링크 정리** — zoviz 프리뷰 URL → 페이지 내 앵커
(#modules/#flow/#teachers/#credits/#contact), CTA와 모듈 시작 버튼 →
https://easwa-webapp.onrender.com/ , GitHub 아이콘 → 이 저장소.
로고 문구는 "EASWA Landing"(zoviz 프로젝트명 유출) → "EASWA".

## 검증 (2026-08-08, 실브라우저 1360px)

시안 저장본과 같은 뷰포트에서 계산 스타일·기하 지문 대조:

- 문서 전체 높이 6711px로 **양쪽 동일** (px 단위)
- h1 rect [32,145,640,141], 섹션 시작 오프셋 601/1333/3322/4149/4834 동일
- 캐러셀 4장/페이지 이동식·비활성 화살표·FAQ 아코디언 동작 확인
- 390px: 1열 전환, 가로 스크롤 0 (네비 링크 숨김·캐러셀 4장 유지는
  시안 저장본 자체의 동작을 그대로 승계)
- 유일한 기하 차이 navInnerW 823→747 = 로고 문구 축소 때문 (의도)

## 실행

```bash
cd landing/zoviz && python -X utf8 -m http.server 8932
# → http://localhost:8932/
```

폰트(Inter)는 rsms.me CDN 링크라 오프라인에서는 시스템 폰트로 대체된다.

## 미결 (사용자 판단)

- 푸터 X·LinkedIn 아이콘은 시안 그대로 자리표시자 (twitter.com/linkedin.com 루트)
- Start TESS/KMTNet/Gaia 는 앱 루트로 감 (모듈별 딥링크 없음)
- 문의 폼은 백엔드 없이 mailto(pmj3265@knue.ac.kr) 초안 열기로 동작
- 공개 호스팅 방법(Render 정적/GitHub Pages) 미정 — 폴더 통째로 올리면 됨
