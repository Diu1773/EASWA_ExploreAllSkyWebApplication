# -*- coding: utf-8 -*-
"""v12 — 기존 웹 장에 「그래서 무엇이 남나」를 적고, 방향 한 장을 낸다 (2026-09-11).

사장님 지시 —
  *「기존웹환경들 사진 밑에 뭐가 문제인지도 나와야할듯」*
  *「페이지 하나 더 만들어서, 교육지향환경 밑에, EASWA가야할 방향? 같은걸 대충하고
    사진넣어주고」*
  *「교육지향환경에서 근데 뭐가 문제였고 그런걸 어떻게 하지 분석을 안했는데.. ㅋㅋ」*

**마지막 지적이 맞다.** 논문 3.2 는 교육 지향 환경을 «사례분석에서 제외»했다고 적었다.
그러니 그쪽을 「문제가 이러이러하다」고 단정하면 안 하는 분석을 한 것처럼 된다.

  예시 ① 자료 제공 서비스 — 워크스루로 «분석한» 결과다. 표 3 이 근거다. 단정해도 된다.
  예시 ② 교육 지향 환경   — 분석 대상이 아니다. **화면과 안내문에 적힌 것만 적는다.**
                            부제에 「사례분석 대상이 아님」을 못박는다.

방향 장의 근거는 논문 표 5 의 다섯 설계 원리다. 새 주장을 만들지 않는다.
"""
import io
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
shutil.copy(r"C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos/원고_그림/_split_home_modules.png",
            os.path.join(HERE, "easwa_home.png"))

P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

# ══ 캡션을 세 줄로 — 이름 / 무엇을 하나 / 그래서 무엇이 남나 ═════════
old = '''    for x, (name, cap1, cap2) in ((LX, left), (RX, right)):
        pic(sl, name, x, iy, IW, ih, root=HERE, top=True)
        f = tb(sl, x, iy + ih + 0.14, IW, 1.0)
        put(f, cap1, 16, ACC, True, first=True, space_after=3)
        put(f, cap2, 13, BODY, line=1.2)'''
new = '''    for x, (name, cap1, cap2, cap3) in ((LX, left), (RX, right)):
        pic(sl, name, x, iy, IW, ih, root=HERE, top=True)
        f = tb(sl, x, iy + ih + 0.12, IW, 1.3)
        put(f, cap1, 16, ACC, True, first=True, space_after=3)
        put(f, cap2, 12.5, BODY, line=1.18, space_after=5)
        put(f, cap3, 12.5, WARN, True, line=1.18)'''
assert s.count(old) == 1
s = s.replace(old, new)

# ══ 예시 ① — 표 3 이 받치는 판정이라 단정해도 된다 ═══════════════════
old = '''    ("web_simbad.png", "SIMBAD",
     "천체명·좌표로 식별 정보와 문헌을 확인 (Wenger et al., 2000). "
     "탐구 분석용 원자료는 따로 구해야 함"),
    ("web_vizier.png", "VizieR",
     "카탈로그와 표를 조건 검색 (Ochsenbein et al., 2000). "
     "항목·단위 선택과 해석이 부담"))'''
new = '''    ("web_simbad.png", "SIMBAD",
     "천체명·좌표로 식별 정보와 문헌을 확인 (Wenger et al., 2000)",
     "→ 탐구 질문에서 출발하는 진입 경로가 없고, 분석용 원자료는 따로 구해야 함"),
    ("web_vizier.png", "VizieR",
     "카탈로그와 표를 조건 검색 (Ochsenbein et al., 2000)",
     "→ 항목·단위 선택이 부담이고, 표를 받아도 분석은 서비스 밖에서 해야 함"))'''
assert s.count(old) == 1
s = s.replace(old, new)

# ══ 예시 ② — 분석 대상이 아니다. 화면에 적힌 것만 적는다 ═════════════
old = '''sl = web_slide(
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
         "Agent Exoplanet(LCO)은 같은 갈래의 가장 가까운 선례였으나 운영 종료(부록 3).")'''
new = '''sl = web_slide(
    "②", "교육 지향 환경",
    "사례분석 대상이 아님 — 두 곳의 화면과 안내문에서 확인한 것만 적음",
    ("web_voyages.png", "SDSS Voyages — 성단 색등급도 활동",
     "단계가 짜여 있고 안내가 촘촘함. 학습자가 성단을 골라 색등급도를 만들고 "
     "나이·거리를 추정하도록 이끎",
     "→ 대상이 정해져 있고, 안내문이 「자료를 그리려면 Excel·Google Sheets 가 "
     "필요하다」고 밝힘"),
    ("web_hunters.png", "Planet Hunters TESS — 시민과학 분류",
     "실제 TESS 광도곡선을 보여 주고 식현상이 보이면 표시하게 함 "
     "(Fischer et al., 2012)",
     "→ 과업이 분류임. 대상 선택도 측광도 모델 적합도 없음"))
cite(sl, "SDSS Voyages · Planet Hunters TESS 2026-09-11 확인. 이 두 곳은 학교 탐구 흐름을 "
         "이미 갖추고 있어 논문의 사례분석(표 2·3)에서는 제외하였음(3.2). "
         "Agent Exoplanet(LCO)은 가장 가까운 선례였으나 운영 종료(부록 3).")

# ═════ EASWA 가 가야 할 방향 ══════════════════════════════════════════
sl = S()
y = title(sl, "EASWA가 가야 할 방향",
          "앞의 두 갈래에서 갈라지는 지점 셋")
pic(sl, "easwa_home.png", M, y + 0.04, W - 2 * M, 3.05, root=HERE, top=True)
bullets(sl, M, y + 3.26, W - 2 * M, [
    ("① 공개 아카이브 자료를 그대로 쓰되, 검색·내려받기·형식 변환·반복 계산은 플랫폼이 맡음",
     BODY, False),
    ("② 자료 구조가 다른 여러 주제를 «같은» 탐구 흐름 안에 둠 — 주제마다 다른 도구로 "
     "흩어지지 않게", BODY, False),
    ("③ 분석을 밖으로 넘기지 않음. 대신 분석 조건을 학습자가 정하고 그 조건을 화면에 남김",
     ACC, True),
], size=16, gap=9)
cite(sl, "이 방향은 사례분석·이론적 검토·교육과정 및 교과서 검토에 대조해 다섯 설계 원리로 "
         "정리하였음 — 탐구 주제 중심 접근 · 기술 실행 부담 완화 · 분석 과정의 가시화 · "
         "결과 해석의 학습자 수행 · 수업 적용 가능성 지원 (논문 표 5).")'''
assert s.count(old) == 1
s = s.replace(old, new)

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("캡션 세 줄 · 예시 ② 를 관찰로 한정 · 방향 한 장 추가")
