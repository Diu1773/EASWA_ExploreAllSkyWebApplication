# -*- coding: utf-8 -*-
"""사용자 검토 결과 표를 논문용 그림으로 그린다 (2026-09-10).

표가 열두 개라 읽는 사람이 지친다는 소유자 지적에서 나왔다. **서술 표는 그대로
두고 수치 표만 그림으로 바꾼다** — 표 3·5 처럼 문장이 든 표는 막대 길이로 옮길
것이 없다.

  · 그림 A (표 8)  — 두 조사의 반응 문항 평균. 덤벨(두 점을 선으로 이음)로
                     어느 문항이 어느 쪽으로 움직였는지 보인다.
  · 그림 B (표 10·11) — 위는 도움 수준(쌓은 가로 막대), 아래는 보완 요구(짝 막대).

값은 부록 표로 옮긴다. 그림에서 평균은 읽히지만 표준편차는 읽히지 않는다.

    python -X utf8 docs/make_survey_figs.py
"""
import io
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt          # noqa: E402
from matplotlib import font_manager      # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)))
MM = 1 / 25.4
W = 166 * MM                              # 본문 폭

# 조판 본문이 돋움 계열이므로 그림도 맞춘다. 없으면 있는 것으로 물러난다.
for cand in ("Malgun Gothic", "HCR Dotum", "Gulim", "Batang"):
    if any(f.name == cand for f in font_manager.fontManager.ttflist):
        plt.rcParams["font.family"] = cand
        break
plt.rcParams["axes.unicode_minus"] = False
for k, v in (("text.color", "#E8EAED"), ("axes.labelcolor", "#E8EAED"),
             ("xtick.color", "#C6CDD6"), ("ytick.color", "#C6CDD6"),
             ("axes.edgecolor", "#3A444F"),
             ("figure.facecolor", "#0E1116"), ("axes.facecolor", "#0E1116")):
    plt.rcParams[k] = v

DARK, LIGHT, GRAY = "#e8752a", "#f2a16b", "#6b7480"

# ── 표 8 ────────────────────────────────────────────────────────────
# (문항 번호, 짧은 이름, 1차, 2차, 역채점 여부)
ITEMS = [
    (9,  "코딩 환경 없이 분석 과정을 따라감", 4.54, 4.75, False),
    (10, "자료 출처와 관측 정보 제시",        4.46, 4.75, False),
    (11, "분석 조건을 직접 조정하는 기능",     4.38, 4.77, False),
    (14, "광도곡선·모델 적합 결과 제시",      4.46, 4.31, False),
    (18, "교육용 웹 플랫폼으로 적절",         4.38, 4.46, False),
    (8,  "탐구 주제·질문에서 출발",          4.15, 4.38, False),
    (13, "STEP별 질문이 이해에 도움",        4.00, 4.46, False),
    (16, "산출값과 기준값 차이를 스스로 해석", 3.77, 4.31, False),
    (12, "화면이 복잡해 흐름 파악이 어렵다",   3.54, 3.92, True),
    (15, "기준값 비교 화면이 무엇을 해석할지 어렵다", 3.46, 3.23, True),
]


def fig_a():
    fig, ax = plt.subplots(figsize=(W, 78 * MM))
    ys = range(len(ITEMS))
    for y, (_, name, a, b, rev) in zip(ys, ITEMS):
        ax.plot([a, b], [y, y], color=GRAY, lw=1.6, zorder=1)
        ax.scatter([a], [y], s=42, color=DARK, zorder=2)
        ax.scatter([b], [y], s=52, color=LIGHT, marker="D", zorder=2)
    ax.set_yticks(list(ys))
    ax.set_yticklabels(["%s%s" % (n, "*" if r else "") for _, n, _, _, r in ITEMS],
                       fontsize=8)
    ax.invert_yaxis()
    ax.axvline(3, color="#cccccc", lw=0.8, ls="--")
    ax.text(3.02, -0.7, "척도 중앙값 3", fontsize=7, color="#888888", va="bottom")
    ax.set_xlim(3.0, 5.0)
    ax.set_xlabel("5점 척도 평균", fontsize=8.5)
    ax.tick_params(axis="x", labelsize=8)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.scatter([], [], s=42, color=DARK, label="1차 현직 중심 (N=13)")
    ax.scatter([], [], s=52, color=LIGHT, marker="D", label="2차 예비교사 (N=13)")
    ax.legend(loc="lower right", fontsize=8, frameon=False)
    fig.tight_layout(pad=0.4)
    p = os.path.join(OUT, "fig_survey_likert_dark.png")
    fig.savefig(p, dpi=400)
    plt.close(fig)
    print("  %s" % os.path.basename(p))


# ── 표 10 · 표 11 ──────────────────────────────────────────────────
HELP = [                                   # (항목, 화면만, 도움받아, 도움받아도 어려움)
    ("안내 문장의 뜻 이해", 11, 2, 0),
    ("각 단계의 할 일과 생각해보기 찾기", 9, 4, 0),
    ("용어·기호·단위의 뜻 이해", 7, 5, 1),
    ("그래프의 축·점·빈 구간 읽기", 7, 5, 1),
]
NEED = [                                   # (항목, 1차, 2차)
    ("수업용 활동지와 교사용 안내 자료", 6, 10),
    ("그래프·분석 결과 해석 도움말", 8, 6),
    ("기준값 비교·차이 원인 설명·결과 기록 강화", 7, 6),
    ("추가 탐구 주제", 2, 6),
    ("STEP별 질문과 생각해보기 보완", 4, 4),
    ("자료 출처와 분석 조건 명확화", 2, 1),
    ("분석 과정·품질 점검 정보 상세화", 3, 1),
]


def fig_b():
    fig, (ax1, ax2) = plt.subplots(
        2, 1, figsize=(W, 104 * MM), gridspec_kw={"height_ratios": [4, 7]})

    ys = range(len(HELP))
    left = [0] * len(HELP)
    for vals, col, lab in ((  [h[1] for h in HELP], DARK,  "화면만 보고"),
                           (  [h[2] for h in HELP], LIGHT, "사람의 도움을 받아"),
                           (  [h[3] for h in HELP], GRAY,  "도움을 받아도 어려움")):
        ax1.barh(list(ys), vals, left=left, color=col, height=0.55, label=lab)
        for y, v, l in zip(ys, vals, left):
            if v:
                ax1.text(l + v / 2, y, str(v), ha="center", va="center",
                         fontsize=7.5, color="white" if col != GRAY else "#333333")
        left = [a + b for a, b in zip(left, vals)]
    ax1.set_yticks(list(ys))
    ax1.set_yticklabels([h[0] for h in HELP], fontsize=8)
    ax1.invert_yaxis()
    ax1.set_xlim(0, 13)
    # 합이 늘 13이라 눈금이 필요 없다. 축을 지우고 범례를 그 자리에 둔다 —
    # 아래에 두면 x축 라벨과 겹쳤다(2026-09-10).
    ax1.set_xticks([])
    for s in ("top", "right", "left", "bottom"):
        ax1.spines[s].set_visible(False)
    ax1.legend(loc="upper center", fontsize=7.5, frameon=False, ncol=3,
               bbox_to_anchor=(0.5, -0.08))
    ax1.set_title("(a) 이해·수행에 필요했던 도움 (2차 예비교사 N=13)",
                  fontsize=9, loc="left", pad=6)

    ys2 = range(len(NEED))
    h = 0.36
    ax2.barh([y - h / 2 for y in ys2], [n[1] for n in NEED], height=h,
             color=DARK, label="1차 현직 중심 (N=13)")
    ax2.barh([y + h / 2 for y in ys2], [n[2] for n in NEED], height=h,
             color=LIGHT, label="2차 예비교사 (N=13)")
    for y, n in zip(ys2, NEED):
        ax2.text(n[1] + 0.15, y - h / 2, str(n[1]), va="center", fontsize=7.5, color=DARK)
        ax2.text(n[2] + 0.15, y + h / 2, str(n[2]), va="center", fontsize=7.5, color=LIGHT)
    ax2.set_yticks(list(ys2))
    ax2.set_yticklabels([n[0] for n in NEED], fontsize=8)
    ax2.invert_yaxis()
    ax2.set_xlim(0, 11.5)
    ax2.set_xlabel("선택한 응답자 수 (복수선택)", fontsize=8.5)
    ax2.tick_params(axis="x", labelsize=8)
    for s in ("top", "right", "left"):
        ax2.spines[s].set_visible(False)
    ax2.legend(loc="lower right", fontsize=7.5, frameon=False)
    ax2.set_title("(b) 보완 요구", fontsize=9, loc="left", pad=6)

    fig.tight_layout(pad=0.5, h_pad=2.2)
    p = os.path.join(OUT, "fig_survey_needs_dark.png")
    fig.savefig(p, dpi=400)
    plt.close(fig)
    print("  %s" % os.path.basename(p))


if __name__ == "__main__":
    print("사용자 검토 그림")
    fig_a()
    fig_b()
