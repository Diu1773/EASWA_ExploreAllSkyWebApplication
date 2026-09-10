# -*- coding: utf-8 -*-
"""표 7 을 그림으로. 다섯 조건을 «각각» 문헌값과 견준다.

원고가 못박은 것 — 「표의 순서대로 차이가 누적되지 않고, 한 요인의 효과로도 읽을 수
없다」. 그래서 계단 그림으로 그리지 않는다. 다섯 점은 서로 다른 처리 «조합»이다.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager, rcParams

rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

COND = ["A", "B", "C", "D", "E"]
DESC = ["기본 구경측광", "A + 오염 보정", "표준 SAP", "표준 PDCSAP", "D + 주연감광 적합"]
VAL  = [0.10892, 0.11410, 0.11372, 0.11881, 0.12141]
ERR  = [0.00032, 0.00030, 0.00035, 0.00018, 0.00051]
PCT  = [-12.8, -8.6, -8.9, -4.9, -2.8]
LIT, LITE = 0.12488, 0.00072

NAVY, BLUE, GREY = "#1F4E79", "#2E75B6", "#8C8C8C"

fig, ax = plt.subplots(figsize=(8.8, 4.35), dpi=200)
x = range(5)

ax.axhspan(LIT - LITE, LIT + LITE, color=GREY, alpha=0.25, zorder=1)
ax.axhline(LIT, color=GREY, lw=1.4, zorder=2)
ax.text(4.42, LIT + 0.0011, "문헌값  Daylan et al. (2021)", color="#5A5A5A",
        fontsize=11.5, ha="right", va="bottom")

for i, (v, e, p) in enumerate(zip(VAL, ERR, PCT)):
    c = NAVY if i == 4 else BLUE
    ax.errorbar(i, v, yerr=e, fmt="o", ms=11, color=c, ecolor=c,
                elinewidth=2.0, capsize=6, zorder=4)
    ax.annotate("%+.1f%%" % p, (i, v), textcoords="offset points",
                xytext=(0, -25), ha="center", fontsize=12.5,
                color=c, fontweight="bold" if i in (0, 4) else "normal")

ax.set_xticks(list(x))
ax.set_xticklabels(["%s\n%s" % (c, d) for c, d in zip(COND, DESC)], fontsize=11)
ax.set_ylabel("반지름비  $R_p/R_*$", fontsize=13)
ax.set_ylim(0.1035, 0.1275)
ax.set_xlim(-0.45, 4.5)
ax.tick_params(labelsize=11)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
ax.spines["left"].set_color("#BFBFBF")
ax.spines["bottom"].set_color("#BFBFBF")
ax.grid(axis="y", color="#E8E8E8", lw=0.8, zorder=0)
ax.set_axisbelow(True)

fig.text(0.012, 0.015, "WASP-121 b · TESS 섹터 7 · 2분 케이던스. 조건은 서로 다른 "
         "처리를 여러 개 함께 포함하므로 한 요인의 효과로 읽을 수 없다.",
         fontsize=9.5, color="#6E6E6E")
fig.tight_layout(rect=(0, 0.035, 1, 1))
fig.savefig("deck/fig_table7.png", facecolor="white")
print("저장 — deck/fig_table7.png")
