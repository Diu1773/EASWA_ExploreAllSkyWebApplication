# -*- coding: utf-8 -*-
"""v10 — 그림을 늘리고 배경을 두 장으로 (사장님 지시, 2026-09-11).

  ① Planet Hunters 캡처를 밝은 판으로 바꿨다 (localStorage theme=light)
  ② 연구 배경을 두 장으로 — 자료는 쏟아진다 / 그런데 교실까지 오지 않는다
  ③ 개발 방식 두 장에 도식과 커밋 기록을 넣었다
  ④ EASWA 구조를 표에서 논문 도식(fig_modules)으로 바꿨다
  ⑤ 「준비는 도구가 지고」가 번역체라는 지적 — 주어를 세워 다시 썼다

도식은 `figs_v10.py` 가 만든다. 수치는 모두 원문을 열어 확인했다.
"""
import io
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
shutil.copy(r"C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos/원고_그림/fig_modules.png",
            os.path.join(HERE, "fig_modules.png"))

P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

# ══ ⑤ 번역체 한 줄 ═══════════════════════════════════════════════════
old = '("→ 준비는 도구가 지고, 자료 확인·조건 선택·해석은 학습자가 하도록 설계함",\n     ACC, True),'
assert s.count(old) == 1, "번역체 줄을 못 찾음"

# ══ ② 연구 배경을 두 장으로 ══════════════════════════════════════════
i = s.index("# ═════ 2. 왜 만들었나 ═")
j = s.index("# ═════ 3", i)
bg = '''# ═════ 2. 연구 배경 ① 자료는 쏟아진다 ════════════════════════════════
sl = S()
y = title(sl, "연구 배경 ① 공공 천문자료는 이미 쏟아지고 있음",
          "전천탐사와 우주망원경이 영상·시계열 측광·측성 카탈로그를 상시 공개함")
pic(sl, "fig_scale.png", M, y + 0.10, W - 2 * M, 3.60, root=HERE, top=True)
f = tb(sl, M, y + 3.92, W - 2 * M, 1.0)
put(f, "자료의 양이나 공개 여부가 문제가 아님 — 학교가 같은 규모의 관측시설을 갖추기 "
       "어렵다는 점을 생각하면 오히려 학교 천문탐구의 자료 기반임", 17, BODY, first=True,
    space_after=8)
put(f, "(Fitzgerald et al., 2014; Hasan and Hasan, 2021)", 13, GREY)
cite(sl, "2022 개정 과학과 교육과정은 디지털 탐구 도구를 활용한 자료의 수집·분석·해석을 "
         "강조함 (교육부, 2022).")

# ═════ 3. 연구 배경 ② 그런데 교실까지 오지 않는다 ═════════════════════
sl = S()
y = title(sl, "연구 배경 ② 그런데 교실까지 오지 않음",
          "탐구보다 자료 준비가 먼저 옴")
pic(sl, "fig_pipeline.png", M, y + 0.10, W - 2 * M, 3.35, root=HERE, top=True)
rule(sl, H - 1.30)
f = tb(sl, M, H - 1.12, W - 2 * M, 0.8)
put(f, "이 연구가 잡은 자리 — 플랫폼이 준비 절차를 맡고, 학습자는 자료 확인과 조건 선택과 "
       "해석을 맡음", 18, ACC, True, first=True)
cite(sl, "Wong et al. (2026) · 조훈·손정주 (2022) · 공병민 외 (2023)")

'''
s = s[:i] + bg + s[j:]

# ══ ③ 개발 방식 두 장에 도식 ═════════════════════════════════════════
old_v1 = '''bullets(sl, M, y + 0.05, W - 2 * M, [
    ("전문 개발자가 아니어도 웹 응용을 구성할 수 있는 범위가 넓어졌음 — 실행·생산성·위험을 "
     "함께 정리한 리뷰가 나옴 (Michels et al., 2026)", BODY, False),'''
new_v1 = '''pic(sl, "fig_vibe.png", M, y + 0.02, W - 2 * M, 2.05, root=HERE, top=True)
bullets(sl, M, y + 2.22, W - 2 * M, ['''
assert s.count(old_v1) == 1
s = s.replace(old_v1, new_v1)
s = s.replace('''    ("K-12 교사가 이 방식으로 수업용 학습 도구를 직접 만드는 과정을 다룬 연구 — 8주 워크숍, "
     "교사 3명·멘토 4명 (Song et al., 2026)", BODY, False),''',
'''    ("K-12 교사가 이 방식으로 수업용 학습 도구를 직접 만드는 과정을 다룬 연구 — 8주 워크숍, "
     "교사 3명·멘토 4명 (Song et al., 2026)", BODY, False),''')
s = s.replace('''    ("", BODY, False),
    ("→ 도메인을 아는 사람이 «자기 문제를 푸는 도구»를 직접 만드는 흐름. 이 연구도 그 자리에 있음",
     ACC, True),
], size=17, gap=12)''',
'''    ("→ 도메인을 아는 사람이 «자기 문제를 푸는 도구»를 직접 만드는 흐름. 이 연구도 그 자리에 있음",
     ACC, True),
], size=15, gap=9)''')

old_v2 = '''bullets(sl, M, y + 0.05, W - 2 * M, [
    ("수업 맥락을 아는 연구자가 직접 구현. 사용 범위는 프론트엔드·백엔드 코드 초안·오류 "
     "수정·반복 구현", BODY, False),'''
new_v2 = '''pic(sl, "fig_commits.png", M, y + 0.02, W - 2 * M, 2.35, root=HERE, top=True)
bullets(sl, M, y + 2.52, W - 2 * M, [
    ("수업 맥락을 아는 연구자가 직접 구현. 사용 범위는 프론트엔드·백엔드 코드 초안·오류 "
     "수정·반복 구현", BODY, False),'''
assert s.count(old_v2) == 1
s = s.replace(old_v2, new_v2)
s = s.replace('''    ("개발 방식 간 비교는 하지 않았음. 시간·비용을 기록하지 않아 빨랐다고 말할 수 없음",
     GREY, False),
], size=17, gap=11)''',
'''    ("개발 방식 간 비교는 하지 않았음. 시간·비용을 기록하지 않아 빨랐다고 말할 수 없음",
     GREY, False),
], size=14, gap=8)''')

# ══ ④ 구조를 표에서 도식으로 ═════════════════════════════════════════
i = s.index('y = title(sl, "EASWA의 구조",')
i = s.rindex("# ═════", 0, i)
j = s.index("# ═════", i + 10)
struct = '''# ═════ EASWA 의 구조 — 논문 도식 그대로 ══════════════════════════════
sl = S()
y = title(sl, "EASWA의 구조",
          "자료가 다른 세 모듈에 같은 일곱 단계를 적용함")
pic(sl, "fig_modules.png", M, y + 0.04, W - 2 * M, (H - 1.15) - y - 0.10, root=HERE, top=True)
rule(sl, H - 1.10)
f = tb(sl, M, H - 0.94, W - 2 * M, 0.7)
put(f, "설치·로그인 없이 브라우저에서 바로 열림. 다만 세부 구현과 검토 범위는 같지 않음 — "
       "사용자 검토를 받은 것은 식현상 모듈뿐임", 16, WARN, True, first=True)

'''
s = s[:i] + struct + s[j:]

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("배경 두 장 · 개발 방식에 도식 · 구조를 도식으로 · 번역체 줄은 배경 ②로 옮김")
