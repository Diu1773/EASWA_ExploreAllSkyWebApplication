# -*- coding: utf-8 -*-
"""v21 — 설문 그림에서 중요한 줄에 빨간 상자를 두른다 (2026-09-11).

사장님 지시 — *「설문 그래프나 차트도 중요한 거에 빨간 박스나 화살표를 두자고」*.

**그림 파일은 건드리지 않는다.** 원고와 같은 그림을 써야 하므로, 상자는 슬라이드
도형으로 그 위에 얹는다. 자리는 «눈대중이 아니라 실측»이다 — 그림 안 파란 표식의
세로 위치를 픽셀로 재서 (`fig_survey_*.png`) 아래 분수로 적었다.

  deck/fig_survey_likert  2614×1228 · 10줄. 맨 위 0.0806~0.1311, 맨 아래 0.7785~0.8436
  deck/fig_survey_needs   2614×1637 · (a) 셋째·넷째 0.1888~0.2786,
                           (b) 첫 줄 0.5040~0.5431

맨 아래 줄 상자는 오른쪽을 0.62 에서 끊는다. 그 자리에 범례가 있어 같이 묶이면
범례까지 강조한 꼴이 된다.
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()


def swap(old, new, label):
    global s
    assert s.count(old) == 1, "%s — %d 곳" % (label, s.count(old))
    s = s.replace(old, new)


# ══ pic() 이 놓인 자리를 돌려주게 한다 ════════════════════════════════
swap('''    dy = 0 if top else (maxh - h) / 2
    sl.shapes.add_picture(p, I(x + (maxw - w) / 2), I(y + dy), I(w), I(h))''',
     '''    dy = 0 if top else (maxh - h) / 2
    px, py = x + (maxw - w) / 2, y + dy
    sl.shapes.add_picture(p, I(px), I(py), I(w), I(h))
    return px, py, w, h          # 그림 위에 표시를 얹으려면 놓인 자리가 필요하다


def mark(sl, rect, x0, y0, x1, y1, color=None, lw=2.4):
    """놓인 그림 «안에서의 분수 좌표»로 빨간 상자를 얹는다."""
    px, py, w, h = rect
    color = color if color is not None else WARN
    sh = sl.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                             I(px + x0 * w), I(py + y0 * h),
                             I((x1 - x0) * w), I((y1 - y0) * h))
    sh.adjustments[0] = 0.14
    sh.fill.background()
    sh.line.color.rgb = color
    sh.line.width = Pt(lw)
    sh.shadow.inherit = False
    return sh''', "pic 반환 · mark")

# ══ 사용자 검토 결과 — 맨 위 줄과 맨 아래 줄 ══════════════════════════
swap('''pic(sl, "fig_survey_likert.png", M, y, 6.55, H - y - 0.75, root=HERE)
bullets(sl, M + 6.95, y + 0.10,''',
     '''_r = pic(sl, "fig_survey_likert.png", M, y, 6.55, H - y - 0.75, root=HERE)
mark(sl, _r, 0.012, 0.068, 0.900, 0.158)     # 두 조사 최고
mark(sl, _r, 0.012, 0.787, 0.620, 0.877)     # 두 조사 모두 최하위
bullets(sl, M + 6.95, y + 0.10,''', "검토 결과 표시")

# ══ 보완 요구 — (a) 용어·그래프 두 줄, (b) 수업용 자료 ════════════════
swap('''pic(sl, "fig_survey_needs.png", M, y, 6.55, H - y - 0.75, root=HERE)
bullets(sl, M + 6.95, y + 0.10,''',
     '''_r = pic(sl, "fig_survey_needs.png", M, y, 6.55, H - y - 0.75, root=HERE)
mark(sl, _r, 0.012, 0.172, 0.955, 0.284)     # (a) 용어·기호 · 그래프 읽기
mark(sl, _r, 0.012, 0.452, 0.955, 0.512)     # (b) 보완 요구 최다
bullets(sl, M + 6.95, y + 0.10,''', "보완 요구 표시")

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("설문 그림 넷에 빨간 상자")
