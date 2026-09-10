# -*- coding: utf-8 -*-
"""v7 — 3장을 큰 화면 둘로 (사장님 지시).

*「차라리 simbad 교육지향에 하나, 넣고 사진을 크게 넣고 그렇게하자」*

글 목록 두 칸은 읽히지 않는다. **각 갈래에서 한 곳씩 골라 화면을 크게 보인다.**

  왼쪽  SIMBAD          — 자료 제공 서비스. 워크스루 원본 캡처(2026-07)
  오른쪽 SDSS Voyages    — 교육 지향 환경. 2026-09-11 직접 확인해 캡처

SDSS Voyages 를 고른 이유 — 화면에 **「이 활동은 자료를 그리려면 Excel 이나
Google Sheets 가 필요하다」**고 적혀 있다. 교육용으로 잘 만든 환경도 분석은 밖으로
넘긴다는 것을 화면 자체가 말해 준다. 내가 붙인 해석이 아니라 그 사이트의 문장이다.
"""
import io
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SP = os.path.dirname(HERE)

# 캡처 둘을 deck 옆에 둔다.
shutil.copy(r"C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos/사례분석_기록/simbad_01_home.png",
            os.path.join(HERE, "svc_simbad.png"))
shutil.copy(os.path.join(SP, "sdss_voyages.png"),
            os.path.join(HERE, "svc_voyages.png"))

P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

i = s.index("# ═════ 3. 기존 웹의 지형 — 두 갈래 ═")
j = s.index("# ═════ 4. EASWA 개요 ═")
new3 = '''# ═════ 3. 기존 웹의 지형 — 두 갈래를 화면으로 ═════════════════════════
sl = S()
y = title(sl, "기존 웹 환경",
          "자료 제공 서비스는 탐구 흐름이 없고, 교육 지향 환경은 주제가 고정되고 분석은 밖으로 넘김")

IW = 5.92
LX, RX = M, M + IW + 0.25
IY, IH = y + 0.02, 3.70
pic(sl, "svc_simbad.png", LX, IY, IW, IH, root=HERE, top=True)
pic(sl, "svc_voyages.png", RX, IY, IW, IH, root=HERE, top=True)

CY = IY + IW / 1.6 + 0.14
for x, head, sub in (
    (LX, "자료 제공 서비스",
     "SIMBAD · VizieR · WorldWide Telescope · ESASky\\n"
     "천체명·좌표·카탈로그에서 시작. 분석과 탐구 흐름은 서비스 밖의 몫"),
    (RX, "교육 지향 환경",
     "SDSS Voyages · ESA CESAR · Rubin Observatory · Agent Exoplanet(운영 종료) 등\\n"
     "탐구 흐름은 있으나 주제가 고정되고, 자료를 그리려면 Excel·Google Sheets 가 필요"),
):
    f = tb(sl, x, CY, IW, 1.0)
    put(f, head, 16, ACC, True, first=True, space_after=3)
    for line in sub.split("\\n"):
        put(f, line, 12.5, BODY, line=1.2, space_after=2)

rule(sl, H - 1.02)
f = tb(sl, M, H - 0.86, W - 2 * M, 0.5)
put(f, "EASWA — 공개 아카이브 자료를 쓰면서, 자료 구조가 다른 세 주제를 같은 탐구 흐름 "
       "안에서 분석까지", 16, ACC, True, first=True)
cite(sl, "SIMBAD 2026-07 워크스루 · SDSS Voyages 2026-09-11 확인. "
         "네 서비스 전체 화면과 교사 장벽 응답은 부록 2, 분석 기준은 논문 표 2·3.")

'''
s = s[:i] + new3 + s[j:]
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("3장을 큰 화면 둘로 바꿈")
