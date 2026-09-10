# -*- coding: utf-8 -*-
"""표 8 — 두 검토의 반응 문항 평균. 역채점 문항 둘을 따로 표시한다."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

ITEMS = [
    ("코딩 환경 없이 분석 과정을 따라감",        4.54, 4.75, False),
    ("자료 출처와 관측 정보 제시",              4.46, 4.75, False),
    ("광도곡선·모델 적합 결과 해석 제시",        4.46, 4.31, False),
    ("분석 조건을 직접 조정하는 기능",           4.38, 4.77, False),
    ("교육용 웹 플랫폼으로 적절",               4.38, 4.46, False),
    ("탐구 주제·질문에서 출발",                4.15, 4.38, False),
    ("STEP별 질문이 이해에 도움",              4.00, 4.46, False),
    ("산출값과 기준값 차이를 스스로 해석",       3.77, 4.31, False),
    ("화면이 복잡해 흐름 파악이 어렵다*",        3.54, 3.92, True),
    ("기준값 비교 화면이 무엇을 해석할지 어렵다*", 3.46, 3.23, True),
]
NAVY, BLUE, RED = "#1F4E79", "#2E75B6", "#C00000"

fig, ax = plt.subplots(figsize=(9.2, 4.7), dpi=200)
y = list(range(len(ITEMS)))[::-1]
for yy, (lab, m1, m2, rev) in zip(y, ITEMS):
    ax.plot([m1, m2], [yy, yy], color="#D6D6D6", lw=2.4, zorder=1)
    ax.scatter(m1, yy, s=95, color=NAVY, zorder=3)
    ax.scatter(m2, yy, s=95, color=BLUE, zorder=3, marker="D")

ax.axvline(3, color="#BFBFBF", lw=1.1, ls="--", zorder=0)
ax.text(3.02, len(ITEMS) - 0.35, "척도 중앙값 3", fontsize=10, color="#8C8C8C")

ax.set_yticks(y)
ax.set_yticklabels([i[0] for i in ITEMS], fontsize=11.5)
for t, (lab, m1, m2, rev) in zip(ax.get_yticklabels(), ITEMS):
    if rev:
        t.set_color(RED)
ax.set_xlim(2.9, 5.05)
ax.set_ylim(-0.7, len(ITEMS) - 0.3)
ax.set_xlabel("5점 척도 평균", fontsize=12.5)
ax.tick_params(labelsize=11)
for s in ("top", "right", "left"):
    ax.spines[s].set_visible(False)
ax.spines["bottom"].set_color("#BFBFBF")
ax.grid(axis="x", color="#EFEFEF", lw=0.8, zorder=0)
ax.set_axisbelow(True)

ax.scatter([], [], s=95, color=NAVY, label="1차 현직 중심 (N=13)")
ax.scatter([], [], s=95, color=BLUE, marker="D", label="2차 예비교사 (N=13)")
ax.legend(loc="lower right", frameon=False, fontsize=11.5, ncol=1)

fig.text(0.012, 0.014, "* 부정 진술을 역채점한 값. 두 조사에서 모두 최하위 두 자리다. "
         "두 조사는 참여 집단과 플랫폼 버전이 함께 달라 차이를 보완의 효과로 읽지 않는다.",
         fontsize=9.5, color="#6E6E6E")
fig.tight_layout(rect=(0, 0.04, 1, 1))
fig.savefig("deck/fig_review.png", facecolor="white")
print("저장 — deck/fig_review.png")
