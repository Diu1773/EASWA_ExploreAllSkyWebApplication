# -*- coding: utf-8 -*-
"""v23 — 개발 방식 도식에 색과 큰 화살표를 준다 (2026-09-11).

사장님 지시 — *「바이브코딩, ai에이전트 코딩은 그냥 박스도식만 넣으니 잘 안 보이고
색감도 더 다양하게 쓰래, 강조 박스, 큰 화살표」*.

색을 «뜻 있게» 나눈다. 예쁘라고 칠하면 나중에 설명이 안 된다.
  남색 #1F4E79  사람이 하는 일
  보라 #6B4C9A  AI 가 하는 일
  빨강 #C00000  사람이 손에 쥐는 것 — 여기서 값이 맞는지는 안 나온다

그러면 ①과 ②가 같은 코드로 읽힌다. ① 은 남색이 셋이고 보라가 하나, ② 는 보라가
셋이다. **색만 보고도 자율성이 어디로 갔는지 보인다** — Sapkota et al. (2025) 표 1의
「자율성 낮음~중간 → 중간~높음」이 그림에서 그대로 드러난다.
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def patch(fname, pairs):
    p = os.path.join(HERE, fname)
    s = io.open(p, encoding="utf-8").read()
    for old, new in pairs:
        assert s.count(old) == 1, "%s — %d 곳: %s" % (fname, s.count(old), old[:44])
        s = s.replace(old, new)
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)
    print("고침", fname)


# ══ ① 바이브 코딩 ════════════════════════════════════════════════════
patch("figs_v10.py", [
    ('NAVY, BLUE, GREY, RED = "#1F4E79", "#2E75B6", "#8A8A8A", "#C00000"\nLIGHT = "#EAF1F8"',
     'NAVY, BLUE, GREY, RED = "#1F4E79", "#2E75B6", "#8A8A8A", "#C00000"\n'
     'LIGHT = "#EAF1F8"\n'
     'PURPLE = "#6B4C9A"      # AI 가 하는 일. 사람(남색)과 갈라 보이려고 쓴다'),

    ('''cyc = [("자연어로\\n의도를 적는다", NAVY), ("코드가\\n생성된다", BLUE),
       ("실행해\\n확인한다", BLUE), ("고쳐 달라고\\n다시 적는다", GREY)]
w2, g2, x0 = 0.206, 0.040, 0.018
mid = []
for i, (t, c) in enumerate(cyc):
    x = x0 + i * (w2 + g2)
    box(ax, x, 0.58, w2, 0.34, t, fc="white", ec=c, tc=c, fs=14, bold=(i == 0), lw=1.8, tag=T)
    mid.append(x + w2 / 2)
    if i < 3:
        arrow(ax, x + w2 + 0.003, 0.75, x + w2 + g2 - 0.005, 0.75, color=c)''',
     '''# 남색은 사람, 보라는 AI. 넷 중 하나만 보라다 — 사람이 계속 붙어 있다는 뜻이다.
cyc = [("자연어로\\n의도를 적는다", NAVY), ("코드가\\n생성된다", PURPLE),
       ("실행해\\n확인한다", NAVY), ("고쳐 달라고\\n다시 적는다", NAVY)]
w2, g2, x0 = 0.206, 0.040, 0.018
mid = []
for i, (t, c) in enumerate(cyc):
    x = x0 + i * (w2 + g2)
    box(ax, x, 0.58, w2, 0.34, t, fc=c, ec=c, tc="white", fs=14.5, bold=True, lw=1.8, tag=T)
    mid.append(x + w2 / 2)
    if i < 3:
        arrow(ax, x + w2 + 0.002, 0.75, x + w2 + g2 - 0.004, 0.75, color="#5A5A5A",
              lw=2.8, style="-|>")
ax.text(0.018, 0.965, "남색 = 사람이 하는 일    보라 = AI 가 하는 일", fontsize=11.5,
        color="#5A5A5A", va="top")'''),

    ('''ax.text(0.50, 0.05, "전문 개발자가 아니어도 웹 응용을 구성할 수 있는 범위가 넓어졌다 "
                    "(Michels et al., 2026)", ha="center", fontsize=13, color="#333333")''',
     '''box(ax, 0.155, 0.015, 0.690, 0.115,
    "전문 개발자가 아니어도 웹 응용을 구성할 수 있는 범위가 넓어졌다 (Michels et al., 2026)",
    fc="#F4F0F9", ec=PURPLE, tc="#3A2C52", fs=13, bold=True, lw=1.8, tag=T)'''),
])

# ══ ② AI 에이전트 ════════════════════════════════════════════════════
patch("fig_agent.py", [
    ('LIGHT, LOOP = "#EAF1F8", "#F3F7FB"',
     'LIGHT, LOOP = "#FBEDE9", "#F4F0F9"\nPURPLE = "#6B4C9A"      # AI 가 하는 일'),

    ('''box(ax, 0.215, 0.24, 0.545, 0.68, "", fc=LOOP, ec="#D5E2EE", lw=1.2, check=False)
ax.text(0.4875, 0.875, "이 세 가지를 에이전트가 «스스로» 되풀이한다", ha="center",
        fontsize=12, color=BLUE, zorder=4)''',
     '''box(ax, 0.215, 0.24, 0.545, 0.68, "", fc=LOOP, ec="#D6C9E8", lw=1.6, check=False)
ax.text(0.4875, 0.875, "이 세 가지를 에이전트가 «스스로» 되풀이한다", ha="center",
        fontsize=12.5, color=PURPLE, fontweight="bold", zorder=4)
ax.text(0.018, 0.115, "남색 = 사람이 하는 일    보라 = AI 가 하는 일", fontsize=11,
        color="#5A5A5A", va="bottom", zorder=4)'''),

    ('''    box(ax, x, BY, lw_, BH, t, fc="white", ec=BLUE, tc=BLUE, fs=13.5)
    if i:
        arrow(ax, x - lg + 0.002, BY + BH / 2, x - 0.006, BY + BH / 2, color=BLUE)
arrow(ax, 0.197, BY + BH / 2, 0.230, BY + BH / 2)''',
     '''    box(ax, x, BY, lw_, BH, t, fc=PURPLE, ec=PURPLE, tc="white", fs=13.5, bold=True)
    if i:
        arrow(ax, x - lg + 0.002, BY + BH / 2, x - 0.006, BY + BH / 2, color=PURPLE,
              lw=2.6)
arrow(ax, 0.197, BY + BH / 2, 0.230, BY + BH / 2, lw=2.6)'''),

    ('''ax.plot([x_last + lw_ / 2, x_last + lw_ / 2], [BY - PAD, LY], color=BLUE, lw=1.4, zorder=4)
ax.plot([x_last + lw_ / 2, 0.234 + lw_ / 2], [LY, LY], color=BLUE, lw=1.4, zorder=4)
arrow(ax, 0.234 + lw_ / 2, LY, 0.234 + lw_ / 2, BY - PAD - 0.002, color=BLUE)
ax.text(0.4875, LY - 0.105, "시험한 결과를 보고 다시", ha="center", fontsize=11.5, color=BLUE)''',
     '''ax.plot([x_last + lw_ / 2, x_last + lw_ / 2], [BY - PAD, LY], color=PURPLE, lw=2.2, zorder=4)
ax.plot([x_last + lw_ / 2, 0.234 + lw_ / 2], [LY, LY], color=PURPLE, lw=2.2, zorder=4)
arrow(ax, 0.234 + lw_ / 2, LY, 0.234 + lw_ / 2, BY - PAD - 0.002, color=PURPLE, lw=2.2)
ax.text(0.4875, LY - 0.105, "시험한 결과를 보고 다시", ha="center", fontsize=11.5,
        color=PURPLE)'''),

    ('''box(ax, 0.786, BY, 0.196, BH, "사람이 받는 것 —\\n«도는» 코드", fc=LIGHT, ec=RED,
    tc=RED, fs=14, bold=True)
arrow(ax, x_last + lw_ + 0.006, BY + BH / 2, 0.782, BY + BH / 2, color=RED)''',
     '''box(ax, 0.786, BY, 0.196, BH, "사람이 받는 것 —\\n«도는» 코드", fc=LIGHT, ec=RED,
    tc=RED, fs=14, bold=True, lw=2.6)
arrow(ax, x_last + lw_ + 0.006, BY + BH / 2, 0.782, BY + BH / 2, color=RED, lw=3.0)'''),
])

# `arrow()` 가 굵기를 받게 한다 — figs_v10 은 style 인자도 쓴다
p = os.path.join(HERE, "fig_agent.py")
s = io.open(p, encoding="utf-8").read()
old = '''def arrow(ax, x1, y1, x2, y2, color=NAVY, lw=1.6):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>",
                                 mutation_scale=15, color=color, lw=lw, zorder=3))'''
new = '''def arrow(ax, x1, y1, x2, y2, color=NAVY, lw=1.6, ms=None):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>",
                                 mutation_scale=ms if ms else 9 + 5 * lw,
                                 color=color, lw=lw, zorder=3))'''
assert s.count(old) == 1
io.open(p, "w", encoding="utf-8", newline="\n").write(s.replace(old, new))
print("화살촉이 굵기를 따라가게 했다")
