# -*- coding: utf-8 -*-
"""v4 — 사장님 지시 셋 (2026-09-10 밤).

  ① 후속과제를 좀 더 강조 → 결론 앞에 한 장을 새로 낸다
  ② 「자료가 이미 많다」·「수업에서 쓰기 어렵다」에 인용을 단다
  ③ 기존 서비스 장을 구체적으로 — 표 3 의 실제 항목과 교사 응답 수치를 넣는다

인용은 모두 논문 참고문헌에서 그대로 가져왔다. 지어내지 않는다.
"""
import io

P = "deck/build.py"
s = io.open(P, encoding="utf-8").read()

# ══ ② 2장 — 인용을 단다 ═══════════════════════════════════════════
old = '''    ("MAST · Gaia · KMTNet 등 공개 아카이브가 영상·시계열 측광·측성 카탈로그를 상시 제공 — "
     "자료는 이미 충분함", BODY, False),
    ("그러나 수업에서 쓰려면 검색 → 내려받기 → 형식 변환 → 코딩 → 반복 계산을 먼저 지나야 함. "
     "학습 목표와 무관한 절차임", BODY, False),
    ("코딩 기반 교사교육에서도 현직·예비교사 모두 파이썬 코딩을 학교 적용의 "
     "가장 큰 어려움으로 꼽았음", BODY, False),'''
new = '''    ("MAST · Gaia · KMTNet 등 공개 아카이브가 영상·시계열 측광·측성 카탈로그를 상시 제공 — "
     "자료는 이미 충분함 (Fitzgerald et al., 2014; Hasan and Hasan, 2021)", BODY, False),
    ("그러나 수업에서 쓰려면 검색 → 내려받기 → 형식 변환 → 코딩 → 반복 계산을 먼저 지나야 함. "
     "학습 목표와 무관한 절차임", BODY, False),
    ("교사 조사에서도 수업에 적합한 자료에 접근하는 일(53%)과 자료를 수업에 통합하는 "
     "일(47%)이 가장 큰 어려움으로 보고됨 (Wong et al., 2026)", BODY, False),
    ("코딩 기반 교사교육에서도 현직·예비교사 모두 파이썬 코딩을 학교 적용의 "
     "가장 큰 어려움으로 꼽았음 (조훈·손정주, 2022; 공병민 외, 2023)", BODY, False),'''
assert s.count(old) == 1
s = s.replace(old, new)
s = s.replace('cite(sl, "교육부 (2022) 과학과 교육과정 · Wong et al. (2026)")',
              'cite(sl, "교육부 (2022) 과학과 교육과정 [별책 9]")')

# ══ ③ 3장 — 구체적으로 ════════════════════════════════════════════
old = '''bullets(sl, M + 7.5, y + 0.2, W - M - 7.5 - M + 0.4, [
    ("SIMBAD · VizieR — 천체명·좌표·카탈로그 질의에서 시작", BODY, False),
    ("WorldWide Telescope · ESASky — 시각 탐색과 통합 자료 접근이 중심", BODY, False),
    ("네 곳 모두 단계별 질문과 기록 활동은 서비스 밖에 있음", ACC, True),
], size=17, gap=16)
cite(sl, "학교 활용 관점의 연구자 워크스루 (2026). 분석 기준과 결과는 논문 표 2·3.")'''
new = '''bullets(sl, M + 7.5, y + 0.2, W - M - 7.5 - M + 0.4, [
    ("SIMBAD — 천체명·좌표로 식별 정보와 문헌을 확인 (Wenger et al., 2000). "
     "탐구 분석용 원자료는 따로 구해야 함", BODY, False),
    ("VizieR — 카탈로그·표를 조건 검색 (Ochsenbein et al., 2000). "
     "항목·단위 선택이 부담", BODY, False),
    ("WorldWide Telescope — 하늘 지도 위 시각 탐색 (Rosenfield et al., 2018). "
     "정량 분석은 외부로 위임", BODY, False),
    ("ESASky — 미션·파장별 통합 탐색과 자료 내려받기 (Baines et al., 2017). "
     "자료 판단과 탐구 연계는 학습자 몫", BODY, False),
    ("네 곳 모두 진입이 천체명·좌표·카탈로그·하늘 영역에서 시작 — "
     "질문에서 출발하는 경로는 없었음", ACC, True),
], size=14, gap=11)
f = tb(sl, M, H - 1.28, W - 2 * M, 0.7)
put(f, "교사에게 예시 화면을 보이고 예상 장벽을 물은 결과 — 학생 수준 재구성 11명(84.6%), "
       "영어 인터페이스·전문 용어 10명(76.9%)", 15, ACC2, True, first=True)
cite(sl, "학교 활용 관점의 연구자 워크스루 · 분석 기준과 결과는 논문 표 2·3. "
         "장벽 응답은 1차 현직 중심 N=13.")'''
assert s.count(old) == 1
s = s.replace(old, new)

# ══ ① 후속과제 한 장 — 결론 바로 앞 ═══════════════════════════════
block = '''# ═════ 11. 후속 과제 ══════════════════════════════════════════════════
sl = S()
y = title(sl, "후속 과제",
          "학생 적용과 수업 자료가 먼저, 나머지 두 모듈 검토가 그다음임")
bullets(sl, M, y + 0.05, W - 2 * M, [
    ("① 고등학생이 직접 수행하는 조건에서 탐구 과정과 자료 기반 설명을 분석 — "
     "이번 검토는 교사 대상이었고 학생 수행 자료는 없음", BODY, False),
    ("② 수업 시나리오와 학생용 활동지·교사용 안내 자료를 함께 개발 — "
     "두 조사에서 가장 많이 요구된 항목임", BODY, False),
    ("③ KMTNet·성단 색등급도 모듈에도 산출값 점검과 사용자 검토를 식현상 모듈과 "
     "같은 수준으로 수행", BODY, False),
    ("④ 변광성·H-R도·태양활동·은하 스펙트럼 등 다른 자료 유형과 외부 개발자가 모듈을 "
     "추가하는 조건에서 공통 흐름의 재사용 가능성을 검토", BODY, False),
    ("⑤ 학습자의 숙련에 따라 안내와 분석 조건의 개방 정도를 조절하는 설계", BODY, False),
    ("", BODY, False),
    ("→ ①②가 먼저임. 해석 지원이 남은 과제로 확인된 이상 학생이 실제로 어디서 "
     "막히는지부터 봐야 함", ACC, True),
], size=17, gap=11)

'''
k = s.index("# ═════ 13. 결론 ═")
s = s[:k] + block + s[k:]

# ══ 참고문헌 — 새로 인용한 것을 넣는다 ════════════════════════════
old = '    "Gaia Collaboration, Vallenari A, Brown A G A, et al. (2023) Gaia Data Release 3. A&A 674: A1.",'
new = ('    "Baines D et al. (2017) Visualization of multi-mission astronomical data with ESASky. PASP 129: 028001.",\n'
       '    "Fitzgerald M T, Hollow R, Rebull L M, Danaia L and McKinnon D H (2014) A review of high school level astronomy student research projects over the last two decades. PASA 31: e037.",\n'
       '    "Gaia Collaboration, Vallenari A, Brown A G A, et al. (2023) Gaia Data Release 3. A&A 674: A1.",\n'
       '    "Hasan P and Hasan S N (2021) Astronomy data, virtual observatory and education. Proc. IAU 15(S367): 151-154.",')
assert s.count(old) == 1
s = s.replace(old, new)

old = '    "Paczynski B (1986) Gravitational microlensing by the galactic halo. ApJ 304: 1-5.",'
new = ('    "Ochsenbein F, Bauer P and Marcout J (2000) The VizieR database of astronomical catalogues. A&AS 143: 23-32.",\n'
       '    "Paczynski B (1986) Gravitational microlensing by the galactic halo. ApJ 304: 1-5.",\n'
       '    "Rosenfield P, Fay J, Gilchrist R K, et al. (2018) AAS WorldWide Telescope. ApJS 236: 22.",')
assert s.count(old) == 1
s = s.replace(old, new)

old = '    "Wong N, Elsayed R, Perez L R, Nilsen K, Daehler K R and Darche S (2026) Data-rich science instruction. Education Sciences 16: 171.",'
new = ('    "Wenger M, Ochsenbein F, Egret D, et al. (2000) The SIMBAD astronomical database. A&AS 143: 9-22.",\n'
       '    "Wong N, Elsayed R, Perez L R, Nilsen K, Daehler K R and Darche S (2026) Data-rich science instruction. Education Sciences 16: 171.",\n'
       '    "공병민, 김희수, 이효녕 (2023) 공공 데이터를 활용한 지구과학 탐구 활동 개발. 현장과학교육 17: 331-345.",\n'
       '    "조훈, 손정주 (2022) 고등학교 천문학 수업에서 코딩을 활용한 데이터 기반 탐구활동. 현장과학교육 16: 602-618.",')
assert s.count(old) == 1
s = s.replace(old, new)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("2장 인용 · 3장 구체화 · 후속 과제 한 장 · 참고문헌 여덟 건 추가")
