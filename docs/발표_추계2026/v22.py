# -*- coding: utf-8 -*-
"""v22 — 12장 왼쪽 화면을 제 것으로 바꾼다 (2026-09-11).

`home_hero.png` 는 첫 화면 위쪽만 담겨 «세 모듈»이 안 보이는데 설명은 세 모듈이라고
적혀 있었다. 그림과 말이 어긋나면 안 된다. 홈 화면과 모듈 목록이 함께 담긴
`easwa_home.png` 로 바꾸고, 아래를 당겨 빈자리를 없앤다.
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

old = '''PH = 3.34
_a = Image.open(os.path.join(FIG, "home_hero.png")).size
_b = Image.open(os.path.join(FIG, "step4_analysis.png")).size
_wa, _wb = PH * _a[0] / _a[1], PH * _b[0] / _b[1]
_x = (W - (_wa + _wb + 0.34)) / 2
pic(sl, "home_hero.png", _x, y + 0.06, _wa, PH, top=True)
pic(sl, "step4_analysis.png", _x + _wa + 0.34, y + 0.06, _wb, PH, top=True)
f = tb(sl, _x, y + 3.46, _wa, 0.3, PP_ALIGN.CENTER)
put(f, "홈 화면 — 세 모듈을 «대표 탐구 질문»과 함께 제시", 14, BODY, first=True,
    align=PP_ALIGN.CENTER)
g = tb(sl, _x + _wa + 0.34, y + 3.46, _wb, 0.3, PP_ALIGN.CENTER)
put(g, "모듈 안 — 분석 실행과 «조건·품질 지표»를 같은 화면에", 14, BODY, first=True,
    align=PP_ALIGN.CENTER)
chip(sl, 3.30, H - 1.28, 6.73, 0.52, "직접 열어 보실 수 있음 — easwa-webapp.onrender.com", 17)
f = tb(sl, M, H - 0.62, W - 2 * M, 0.5)'''
new = '''# 홈 화면은 «모듈 목록까지» 담긴 것을 쓴다. 위쪽만 잘라 쓰면 세 모듈이 안 보인다.
_GAP = 0.34
_a = Image.open(os.path.join(HERE, "easwa_home.png")).size
_b = Image.open(os.path.join(FIG, "step4_analysis.png")).size
PH = (W - 2 * M - _GAP) / (_a[0] / float(_a[1]) + _b[0] / float(_b[1]))
_wa, _wb = PH * _a[0] / _a[1], PH * _b[0] / _b[1]
pic(sl, "easwa_home.png", M, y + 0.06, _wa, PH, root=HERE, top=True)
pic(sl, "step4_analysis.png", M + _wa + _GAP, y + 0.06, _wb, PH, top=True)
f = tb(sl, M, y + PH + 0.16, _wa, 0.3, PP_ALIGN.CENTER)
put(f, "홈 화면 — 세 모듈을 «대표 탐구 질문»과 함께 제시", 14, BODY, first=True,
    align=PP_ALIGN.CENTER)
g = tb(sl, M + _wa + _GAP, y + PH + 0.16, _wb, 0.3, PP_ALIGN.CENTER)
put(g, "모듈 안 — «조건·품질 지표»를 한 화면에", 14, BODY, first=True,
    align=PP_ALIGN.CENTER)
chip(sl, 3.30, 5.68, 6.73, 0.52, "직접 열어 보실 수 있음 — easwa-webapp.onrender.com", 17)
f = tb(sl, M, 6.46, W - 2 * M, 0.5)'''
assert s.count(old) == 1, "12장 본문"
io.open(P, "w", encoding="utf-8", newline="\n").write(s.replace(old, new))
print("12장 왼쪽 화면 교체")
