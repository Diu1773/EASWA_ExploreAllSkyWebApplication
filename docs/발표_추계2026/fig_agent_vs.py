# -*- coding: utf-8 -*-
"""바이브 코딩과 AI 에이전트 — 원문 그림 + 우리말 곁들이 표 (2026-09-11).

사장님 지시 — *「글보다 도식이나 사진이 좋은데 논문에 있을듯한데」*.
있었다. 그래서 **표를 주인공에서 내리고 원문 그림을 세웠다.**

  Sapkota, R., Roumeliotis, K. I., and Karkee, M. (2025)
  *Vibe Coding vs. Agentic Coding: Fundamentals and Practical Implications of Agentic AI*
  arXiv:2505.19443 · 2025-05-26 · **CC BY 4.0**

**라이선스를 먼저 확인했다.** arXiv 기본 라이선스였다면 그림을 옮길 수 없었다.
CC BY 4.0 이므로 저작자·제목·출처·라이선스를 밝히면 그대로 쓸 수 있다. 그림 안과
슬라이드 아래 두 곳에 적는다.

  왼쪽   원문 Fig. 5 — 프롬프트→LLM→개발자 / 목표→계획자→실행자 + 기억·도구·격리 환경
  오른쪽 원문 표 1 의 세 항목을 우리말로 간추린 것

네 번째 항목이던 「계획·작업 분해」는 뺐다. 자율성과 겹치고, 그림의 Planner 칸이
이미 그 말을 한다.

원문 그림은 `sapkota_fig5.png` 다. 다시 받으려면 —
    curl -sL https://arxiv.org/html/2505.19443v1/Architecturaldiff.png -o deck/sapkota_fig5.png

    python deck/fig_agent_vs.py   →  deck/fig_agent_vs.png
"""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
from matplotlib import rcParams
from matplotlib.patches import FancyBboxPatch

rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sapkota_fig5.png")

NAVY, BLUE, GREY = "#1F4E79", "#2E75B6", "#8A8A8A"
LIGHT, SOFT = "#EAF1F8", "#F7F9FC"
PAD = 0.004
_drawn = []

ROWS = [
    ("사람의 역할",
     "감독·부조종사.\n작은 작업을 정하고\n나온 코드를 매번 본다",
     "설계자·관리자·감독.\n목표·구조·제약을 정하고\n진행을 지켜본다"),
    ("자율성",
     "낮음~중간.\n사람이 계속 시켜야 한다",
     "중간~높음.\n계획·분해·실행을\n스스로 이어 간다"),
    ("상호작용",
     "짧은 대화를 자주 주고받는다",
     "목표를 맡기고 보고를 받는다"),
]

COLS = [(0.004, 0.150), (0.160, 0.575), (0.585, 0.996)]


def box(ax, x, y, w, h, text, fc="white", ec="#D3DDE8", tc="#1A1A1A", fs=13,
        bold=False, lw=1.2, ha="center"):
    x0, x1, y0, y1 = x - PAD, x + w + PAD, y - PAD, y + h + PAD
    assert -1e-9 <= x0 and x1 <= 1 + 1e-9, "축 밖: x %.3f~%.3f" % (x0, x1)
    assert -1e-9 <= y0 and y1 <= 1 + 1e-9, "축 밖: y %.3f~%.3f" % (y0, y1)
    for (a0, a1, b0, b1, t) in _drawn:
        if x0 < a1 - 1e-9 and a0 < x1 - 1e-9 and y0 < b1 - 1e-9 and b0 < y1 - 1e-9:
            raise AssertionError("칸이 겹친다: %r 와 %r"
                                 % (" ".join(text.split()), " ".join(t.split())))
    _drawn.append((x0, x1, y0, y1, text))
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle="round,pad=%g,rounding_size=0.010" % PAD,
                                fc=fc, ec=ec, lw=lw, zorder=2))
    tx = x + w / 2 if ha == "center" else x + 0.016
    ax.text(tx, y + h / 2, text, ha=ha, va="center", fontsize=fs, color=tc,
            zorder=3, fontweight="bold" if bold else "normal", linespacing=1.35)


fig = plt.figure(figsize=(13.6, 4.50), dpi=200)
fig.patch.set_facecolor("white")

# ── 왼쪽: 원문 Fig. 5 ─────────────────────────────────────────────────
axi = fig.add_axes([0.004, 0.100, 0.400, 0.860])
axi.imshow(mpimg.imread(SRC))
axi.axis("off")
fig.text(0.204, 0.028, "Sapkota, Roumeliotis and Karkee (2025) arXiv:2505.19443 Fig. 5 · "
         "CC BY 4.0", ha="center", fontsize=9.5, color=GREY)

# ── 오른쪽: 표 1 을 우리말로 ──────────────────────────────────────────
ax = fig.add_axes([0.425, 0.100, 0.571, 0.860])
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

HH, HY = 0.125, 0.868
box(ax, COLS[1][0], HY, COLS[1][1] - COLS[1][0], HH, "바이브 코딩",
    fc=SOFT, ec=BLUE, tc=BLUE, fs=15, bold=True, lw=1.6)
box(ax, COLS[2][0], HY, COLS[2][1] - COLS[2][0], HH, "AI 에이전트",
    fc=NAVY, ec=NAVY, tc="white", fs=15, bold=True, lw=1.6)

RH, GAP = 0.245, 0.025
top = HY - 0.032
for i, (lab, left, right) in enumerate(ROWS):
    y = top - (i + 1) * RH - i * GAP
    box(ax, COLS[0][0], y, COLS[0][1] - COLS[0][0], RH, lab,
        fc="white", ec="white", tc=NAVY, fs=12.5, bold=True, lw=0.1)
    box(ax, COLS[1][0], y, COLS[1][1] - COLS[1][0], RH, left,
        fc="white", ec="#D3DDE8", tc="#333333", ha="left")
    box(ax, COLS[2][0], y, COLS[2][1] - COLS[2][0], RH, right,
        fc=LIGHT, ec="#BBCDE0", tc=NAVY, ha="left")

fig.text(0.710, 0.028, "같은 논문 표 1의 세 항목을 우리말로 간추렸음. 2026-09-11 원문 확인.",
         ha="center", fontsize=9.5, color=GREY)

fig.savefig("deck/fig_agent_vs.png", facecolor="white")
plt.close(fig)
from PIL import Image
print("fig_agent_vs.png", Image.open("deck/fig_agent_vs.png").size)
