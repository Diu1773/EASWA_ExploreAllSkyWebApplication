# -*- coding: utf-8 -*-
"""v6 — 기존 웹을 두 갈래로 한 장에 담는다 (사장님 교정).

*「부록2에 붙일게 아니라;; 기존서비스들, 웹 새로만들어서 넣어야지」*

부록에 숨기면 「안 찾아봤냐」는 물음을 못 막는다. **기존 웹의 지형을 본문에서
보이고 EASWA 가 어디에 서는지 말하는 것이 맞다.** 3장을 두 칸으로 다시 짠다.

  왼쪽  자료 제공 서비스 넷 — 사례분석 대상. 탐구 흐름이 없다
  오른쪽 교육 지향 환경     — 탐구 흐름은 있으나 자료·주제가 고정되어 있다
  아래   EASWA 의 자리

밀려난 진입 화면 캡처와 교사 장벽 응답은 부록으로 옮긴다.
목록·서지·판정은 모두 논문 1.2·3.2·표 3 에서 가져왔다.
"""
import io

P = "deck/build.py"
s = io.open(P, encoding="utf-8").read()

# ── 옛 3장을 통째로 갈아 끼운다 ───────────────────────────────────
i = s.index("# ═════ 3. 기존 서비스 (방법은 줄이고 결과만) ═")
j = s.index("# ═════ 4. EASWA 개요 ═")
new3 = '''# ═════ 3. 기존 웹의 지형 — 두 갈래 ════════════════════════════════════
sl = S()
y = title(sl, "기존 웹 환경",
          "자료 제공 서비스는 탐구 흐름이 없고, 교육 지향 환경은 자료와 주제가 미리 정해져 있음")

CW = 5.95
LX, RX = M, M + CW + 0.25


def col(x, head, note, items, tail):
    f = tb(sl, x, y + 0.02, CW, 0.4)
    put(f, head, 17, ACC, True, first=True, space_after=2)
    put(f, note, 12, GREY)
    g = tb(sl, x, y + 0.62, CW, 3.5)
    for k, t in enumerate(items):
        put(g, t, 13, BODY, space_after=9, first=(k == 0), line=1.18)
    h = tb(sl, x, y + 3.62, CW, 0.85)
    put(h, tail, 14, ACC, True, first=True, line=1.2)


col(LX, "자료 제공 서비스", "네 곳을 학교 활용 관점에서 워크스루 (사례분석 대상)", [
    "SIMBAD — 천체명·좌표로 식별 정보와 문헌 확인 (Wenger et al., 2000). "
    "탐구 분석용 원자료는 따로 구해야 함",
    "VizieR — 카탈로그·표를 조건 검색 (Ochsenbein et al., 2000). 항목·단위 선택이 부담",
    "WorldWide Telescope — 하늘 지도 위 시각 탐색 (Rosenfield et al., 2018). "
    "정량 분석은 외부로 위임",
    "ESASky — 미션·파장별 통합 탐색과 내려받기 (Baines et al., 2017). "
    "자료 판단과 탐구 연계는 학습자 몫",
], "→ 진입이 천체명·좌표·카탈로그·하늘 영역에서 시작. 질문에서 출발하는 경로는 없었음")

col(RX, "교육 지향 환경", "탐구 흐름은 이미 갖추고 있어 사례분석에서는 제외", [
    "Agent Exoplanet (LCO) — 공개 외계행성 자료로 웹에서 측광·광도곡선. "
    "2026년 9월 확인 시 운영 종료",
    "DIY Planet Search — 위 후속. 학습자가 원격 망원경으로 직접 얻은 영상을 사용",
    "Planet Hunters · Galaxy Zoo — 대중이 관측자료를 분류·검토 "
    "(Fischer et al., 2012; Raddick et al., 2019)",
    "WWT 기반 교육 프로그램 (Guo et al., 2024; Udomprasert et al., 2012) · "
    "SDSS Voyages · ESA CESAR · Rubin Observatory 온라인 탐구활동 "
    "(Herrold and Prather, 2023)",
], "→ 학습 주제와 자료 유형이 미리 정해져 있음")

rule(sl, H - 1.30)
f = tb(sl, M, H - 1.12, W - 2 * M, 0.7)
put(f, "EASWA 의 자리 — 공개 아카이브 자료를 쓰면서, 자료 구조가 다른 세 주제를 "
       "같은 탐구 흐름에 둠", 17, ACC, True, first=True)
cite(sl, "목록과 판정은 논문 1.2 · 3.2 · 표 3. 네 서비스의 진입 화면과 교사 장벽 응답은 부록 2.")

'''
s = s[:i] + new3 + s[j:]

# ── 부록 2 를 진입 화면 + 장벽 응답으로 바꾼다 ────────────────────
i = s.index("# ═════ 부록 2. 교육 지향 환경 — 「왜 뺐냐」는 물음에 답한다 ═")
j = s.index("os.makedirs(DEST, exist_ok=True)")
new_ap = '''# ═════ 부록 2. 네 서비스의 진입 화면 ══════════════════════════════════
sl = S()
y = title(sl, "부록 · 자료 제공 서비스 네 곳의 진입 화면",
          "네 곳 모두 천체명·좌표·카탈로그·하늘 영역에서 시작함")
pic(sl, "case_stage1_entry.png", M, y, W - 2 * M, (H - 1.30) - y - 0.12)
f = tb(sl, M, H - 1.18, W - 2 * M, 0.7)
put(f, "교사에게 예시 화면을 보이고 예상 장벽을 물은 결과 — 학생 수준 재구성 11명(84.6%), "
       "영어 인터페이스·전문 용어 10명(76.9%)", 16, ACC2, True, first=True)
cite(sl, "학교 활용 관점의 연구자 워크스루 · 분석 기준과 결과는 논문 표 2·3. "
         "장벽 응답은 1차 현직 중심 N=13.")

'''
s = s[:i] + new_ap + s[j:]

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("3장을 두 갈래로 다시 짜고, 진입 화면을 부록 2 로 옮김")
