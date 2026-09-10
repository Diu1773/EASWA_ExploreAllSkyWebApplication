# -*- coding: utf-8 -*-
"""v8 — 기존 웹 환경을 예시 1·2 두 장으로 (사장님 지시).

*「기존 웹 환경 예시1, 2 이렇게 두고 1에는 simbad vizier, 2에는 저 성단그림이랑,
hunters 사진 두개 크게 좀 넣고 설명 간단히 지금처럼」*

한 장에 네 화면을 넣으면 다 작아진다. 갈래마다 한 장씩, 화면 둘을 크게 놓는다.

  예시 1  SIMBAD · VizieR          — 자료 제공 서비스
  예시 2  SDSS Voyages · Planet Hunters TESS — 교육 지향 환경

Planet Hunters 캡처는 `shoot.py` 로 찍었다. `--screenshot` 은 클릭을 못 해서
튜토리얼 팝업이 늘 덮이므로, DevTools 로 붙어 팝업을 DOM 에서 걷어낸 뒤 찍는다.
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

i = s.index("# ═════ 3. 기존 웹의 지형 — 두 갈래를 화면으로 ═")
j = s.index("# ═════ 4. EASWA 개요 ═")

new = '''# ═════ 3·4. 기존 웹 환경 — 갈래마다 한 장씩 ═══════════════════════════
IW = 5.93
LX, RX = M, M + IW + 0.23


def web_slide(no, head, sub, left, right, tail=None):
    """화면 둘을 크게 놓고 그 아래 한 줄씩 설명한다."""
    sl = S()
    y = title(sl, "기존 웹 환경 — 예시 %s %s" % (no, head), sub)
    iy = y + 0.04
    ih = 3.30
    for x, (name, cap1, cap2) in ((LX, left), (RX, right)):
        pic(sl, name, x, iy, IW, ih, root=HERE, top=True)
        f = tb(sl, x, iy + ih + 0.14, IW, 1.0)
        put(f, cap1, 16, ACC, True, first=True, space_after=3)
        put(f, cap2, 13, BODY, line=1.2)
    if tail:
        rule(sl, H - 0.98)
        g = tb(sl, M, H - 0.84, W - 2 * M, 0.5)
        put(g, tail, 16, ACC, True, first=True)
    return sl


sl = web_slide(
    "①", "자료 제공 서비스",
    "천체명·좌표·카탈로그에서 시작. 분석과 탐구 흐름은 서비스 밖의 몫",
    ("web_simbad.png", "SIMBAD",
     "천체명·좌표로 식별 정보와 문헌을 확인 (Wenger et al., 2000). "
     "탐구 분석용 원자료는 따로 구해야 함"),
    ("web_vizier.png", "VizieR",
     "카탈로그와 표를 조건 검색 (Ochsenbein et al., 2000). "
     "항목·단위 선택과 해석이 부담"))
cite(sl, "WorldWide Telescope · ESASky 를 포함한 네 곳의 진입 화면은 부록 2. "
         "분석 기준과 결과는 논문 표 2·3. 2026-07 워크스루.")

sl = web_slide(
    "②", "교육 지향 환경",
    "활동은 갖췄으나 주제와 자료가 정해져 있고, 분석은 밖으로 넘어감",
    ("web_voyages.png", "SDSS Voyages — 성단 색등급도 활동",
     "단계가 짜여 있으나 대상이 정해져 있고, 안내문이 "
     "「자료를 그리려면 Excel·Google Sheets 가 필요하다」고 밝힘"),
    ("web_hunters.png", "Planet Hunters TESS — 시민과학 분류",
     "이미 만들어진 광도곡선에서 식현상을 눈으로 표시함. "
     "대상 선택도 측광도 모델 적합도 없음 (Fischer et al., 2012)"),
    "EASWA — 공개 아카이브 자료를 쓰면서, 자료 구조가 다른 세 주제를 같은 탐구 흐름 "
    "안에서 분석까지")
cite(sl, "SDSS Voyages · Planet Hunters TESS 2026-09-11 확인. "
         "Agent Exoplanet(LCO)은 같은 갈래의 가장 가까운 선례였으나 운영 종료(부록 3).")

'''
s = s[:i] + new + s[j:]
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("기존 웹 환경을 예시 1·2 두 장으로 나눔")
