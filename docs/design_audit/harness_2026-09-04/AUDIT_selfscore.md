# EASWA Homepage Prototype v2 — Design Harness Audit

## Changes from v1

1. 로고의 실제 조형 언어를 header/footer에 직접 사용.
2. 탐구 흐름을 별도 'feature section'이 아니라 homepage의 고정 spine처럼 축소·정리.
3. 모듈 사이 간격을 68px로 확대.
4. 세 모듈을 동일한 rounded card가 아니라 catalogue row + scientific surface 구조로 변경.
5. metadata pill을 전부 제거하고 DATA / ANALYSIS / COMPARE / CLASS table로 변경.
6. 실제 repository 자산을 사용:
   - TESS NASA preview
   - M45 cluster image
   - KMTNet microlensing image
   - EASWA step4 / step5 screenshots
7. KMTNet은 repository 상태에 맞춰 '데이터 연결 준비 중'으로 표시.
8. 감성 영문 slogan / motivational CTA / 하단 inspirational banner 없음.
9. Hero는 ESA/Hubble 실제 HUDF URL 사용.
10. 제품 정체성을 실제 EASWA 화면 + compare/interpret/record 구조로 강화.

## Axis 1 — Anti-AI / Human-directed
28 / 30

- shadcn/Tailwind visual default 없음
- 3-card grid 없음
- gradient text 없음
- decorative glow 없음
- scroll reveal 없음
- pill metadata 없음
- repeated arrow CTA 없음
- module 간 68px spacing
- actual scientific/product imagery 사용
- 감점: vertical catalogue 자체는 반복 구조를 가짐

## Axis 2 — Scientific Inquiry
37 / 40

- 실제 data source / analysis / compare source를 모듈에서 직접 노출
- 실제 EASWA 분석/비교 화면을 homepage에 포함
- 공통 탐구 spine 지속 노출
- KMTNet 구현상태를 정확히 구분
- provenance section 포함
- 감점: homepage라 interactive control 자체는 없음

## Axis 3 — EASWA Identity
29 / 30

- user-selected E + orbit logo 사용
- 공통 inquiry spine이 브랜드 구조로 동작
- actual EASWA step screenshots 사용
- measured → compare → interpret → record 구조 노출
- 현재 3개에서 다수 module로 확장 가능한 catalogue
- 감점: prototype이라 실제 app route/navigation은 연결되지 않음

## Total
94 / 100 — PASS

## Hard fail check

- generic centered hero + 3 feature cards: NO
- automatic purple/gradient identity: NO
- AI astronomy imagery: NO
- every information group as rounded card: NO
- identical section layout everywhere: NO
- repeated fade animation: NO
- provenance omitted: NO
- current 3 modules only에 고정된 grid: NO
