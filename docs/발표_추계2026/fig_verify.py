# -*- coding: utf-8 -*-
"""도구가 보여 주는 것과 우리가 따로 본 것 (2026-09-11).

사장님 지시 — *「글보다 도식이나 사진이 좋은데」*. ③ 결과물 검증 장이 이 절에서
유일하게 글만 있는 장이었다.

내용은 모두 이미 발표에 있던 것이다. 새 주장을 그림으로 만들지 않는다.
  왼쪽  Uddin (2026) arXiv:2604.12311 — 생성된 코드는 오류 없이 실행되면서도
        산출값이 틀릴 수 있다. 그러니 「돌아간다」는 값에 대한 근거가 아니다
  오른쪽 원고 4.4·4.6 과 부록 1 — 문헌값 대조, 반복 실행, 처리 조건 민감도,
        화면 문장의 사용자 검토

가운데 빨간 줄이 요지다. 왼쪽에서 오른쪽으로 «자동으로 넘어오지 않는다».

    python deck/fig_verify.py   →  deck/fig_verify.png
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
from matplotlib.patches import FancyBboxPatch

rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

NAVY, BLUE, GREY, RED = "#1F4E79", "#2E75B6", "#8A8A8A", "#C00000"
LIGHT, SOFT = "#EAF1F8", "#FAFBFD"
PAD = 0.004
_drawn = []

LEFT = ("도구가 보여 주는 것", BLUE, SOFT,
        ["코드가 오류 없이 돌아간다", "화면이 뜨고 버튼이 눌린다", "시험이 통과한다"])
RIGHT = ("그래서 따로 본 것", NAVY, LIGHT,
         ["산출값이 문헌값과 맞는가", "같은 자료·같은 설정에서 다시 나오는가 — WASP-6 b 0.14534 재현",
          "처리 조건을 바꾸면 얼마나 흔들리는가", "화면 문장이 학습자의 판단 근거로 맞는가"])


def box(ax, x, y, w, h, text, fc="white", ec="#D3DDE8", tc="#1A1A1A", fs=13.5,
        bold=False, lw=1.3, ha="center", check=True):
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
    tx = x + w / 2 if ha == "center" else x + 0.014
    ax.text(tx, y + h / 2, text, ha=ha, va="center", fontsize=fs, color=tc,
            zorder=3, fontweight="bold" if bold else "normal", linespacing=1.3)


fig, ax = plt.subplots(figsize=(13.6, 2.75), dpi=200)
ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
fig.patch.set_facecolor("white")

HH, HY = 0.165, 0.815
RH, GAP = 0.148, 0.022
PANELS = [(0.004, 0.448, LEFT), (0.552, 0.996, RIGHT)]

for x0, x1, (head, color, fill, items) in PANELS:
    w = x1 - x0
    box(ax, x0, HY, w, HH, head, fc=color, ec=color, tc="white", fs=15, bold=True, lw=1.6)
    for i, t in enumerate(items):
        y = HY - 0.030 - (i + 1) * RH - i * GAP
        box(ax, x0, y, w, RH, "·  " + t, fc=fill, ec="#CFDAE6", tc="#1A1A1A", ha="left")

ax.text(0.500, 0.690, "≠", ha="center", va="center", fontsize=30, color=RED,
        fontweight="bold")
ax.text(0.500, 0.330, "여기로\n자동으로\n넘어오지\n않는다", ha="center", va="center",
        fontsize=11, color=RED, linespacing=1.4)

fig.text(0.010, 0.028, "왼쪽 — Uddin (2026) arXiv:2604.12311 · 오른쪽 — 이 연구가 한 점검. "
         "산출값 대조는 4.4, 민감도는 부록 1, 화면 문장은 사용자 검토.",
         fontsize=9.5, color=GREY)

fig.tight_layout(rect=(0, 0.095, 1, 1))
fig.savefig("deck/fig_verify.png", facecolor="white")
plt.close(fig)
from PIL import Image
print("fig_verify.png", Image.open("deck/fig_verify.png").size)
