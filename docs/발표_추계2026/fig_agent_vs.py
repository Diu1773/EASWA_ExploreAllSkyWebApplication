# -*- coding: utf-8 -*-
"""바이브 코딩과 AI 에이전트가 갈리는 네 지점 (2026-09-11).

사장님이 링크를 주셨다 — themoonlight.io 의 한국어 요약.
**요약본은 인용하지 않는다.** 원문을 열어 확인하고 원문을 인용한다.

  Sapkota, R., Roumeliotis, K. I., and Karkee, M. (2025)
  *Vibe Coding vs. Agentic Coding: Fundamentals and Practical Implications of Agentic AI*
  arXiv:2505.19443 (2025-05-26 제출, 버전 하나)

네 줄은 그 논문 표 1(Table I)의 네 항목을 우리말로 간추린 것이다. 확인한 원문 표현 —
  AI Autonomy Level      Low to Moderate                     / Moderate to High
  Developer's Role       Director, Co-Pilot, Prompter        / Architect, Project Manager, Supervisor
  Interaction Model      highly conversational ... cycles    / Goal delegation and monitoring
  Planning & Task Decomp Primarily human-led                 / Primarily AI-led within defined constraints
그리고 본문의 비유 — vibe 는 "high-speed copilot", agentic 은
"an intelligent collaborator capable of independently steering the aircraft".

사장님 메모의 「쉬지 않고 일하는」은 원문에서 찾지 못해 넣지 않았다.

    python deck/fig_agent_vs.py   →  deck/fig_agent_vs.png
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
from matplotlib.patches import FancyBboxPatch

rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

NAVY, BLUE, GREY = "#1F4E79", "#2E75B6", "#8A8A8A"
LIGHT, SOFT = "#EAF1F8", "#F7F9FC"
PAD = 0.003
_drawn = []

ROWS = [
    ("자율성",
     "낮음~중간.\n사람이 계속 시켜야 한다",
     "중간~높음.\n계획·분해·실행을 스스로 이어 간다"),
    ("사람의 역할",
     "감독·부조종사.\n작은 작업을 정하고 나온 코드를 매번 본다",
     "설계자·관리자·감독.\n목표·구조·제약을 정하고 진행을 지켜본다"),
    ("상호작용",
     "짧은 대화를 자주 주고받는다",
     "목표를 맡기고 보고를 받는다"),
    ("계획·작업 분해",
     "주로 사람이 한다",
     "정해 준 제약 안에서 주로 AI가 한다"),
]

COLS = [(0.004, 0.108), (0.120, 0.552), (0.564, 0.996)]


def box(ax, x, y, w, h, text, fc="white", ec="#D3DDE8", tc="#1A1A1A", fs=12.5,
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
                                boxstyle="round,pad=%g,rounding_size=0.008" % PAD,
                                fc=fc, ec=ec, lw=lw, zorder=2))
    tx = x + w / 2 if ha == "center" else x + 0.014
    ax.text(tx, y + h / 2, text, ha=ha, va="center", fontsize=fs, color=tc,
            zorder=3, fontweight="bold" if bold else "normal", linespacing=1.35)


fig, ax = plt.subplots(figsize=(13.6, 4.05), dpi=200)
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
fig.patch.set_facecolor("white")

HH, HY = 0.132, 0.862
box(ax, COLS[1][0], HY, COLS[1][1] - COLS[1][0], HH, "바이브 코딩",
    fc=SOFT, ec=BLUE, tc=BLUE, fs=15, bold=True, lw=1.6)
box(ax, COLS[2][0], HY, COLS[2][1] - COLS[2][0], HH, "AI 에이전트",
    fc=NAVY, ec=NAVY, tc="white", fs=15, bold=True, lw=1.6)

RH, GAP = 0.184, 0.018
top = HY - 0.030
for i, (lab, left, right) in enumerate(ROWS):
    y = top - (i + 1) * RH - i * GAP
    box(ax, COLS[0][0], y, COLS[0][1] - COLS[0][0], RH, lab,
        fc="white", ec="white", tc=NAVY, fs=12.5, bold=True, lw=0.1)
    box(ax, COLS[1][0], y, COLS[1][1] - COLS[1][0], RH, left,
        fc="white", ec="#D3DDE8", tc="#333333", ha="left")
    box(ax, COLS[2][0], y, COLS[2][1] - COLS[2][0], RH, right,
        fc=LIGHT, ec="#BBCDE0", tc=NAVY, ha="left")

fig.text(0.010, 0.030, "Sapkota, Roumeliotis and Karkee (2025) arXiv:2505.19443 표 1의 네 항목을 "
         "우리말로 간추렸음. 2026-09-11 원문 확인.",
         fontsize=10, color=GREY)

fig.tight_layout(rect=(0, 0.075, 1, 1))
fig.savefig("deck/fig_agent_vs.png", facecolor="white")
plt.close(fig)
from PIL import Image
print("fig_agent_vs.png", Image.open("deck/fig_agent_vs.png").size)
