# -*- coding: utf-8 -*-
"""v5 — 「교육용 웹은 왜 없냐, 안 찾아봤냐」 질문을 미리 막는다 (사장님 지적).

논문 3.2 에 표집 논리가 있는데 슬라이드에 없었다 — *「특정 학습 활동을 미리 담아 둔
교육 지향 환경(1.2)은 학교 탐구 흐름을 이미 갖추고 있어 이 분석에서 제외하였다」*.

  ① 3장에 제외 근거를 한 줄로 넣어 질문이 나오기 전에 답한다
  ② 부록에 교육 지향 환경 목록을 인용과 함께 둔다 — 물으면 그 장으로 간다

목록과 서지는 논문 1.2 와 참고문헌에서 그대로 가져왔다.
"""
import io

P = "deck/build.py"
s = io.open(P, encoding="utf-8").read()

# ══ ① 3장 — 제외 근거를 부제 아래 한 줄로 ═════════════════════════
old = '''y = title(sl, "기존 서비스 분석",
          "네 서비스 모두 탐구 흐름은 사용자 몫이었음")
pic(sl, "case_stage1_entry.png", M, y, 7.1, (H - 1.28) - y - 0.15)'''
new = '''y = title(sl, "기존 서비스 분석",
          "네 서비스 모두 탐구 흐름은 사용자 몫이었음")
f = tb(sl, M, y - 0.10, W - 2 * M, 0.36)
put(f, "자료 제공이 주 기능인 서비스를 목적 표집함. 특정 학습 활동을 미리 담아 둔 "
       "교육 지향 환경은 탐구 흐름을 이미 갖추고 있어 제외 (부록)", 13, GREY, first=True)
y += 0.32
pic(sl, "case_stage1_entry.png", M, y, 7.1, (H - 1.28) - y - 0.12)'''
assert s.count(old) == 1
s = s.replace(old, new)

# ══ ② 부록 한 장 — 교육 지향 환경 ═════════════════════════════════
block = '''# ═════ 부록 2. 교육 지향 환경 — 「왜 뺐냐」는 물음에 답한다 ═══════════
sl = S()
y = title(sl, "부록 · 검토했으나 사례분석에서 제외한 교육 지향 환경",
          "학교 탐구 흐름을 이미 갖추고 있어 「자료만 주는 서비스에 무엇이 남는가」를 "
          "묻는 이 분석의 대상이 아님")
bullets(sl, M, y + 0.05, W - 2 * M, [
    ("Agent Exoplanet (Las Cumbres Observatory) — 공개 외계행성 자료로 웹에서 밝기를 재고 "
     "광도곡선을 구성. 2026년 9월 확인 시 운영 종료, 보존 안내만 표시됨", BODY, False),
    ("DIY Planet Search — 위 후속. 학습자가 원격 망원경으로 «직접 얻은» 영상을 사용함. "
     "공개 아카이브 자료를 쓰는 이 연구와 자료원이 다름", BODY, False),
    ("Planet Hunters · Galaxy Zoo — 대중을 실제 관측자료의 분류·검토에 참여시킴 "
     "(Fischer et al., 2012; Raddick et al., 2019). 분석이 아니라 분류가 과업임", BODY, False),
    ("WorldWide Telescope 기반 교육 프로그램 (Guo et al., 2024; Udomprasert et al., 2012) · "
     "SDSS Voyages · ESA CESAR · Rubin Observatory 온라인 탐구활동 (Herrold and Prather, 2023) — "
     "특정 학습 주제와 활동이 미리 짜여 있음", BODY, False),
    ("시민 과학자의 소형 망원경을 외계행성 추적 관측에 쓰는 방안도 제시됨 "
     "(Zellem et al., 2020)", BODY, False),
    ("", BODY, False),
    ("→ 이 연구가 물은 것은 «학교 탐구 흐름이 없는» 자료 서비스에서 교사가 무엇을 더 "
     "해야 하는가임. 위 환경들은 그 흐름을 이미 갖추고 있어 같은 잣대로 잴 수 없음", ACC, True),
], size=15, gap=10)
cite(sl, "논문 1.2 · 3.2. 목록과 서지는 논문 참고문헌에 실려 있음.")

'''
k = s.index("os.makedirs(DEST, exist_ok=True)")
s = s[:k] + block + s[k:]

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("3장에 제외 근거 한 줄 · 부록 2 추가")
