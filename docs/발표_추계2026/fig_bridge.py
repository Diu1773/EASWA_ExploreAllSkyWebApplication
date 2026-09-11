# -*- coding: utf-8 -*-
"""EASWA 가 가야 할 방향 — 막힌 절차를 지우고 탐구활동으로 잇는다 (2026-09-11).

사장님 지시 —
  *「연구배경2 도식에서 중간 절차들에 X도식 넣고 우리 탐구활동들이 이어지도록
    만드는 도식을 넣자」*
  *「색감도 더 다양하게 쓰래, 강조 박스, 큰 화살표」*

3장(연구 배경 ②)의 `fig_pipeline` 과 «같은 다섯 칸»을 쓴다. 거기서는 빨간 테두리로
「모두 지나야 한다」였고, 여기서는 그 다섯에 X 를 긋고 아래로 EASWA 띠를 깔아
아카이브에서 탐구활동까지 곧장 잇는다. **두 장이 같은 그림이어야 말이 붙는다.**

색은 넷으로 나눈다 — 슬라이드가 온통 청색이라 여기서 색을 들여놓는다.
  남색  공개 아카이브 (출발)
  회색+X  학습 목표와 무관한 절차 (막힌 곳)
  주황  EASWA — 앱 화면에서 직접 뽑은 #E8722A 다
  초록  학교 탐구활동 (도착)

    python deck/fig_bridge.py   →  deck/fig_bridge.png
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

NAVY, BLUE, GREY, RED = "#1F4E79", "#2E75B6", "#8A8A8A", "#C00000"
ORANGE = "#E8722A"          # EASWA 앱 화면에서 뽑은 값 (2026-09-11 실측)
GREEN = "#2F7D4F"
LIGHT, DIM = "#EAF1F8", "#F2F2F2"
PAD = 0.004
_drawn = []

STEPS = ["검색·질의", "내려받기", "형식 변환", "코딩", "반복 계산"]
MODULES = ["TESS 외계행성 식현상", "KMTNet 미시중력렌즈", "Gaia 성단 색등급도"]

X0, X1 = 0.158, 0.846       # 가운데 구역 — 위 다섯 칸·EASWA 띠·아래 세 칸이 공유한다


def box(ax, x, y, w, h, text, fc="white", ec=NAVY, tc="#1A1A1A", fs=12.5,
        bold=False, lw=1.6, check=True):
    x0, x1, y0, y1 = x - PAD, x + w + PAD, y - PAD, y + h + PAD
    assert -1e-9 <= x0 and x1 <= 1 + 1e-9, "축 밖: x %.3f~%.3f" % (x0, x1)
    assert -1e-9 <= y0 and y1 <= 1 + 1e-9, "축 밖: y %.3f~%.3f" % (y0, y1)
    if check:
        for (a0, a1, b0, b1, t) in _drawn:
            if x0 < a1 - 1e-9 and a0 < x1 - 1e-9 and y0 < b1 - 1e-9 and b0 < y1 - 1e-9:
                raise AssertionError("칸이 겹친다: %r 와 %r"
                                     % (" ".join(text.split()), " ".join(t.split())))
        _drawn.append((x0, x1, y0, y1, text))
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle="round,pad=%g,rounding_size=0.010" % PAD,
                                fc=fc, ec=ec, lw=lw, zorder=2))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs,
            color=tc, zorder=6, fontweight="bold" if bold else "normal",
            linespacing=1.3)


def arrow(ax, x1, y1, x2, y2, color=NAVY, lw=2.4, ms=22):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>",
                                 mutation_scale=ms, color=color, lw=lw, zorder=4))


fig, ax = plt.subplots(figsize=(13.6, 3.62), dpi=200)
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
fig.patch.set_facecolor("white")

# ── 출발과 도착 — 두 줄에 걸쳐 세운다 ─────────────────────────────────
SY, SH = 0.500, 0.255
box(ax, 0.008, SY, 0.132, SH, "공개\n아카이브", fc=NAVY, ec=NAVY, tc="white",
    fs=14, bold=True)
box(ax, 0.862, SY, 0.132, SH, "학교\n탐구활동", fc=GREEN, ec=GREEN, tc="white",
    fs=14, bold=True)

# ── 위: 학습 목표와 무관한 절차 다섯. X 를 긋는다 ─────────────────────
TY, TH = 0.800, 0.180
sw = (X1 - X0 - 0.0245 * 4) / 5
for i, t in enumerate(STEPS):
    x = X0 + i * (sw + 0.0245)
    box(ax, x, TY, sw, TH, t, fc=DIM, ec="#C9C9C9", tc="#4A4A4A", fs=12, lw=1.3)
    m = 0.022
    for (xa, xb) in ((x + m, x + sw - m), (x + sw - m, x + m)):
        ax.plot([xa, xb], [TY + 0.028, TY + TH - 0.028], color=RED, lw=2.6,
                alpha=0.9, zorder=5, solid_capstyle="round")
# 칸 이름은 X 위(zorder 6)에 그린다 — 무엇이 지워졌는지 읽혀야 한다
ax.text(0.074, TY + TH / 2, "학습 목표와\n무관한 절차", ha="center", va="center",
        fontsize=11.5, color=RED, fontweight="bold", linespacing=1.3)

# ── 가운데: EASWA 띠. 큰 화살표로 출발과 도착을 잇는다 ────────────────
BY, BH = 0.520, 0.215
box(ax, X0, BY, X1 - X0, BH, "EASWA — 검색·내려받기·형식 변환·반복 계산을 플랫폼이 맡음",
    fc=ORANGE, ec=ORANGE, tc="white", fs=15, bold=True)
arrow(ax, 0.144, BY + BH / 2, X0 - 0.008, BY + BH / 2, color=ORANGE, lw=3.0, ms=26)
arrow(ax, X1 + 0.008, BY + BH / 2, 0.858, BY + BH / 2, color=ORANGE, lw=3.0, ms=26)

# ── 아래: 세 탐구활동이 같은 흐름을 지난다 ───────────────────────────
MY, MH = 0.055, 0.195
mw = (X1 - X0 - 0.020 * 2) / 3
for i, t in enumerate(MODULES):
    x = X0 + i * (mw + 0.020)
    box(ax, x, MY, mw, MH, t, fc=LIGHT, ec=BLUE, tc=NAVY, fs=12.5, bold=True, lw=1.5)
    arrow(ax, x + mw / 2, BY - 0.008, x + mw / 2, MY + MH + 0.010, color=BLUE,
          lw=1.8, ms=16)
ax.text((X0 + X1) / 2, (BY + MY + MH) / 2, "세 주제 모두 «같은» 일곱 단계를 지남",
        ha="center", va="center", fontsize=12, color=BLUE,
        bbox=dict(fc="white", ec="none", pad=2.5), zorder=6)

fig.tight_layout(rect=(0, 0, 1, 1))
fig.savefig("deck/fig_bridge.png", facecolor="white")
plt.close(fig)
from PIL import Image
print("fig_bridge.png", Image.open("deck/fig_bridge.png").size)
