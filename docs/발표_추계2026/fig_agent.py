# -*- coding: utf-8 -*-
"""AI 에이전트가 도는 모양 (2026-09-11).

사장님 지시 — *「ai에이전트 도식이나 그림넣으면 좋을듯」*,
그리고 *「목표 부여 → 레포지토리 분석 → 다단계 자율 실행 및 검증」*.

**남의 그림을 옮기지 않는다.** 인용한 문헌이 서술한 내용을 근거로 직접 그린다.
  Sapkota, Roumeliotis and Karkee (2025) arXiv:2505.19443 — 에이전트는 목표를 받아
    계획·실행·시험·반복을 스스로 하고, 사람은 목표와 제약을 정하고 진행을 지켜본다
  Khosravani and Mockus (2026) arXiv:2606.24429 — 저장소를 훑어 커밋을 남기는 에이전트
  Koch (2026) arXiv:2605.20456 — 자율 생성은 요구사항·제약·추적성·독립 검증과 함께여야

바이브 코딩과 갈리는 곳은 가운데 세 칸이다. 사람이 매번 확인하는 대신
«에이전트가 스스로» 읽고 계획하고 시험하기를 되풀이한다.

가로로 길게 그린다. 슬라이드 폭(12.09인치)에 꽉 차야 글씨가 뒷자리에서도 읽힌다.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

NAVY, BLUE, GREY, RED = "#1F4E79", "#2E75B6", "#8A8A8A", "#C00000"
LIGHT, LOOP = "#EAF1F8", "#F3F7FB"
PAD = 0.004
_drawn = []


def box(ax, x, y, w, h, text, fc="white", ec=NAVY, tc="#1A1A1A", fs=13.5,
        bold=False, lw=1.6, check=True):
    x0, x1, y0, y1 = x - PAD, x + w + PAD, y - PAD, y + h + PAD
    assert -1e-9 <= x0 and x1 <= 1 + 1e-9, "축 밖: x %.3f~%.3f" % (x0, x1)
    assert -1e-9 <= y0 and y1 <= 1 + 1e-9, "축 밖: y %.3f~%.3f" % (y0, y1)
    if check:
        for (a0, a1, b0, b1, t) in _drawn:
            if x0 < a1 - 1e-9 and a0 < x1 - 1e-9 and y0 < b1 - 1e-9 and b0 < y1 - 1e-9:
                raise AssertionError("겹친다: %r 와 %r"
                                     % (" ".join(text.split()), " ".join(t.split())))
        _drawn.append((x0, x1, y0, y1, text))
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle="round,pad=%g,rounding_size=0.010" % PAD,
                                fc=fc, ec=ec, lw=lw, zorder=2))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs,
            color=tc, zorder=3, fontweight="bold" if bold else "normal",
            linespacing=1.35)


def arrow(ax, x1, y1, x2, y2, color=NAVY, lw=1.6):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>",
                                 mutation_scale=15, color=color, lw=lw, zorder=3))


fig, ax = plt.subplots(figsize=(13.6, 2.62), dpi=200)
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
fig.patch.set_facecolor("white")

# 되풀이가 도는 곳을 옅은 바탕으로 묶는다 (겹침 검사에서 뺀다)
box(ax, 0.215, 0.24, 0.545, 0.68, "", fc=LOOP, ec="#D5E2EE", lw=1.2, check=False)
ax.text(0.4875, 0.875, "이 세 가지를 에이전트가 «스스로» 되풀이한다", ha="center",
        fontsize=12, color=BLUE, zorder=4)

BY, BH = 0.46, 0.28
box(ax, 0.018, BY, 0.175, BH, "사람이\n목표를 맡긴다", fc=NAVY, ec=NAVY,
    tc="white", fs=14, bold=True)

loop = ["저장소·문서를\n읽는다", "무엇을 할지\n계획한다", "고치고 돌려서\n시험한다"]
lw_, lg = 0.163, 0.026
for i, t in enumerate(loop):
    x = 0.234 + i * (lw_ + lg)
    box(ax, x, BY, lw_, BH, t, fc="white", ec=BLUE, tc=BLUE, fs=13.5)
    if i:
        arrow(ax, x - lg + 0.002, BY + BH / 2, x - 0.006, BY + BH / 2, color=BLUE)
arrow(ax, 0.197, BY + BH / 2, 0.230, BY + BH / 2)

# 시험한 결과를 보고 다시 읽기로 — 아래로 둘러 간다
LY = 0.335
x_last = 0.234 + 2 * (lw_ + lg)
ax.plot([x_last + lw_ / 2, x_last + lw_ / 2], [BY - PAD, LY], color=BLUE, lw=1.4, zorder=4)
ax.plot([x_last + lw_ / 2, 0.234 + lw_ / 2], [LY, LY], color=BLUE, lw=1.4, zorder=4)
arrow(ax, 0.234 + lw_ / 2, LY, 0.234 + lw_ / 2, BY - PAD - 0.002, color=BLUE)
ax.text(0.4875, LY - 0.105, "시험한 결과를 보고 다시", ha="center", fontsize=11.5, color=BLUE)

box(ax, 0.786, BY, 0.196, BH, "사람이 받는 것 —\n«도는» 코드", fc=LIGHT, ec=RED,
    tc=RED, fs=14, bold=True)
arrow(ax, x_last + lw_ + 0.006, BY + BH / 2, 0.782, BY + BH / 2, color=RED)

ax.text(0.884, 0.255, "값이 맞는지는\n여기서 안 나온다", ha="center", fontsize=12,
        color=RED, fontweight="bold", linespacing=1.3)
fig.text(0.010, 0.030, "인용한 문헌의 서술을 근거로 직접 그렸음 — "
         "Sapkota et al. (2025) · Khosravani and Mockus (2026) · Koch (2026)",
         fontsize=10, color=GREY)

fig.tight_layout(rect=(0, 0.10, 1, 1))
fig.savefig("deck/fig_agent.png", facecolor="white")
plt.close(fig)
from PIL import Image
print("fig_agent.png", Image.open("deck/fig_agent.png").size)
