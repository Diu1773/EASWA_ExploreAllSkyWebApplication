# -*- coding: utf-8 -*-
"""발표용 도식 넷 (2026-09-11).

사장님 지시 — *「사진이 많아야돼 적절한 도식이랑」*.

  fig_scale     자료는 쏟아진다        — 공식 출처의 실제 수치
  fig_pipeline  그런데 수업까지 안 온다 — 아카이브에서 교실까지 막힌 경로
  fig_vibe      바이브 코딩이란         — 자연어 → 코드 → 실행해 확인
  fig_commits   이 플랫폼의 개발 기록   — 월별 커밋, 저장소에서 직접 센 값

수치는 모두 2026-09-11 에 원문을 열어 확인했다.
  Rubin/LSST  20 TB/밤 · 10년 약 60 PB · 카탈로그 20 PB   lsst.org/about/dm
  Gaia DR3    1,811,709,771 천체 · 2022-06-13 공개        cosmos.esa.int/web/gaia/dr3
  저장소      611 커밋 · 2026-04-02~09-11 · 194 파일 41,416 줄  git log
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

NAVY, BLUE, GREY, RED = "#1F4E79", "#2E75B6", "#8A8A8A", "#C00000"
LIGHT = "#EAF1F8"


PAD = 0.004          # 둥근 상자가 바깥으로 더 커지는 양. 칸 사이 간격보다 작아야 한다.
_DRAWN = {}          # 도면마다 이미 그린 상자들 — 겹치면 그 자리에서 멈춘다


def reset_boxes(tag):
    _DRAWN[tag] = []
    return tag


def box(ax, x, y, w, h, text, fc="white", ec=NAVY, tc="#1A1A1A", fs=12, bold=False,
        lw=1.6, tag=None):
    """둥근 상자 하나.

    둘을 잡는다.
      ① 축(0~1) 밖으로 나가면 matplotlib 이 테두리만 조용히 잘라 낸다.
      ② 간격이 pad 의 두 배보다 좁으면 옆 칸과 먹고 들어가 한 덩어리로 보인다.
    """
    x0, x1 = x - PAD, x + w + PAD
    y0, y1 = y - PAD, y + h + PAD
    assert -1e-9 <= x0 and x1 <= 1 + 1e-9,         "상자가 축 밖으로 나간다: x %.3f~%.3f" % (x0, x1)
    assert -1e-9 <= y0 and y1 <= 1 + 1e-9,         "상자가 축 밖으로 나간다: y %.3f~%.3f" % (y0, y1)
    if tag is not None:
        for (a0, a1, b0, b1, t) in _DRAWN.setdefault(tag, []):
            if x0 < a1 - 1e-9 and a0 < x1 - 1e-9 and y0 < b1 - 1e-9 and b0 < y1 - 1e-9:
                one = " ".join(text.split())
                two = " ".join(t.split())
                raise AssertionError("상자가 겹친다: %r 와 %r" % (one, two))
        _DRAWN[tag].append((x0, x1, y0, y1, text))
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=%g,rounding_size=0.015" % PAD,
                                fc=fc, ec=ec, lw=lw, zorder=2))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs,
            color=tc, zorder=3, fontweight="bold" if bold else "normal", linespacing=1.35)


def arrow(ax, x1, y1, x2, y2, color=NAVY, lw=1.8, style="-|>"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style,
                                 mutation_scale=16, color=color, lw=lw, zorder=2))


def blank(figsize):
    fig, ax = plt.subplots(figsize=figsize, dpi=200)
    ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")
    fig.patch.set_facecolor("white")
    return fig, ax


# ══ ① 자료는 쏟아진다 ═════════════════════════════════════════════════
fig, ax = blank((11.0, 3.6))
T = reset_boxes("scale")
items = [
    ("Rubin Observatory\nLSST", "하룻밤 20 TB", "10년 약 60 PB\n카탈로그 20 PB"),
    ("Gaia DR3", "천체 18억 1,171만", "2022년 공개\n시차·고유운동·측광"),
    ("TESS", "전천을 나눠 반복 관측", "풀프레임 이미지를\n공개 아카이브로 제공"),
    ("KMTNet", "칠레·남아공·호주\n세 관측소", "관측소별 측광 결과\n공개"),
]
w, gap = 0.216, 0.032
for i, (name, big, sub) in enumerate(items):
    x = 0.028 + i * (w + gap)
    box(ax, x, 0.64, w, 0.28, name, fc=NAVY, ec=NAVY, tc="white", fs=13, bold=True, tag=T)
    box(ax, x, 0.345, w, 0.245, big, fc=LIGHT, ec=BLUE, fs=13, bold=True, tc=NAVY, tag=T)
    box(ax, x, 0.05, w, 0.24, sub, fc="white", ec="#CFD8E3", fs=10.5, tc="#444444", lw=1.1, tag=T)
fig.text(0.012, 0.02, "lsst.org/about/dm · cosmos.esa.int/web/gaia/dr3 · 2026-09-11 확인",
         fontsize=9, color=GREY)
fig.tight_layout(rect=(0, 0.10, 1, 1))
fig.savefig("deck/fig_scale.png", facecolor="white")
plt.close(fig)
print("fig_scale")

# ══ ② 그런데 수업까지 오지 않는다 ═════════════════════════════════════
fig, ax = blank((11.0, 3.2))
T = reset_boxes("pipe")
box(ax, 0.024, 0.44, 0.118, 0.32, "공개\n아카이브", fc=NAVY, ec=NAVY, tc="white", fs=13, bold=True, tag=T)
steps = ["검색·질의", "내려받기", "형식 변환", "코딩", "반복 계산"]
sw, sg = 0.109, 0.028
for i, t in enumerate(steps):
    x = 0.170 + i * (sw + sg)
    box(ax, x, 0.44, sw, 0.32, t, fc="white", ec=RED, tc=RED, fs=12, lw=1.5, tag=T)
    if i:
        arrow(ax, x - sg - 0.002, 0.60, x - 0.004, 0.60, color=RED, lw=1.4)
arrow(ax, 0.148, 0.60, 0.166, 0.60, color=RED, lw=1.4)
box(ax, 0.854, 0.44, 0.118, 0.32, "학교\n탐구활동", fc=LIGHT, ec=BLUE, tc=NAVY, fs=13, bold=True, tag=T)
arrow(ax, 0.832, 0.60, 0.850, 0.60, color=RED, lw=1.4)
ax.text(0.50, 0.30, "학습 목표와 무관한 절차 — 학생이 실제 자료에 닿기 전에 모두 지나야 한다",
        ha="center", fontsize=12.5, color=RED, fontweight="bold")
ax.text(0.50, 0.13, "교사 조사: 수업에 적합한 자료 접근 53% · 자료를 수업에 통합 47% "
                    "(Wong et al., 2026)", ha="center", fontsize=11.5, color="#444444")
ax.text(0.50, 0.02, "코딩 기반 교사교육: 현직·예비교사 모두 파이썬 코딩을 학교 적용의 "
                    "가장 큰 어려움으로 꼽음", ha="center", fontsize=11.5, color="#444444")
fig.tight_layout(rect=(0, 0, 1, 1))
fig.savefig("deck/fig_pipeline.png", facecolor="white")
plt.close(fig)
print("fig_pipeline")

# ══ ③ 바이브 코딩이란 ═════════════════════════════════════════════════
fig, ax = blank((13.6, 2.92))
T = reset_boxes("vibe")
cyc = [("자연어로\n의도를 적는다", NAVY), ("코드가\n생성된다", BLUE),
       ("실행해\n확인한다", BLUE), ("고쳐 달라고\n다시 적는다", GREY)]
w2, g2, x0 = 0.206, 0.040, 0.018
mid = []
for i, (t, c) in enumerate(cyc):
    x = x0 + i * (w2 + g2)
    box(ax, x, 0.58, w2, 0.34, t, fc="white", ec=c, tc=c, fs=14, bold=(i == 0), lw=1.8, tag=T)
    mid.append(x + w2 / 2)
    if i < 3:
        arrow(ax, x + w2 + 0.003, 0.75, x + w2 + g2 - 0.005, 0.75, color=c)

# 되풀이 — 상자 아래로 둘러 첫 칸으로 돌아간다. 상자를 가로지르지 않는다.
LY = 0.42
ax.plot([mid[3], mid[3]], [0.575, LY], color=GREY, lw=1.4, zorder=1)
ax.plot([mid[3], mid[0]], [LY, LY], color=GREY, lw=1.4, zorder=1)
arrow(ax, mid[0], LY, mid[0], 0.572, color=GREY, lw=1.4)
ax.text((mid[0] + mid[3]) / 2, LY - 0.075, "고쳐 달라고 다시 적으며 되풀이한다",
        ha="center", fontsize=12.5, color=GREY,
        bbox=dict(fc="white", ec="none", pad=2))
ax.text(0.50, 0.05, "전문 개발자가 아니어도 웹 응용을 구성할 수 있는 범위가 넓어졌다 "
                    "(Michels et al., 2026)", ha="center", fontsize=13, color="#333333")
fig.tight_layout(rect=(0, 0, 1, 1))
fig.savefig("deck/fig_vibe.png", facecolor="white")
plt.close(fig)
print("fig_vibe")

# ══ ④ 이 플랫폼의 개발 기록 ═══════════════════════════════════════════
MONTH = [("4월", 40), ("5월", 1), ("6월", 14), ("7월", 144), ("8월", 67), ("9월", 345)]
fig, ax = plt.subplots(figsize=(11.0, 3.0), dpi=200)
xs = range(len(MONTH))
bars = ax.bar(list(xs), [m[1] for m in MONTH], width=0.58,
              color=[NAVY if m[1] >= 100 else BLUE for m in MONTH], zorder=3)
for b, (lab, v) in zip(bars, MONTH):
    ax.text(b.get_x() + b.get_width() / 2, v + 9, str(v), ha="center",
            fontsize=12, color=NAVY, fontweight="bold")
ax.set_xticks(list(xs))
ax.set_xticklabels([m[0] for m in MONTH], fontsize=12)
ax.set_ylim(0, 400)
ax.set_yticks([])
for s in ("top", "right", "left"):
    ax.spines[s].set_visible(False)
ax.spines["bottom"].set_color("#BFBFBF")
ax.tick_params(axis="y", left=False)
ax.set_title("", pad=0)
fig.text(0.012, 0.015, "연구자 1인. 2026-04-02 ~ 09-11 · 커밋 611회 · 소스 194개 파일 41,416줄. "
         "저장소에서 직접 센 값이며, 개발에 들인 시간과 비용은 기록하지 않았다.",
         fontsize=9.5, color=GREY)
fig.tight_layout(rect=(0, 0.09, 1, 1))
fig.savefig("deck/fig_commits.png", facecolor="white")
plt.close(fig)
print("fig_commits")
