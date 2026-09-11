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

OUT = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\원고_그림"
MM = 1 / 25.4
W = 166 * MM                              # 본문 폭

# 조판 본문이 돋움 계열이므로 그림도 맞춘다. 없으면 있는 것으로 물러난다.
for cand in ("Malgun Gothic", "HCR Dotum", "Gulim", "Batang"):
    if any(f.name == cand for f in font_manager.fontManager.ttflist):
        plt.rcParams["font.family"] = cand
        break
plt.rcParams["axes.unicode_minus"] = False

DARK, LIGHT, GRAY = "#1f4e79", "#4a90d9", "#b8b8b8"

# ── 표 8 ────────────────────────────────────────────────────────────
# 라벨을 짧게 줄였더니 문항 원문을 실을 부록 표가 하나 생겼다. 부록이 느는 만큼
# 줄인 뜻이 없어진다(2026-09-11 소유자 지적) — 원문을 그대로 쓰고 표준편차는
# 오차막대와 괄호로 넣어 부록 표를 없앤다.
# (문항 번호, 진술 원문, 1차 평균, 1차 SD, 2차 평균, 2차 SD, 역채점 여부)
ITEMS = [
    (9,  "별도의 코딩 환경 없이 공공 천문자료 분석 과정을 따라갈 수 있도록 돕는다",
     4.54, 0.52, 4.75, 0.62, False),
    (10, "분석에 사용한 자료의 출처와 관측 정보를 확인할 수 있도록 제시한다",
     4.46, 0.78, 4.75, 0.45, False),
    (11, "학습자가 분석 조건(측정·분석 설정)을 직접 조정해 볼 수 있는 기능을 제공한다",
     4.38, 0.65, 4.77, 0.44, False),
    (14, "광도곡선과 식현상 모델 적합 결과를 해석할 수 있도록 제시한다",
     4.46, 0.66, 4.31, 0.75, False),
    (18, "공공 천문자료 기반 천문탐구를 지원하는 교육용 웹 플랫폼으로 적절하다",
     4.38, 0.51, 4.46, 0.66, False),
    (8,  "천체명이나 자료 검색보다 탐구 주제와 탐구 질문에서 출발하도록 구성되어 있다",
     4.15, 0.69, 4.38, 0.87, False),
    (13, "STEP별 질문과 생각해보기 문항은 각 단계에서 무엇을 확인해야 하는지 "
         "이해하는 데 도움이 된다", 4.00, 0.71, 4.46, 0.66, False),
    (16, "산출값과 NASA Exoplanet Archive 기준값의 차이를 학습자가 스스로 "
         "해석하도록 돕는다", 3.77, 0.83, 4.31, 0.75, False),
    (12, "화면 구성은 복잡하여 각 단계의 탐구 흐름을 파악하기 어렵다",
     3.54, 1.20, 3.92, 1.19, True),
    (15, "기준값 비교 화면은 무엇을 해석해야 하는지 파악하기 어렵다",
     3.46, 1.13, 3.23, 1.01, True),
]


def fig_a():
    """짝 막대. 1 부터 5 까지 다 보인다 — 3 부터 자르면 차이가 과장된다.

    높이는 76mm 다. 116mm 였을 때 앞 쪽 아래가 105mm 비었고, 86mm 로는 3mm 가
    모자라 그대로 다음 쪽으로 넘어갔다(2026-09-11). 그림과 캡션이
    한 덩어리로 움직여 통째로 다음 쪽으로 갔기 때문이다(2026-09-11). 진술 원문은
    그대로 두고 접는 폭을 26자에서 34자로 넓혀 줄 수를 줄였다.
    """
    import textwrap
    fig, ax = plt.subplots(figsize=(W, 76 * MM))
    ys = range(len(ITEMS))
    h = 0.36
    # 오차막대는 오른쪽만 그린다 — 양쪽으로 그리면 왼쪽 캡이 막대 안 숫자를 뚫는다.
    ax.barh([y - h / 2 for y in ys], [it[2] for it in ITEMS], height=h,
            color=DARK, label="1차 현직 중심 (N=13)",
            xerr=[[0] * len(ITEMS), [it[3] for it in ITEMS]],
            error_kw=dict(ecolor="#666666", elinewidth=0.7, capsize=2, capthick=0.7))
    ax.barh([y + h / 2 for y in ys], [it[4] for it in ITEMS], height=h,
            color=LIGHT, label="2차 예비교사 (N=13)",
            xerr=[[0] * len(ITEMS), [it[5] for it in ITEMS]],
            error_kw=dict(ecolor="#666666", elinewidth=0.7, capsize=2, capthick=0.7))
    for y, it in zip(ys, ITEMS):
        ax.text(it[2] - 0.08, y - h / 2, "%.2f (%.2f)" % (it[2], it[3]),
                va="center", ha="right", fontsize=6.8, color="white")
        ax.text(it[4] - 0.08, y + h / 2, "%.2f (%.2f)" % (it[4], it[5]),
                va="center", ha="right", fontsize=6.8, color="white")
    ax.set_yticks(list(ys))
    ax.set_yticklabels(
        [textwrap.fill("%d. %s%s" % (n, t, " *" if r else ""), 34)
         for n, t, _, _, _, _, r in ITEMS], fontsize=7.2, linespacing=1.15)
    ax.invert_yaxis()
    ax.axvline(3, color="#999999", lw=0.9, ls="--", zorder=0)
    # 「척도 중앙값 3」 글자는 넣지 않는다 — 위에 두면 범례와, 안에 두면 막대와
    # 겹쳤다(2026-09-10). 축에 3 눈금이 있고 점선이 그 자리를 가리키므로
    # 캡션에서 한 번 밝히면 된다.
    ax.set_xlim(0, 6.2)
    ax.set_xticks([0, 1, 2, 3, 4, 5])
    ax.set_xlabel("5점 척도 평균 (괄호와 오차막대는 표준편차)", fontsize=8.5)
    ax.tick_params(axis="x", labelsize=8)
    ax.tick_params(axis="y", length=0, pad=2)
    for sp in ("top", "right", "left"):
        ax.spines[sp].set_visible(False)
    ax.legend(loc="upper center", fontsize=8, frameon=False, ncol=2,
              bbox_to_anchor=(0.5, 1.06))
    fig.tight_layout(pad=0.4)
    p = os.path.join(OUT, "fig_survey_likert.png")
    fig.savefig(p, dpi=400)
    plt.close(fig)
    print("  %s" % os.path.basename(p))


# ── 표 10 · 표 11 ──────────────────────────────────────────────────
# 응답 항목은 설문 원문 그대로다 — 줄이면 원문을 실을 부록 표가 도로 필요해진다.
HELP = [                                   # (항목, 화면만, 도움받아, 도움받아도 어려움)
    ("안내 문장의 뜻 이해", 11, 2, 0),
    ("각 단계의 할 일과 생각해보기 문항 찾기", 9, 4, 0),
    ("용어·기호·단위의 뜻 이해", 7, 5, 1),
    ("그래프의 축·점·빈 구간 읽기", 7, 5, 1),
]
NEED = [                                   # (항목, 1차, 2차)
    ("수업 적용을 위한 활동지와 교사용 안내 자료를 제공하는 것", 6, 10),
    ("그래프와 분석 결과를 해석할 수 있는 도움말을 제공하는 것", 8, 6),
    ("기준값 비교, 차이 원인 설명, 결과 기록 활동을 강화하는 것", 7, 6),
    ("추가 탐구 주제를 제공하는 것", 2, 6),
    ("STEP별 질문과 생각해보기를 보완하는 것", 4, 4),
    ("자료 출처와 분석 조건을 더 명확히 제시하는 것", 2, 1),
    ("분석 과정과 품질 점검 정보를 더 자세히 제공하는 것", 3, 1),
]


def fig_b():
    """위아래 두 칸. 높이는 88mm 다 — 134mm(놓일 때 123mm) 였을 때 앞 쪽(21쪽)
    아래가 113mm 비었다(2026-09-11). 글자 크기는 그대로 두고 항목 이름 접는 폭을
    22자에서 34자로 넓혀 두 줄짜리를 한 줄로 만들었다.
    """
    import textwrap
    fig, (ax1, ax2) = plt.subplots(
        2, 1, figsize=(W, 88 * MM), gridspec_kw={"height_ratios": [4, 7]})

    ys = [k * 1.25 for k in range(len(HELP))]
    left = [0] * len(HELP)
    for vals, col, lab in ((  [h[1] for h in HELP], DARK,  "화면만 보고 할 수 있었다"),
                           (  [h[2] for h in HELP], LIGHT, "사람의 도움을 받아 할 수 있었다"),
                           (  [h[3] for h in HELP], GRAY,  "도움을 받아도 어려웠다")):
        ax1.barh(ys, vals, left=left, color=col, height=0.62, label=lab)
        for y, v, l in zip(ys, vals, left):
            if v:
                ax1.text(l + v / 2, y, str(v), ha="center", va="center",
                         fontsize=7.5, color="white" if col != GRAY else "#333333")
        left = [a + b for a, b in zip(left, vals)]
    ax1.set_yticks(ys)
    ax1.set_yticklabels([textwrap.fill(h[0], 34) for h in HELP],
                        fontsize=7.4, linespacing=1.15)
    ax1.tick_params(axis="y", length=0, pad=2)
    ax1.invert_yaxis()
    ax1.set_xlim(0, 13)
    # 합이 늘 13이라 눈금이 필요 없다. 축을 지우고 범례를 그 자리에 둔다 —
    # 아래에 두면 x축 라벨과 겹쳤다(2026-09-10).
    ax1.set_xticks([])
    for s in ("top", "right", "left", "bottom"):
        ax1.spines[s].set_visible(False)
    ax1.set_title("(a) 이해·수행에 필요했던 도움 (2차 예비교사 N=13)",
                  fontsize=9, loc="left", pad=6)

    ys2 = [k * 1.3 for k in range(len(NEED))]
    h = 0.42
    ax2.barh([y - h / 2 for y in ys2], [n[1] for n in NEED], height=h,
             color=DARK, label="1차 현직 중심 (N=13)")
    ax2.barh([y + h / 2 for y in ys2], [n[2] for n in NEED], height=h,
             color=LIGHT, label="2차 예비교사 (N=13)")
    for y, n in zip(ys2, NEED):
        ax2.text(n[1] + 0.15, y - h / 2, str(n[1]), va="center", fontsize=7.5, color=DARK)
        ax2.text(n[2] + 0.15, y + h / 2, str(n[2]), va="center", fontsize=7.5, color=LIGHT)
    ax2.set_yticks(ys2)
    ax2.set_yticklabels([textwrap.fill(n[0], 34) for n in NEED],
                        fontsize=7.4, linespacing=1.15)
    ax2.tick_params(axis="y", length=0, pad=2)
    ax2.invert_yaxis()
    ax2.set_xlim(0, 11.5)
    ax2.set_xlabel("선택한 응답자 수 (복수선택)", fontsize=8.5)
    ax2.tick_params(axis="x", labelsize=8)
    for s in ("top", "right", "left"):
        ax2.spines[s].set_visible(False)
    ax2.legend(loc="lower right", fontsize=7.5, frameon=False)
    ax2.set_title("(b) 보완 요구", fontsize=9, loc="left", pad=6)

    fig.tight_layout(pad=0.5, h_pad=3.4)
    # (a) 의 범례는 자리를 잡은 **뒤에** 종이 폭 한가운데로 놓는다. 막대 영역에
    # 맞추면 항목 이름이 넓어진 만큼 오른쪽으로 밀려 「도움을 받아도 어려웠다」가
    # 종이 밖으로 잘렸다(2026-09-11).
    y0 = ax1.get_position().y0
    ax1.legend(loc="upper center", fontsize=6.9, frameon=False, ncol=3,
               bbox_to_anchor=(0.5, y0 - 0.005), bbox_transform=fig.transFigure,
               columnspacing=1.1, handletextpad=0.5, handlelength=1.4)
    p = os.path.join(OUT, "fig_survey_needs.png")
    fig.savefig(p, dpi=400)
    plt.close(fig)
    print("  %s" % os.path.basename(p))




# ── 표 9 ────────────────────────────────────────────────────────────
# 스무 범주를 한 단으로 세우면 표와 높이가 같아 줄인 뜻이 없다. 상위 틀을
# 좌우 두 단으로 나눠 세로를 절반으로 접는다(2026-09-11).
CATS = [
    ("용어·개념 이해", [("용어·기호·단위의 뜻", 3, 7),
                        ("사전 개념·통계 지식·전공 배경", 8, 4),
                        ("용어 해설의 학습 활동화", 0, 2)]),
    ("그래프·결과 해석", [("자료·그래프 요소의 의미", 1, 4),
                          ("학습자의 근거 설명과 주도 수행", 2, 2),
                          ("예시 답안 제공", 0, 1)]),
    ("단계 안내", [("생각해보기 문항의 발견과 이용", 1, 3),
                   ("안내 문장의 자연스러움", 1, 1),
                   ("단계 이탈 위험", 0, 1)]),
    ("수업 운영", [("교육과정·수업 시간·학생 수준", 6, 4),
                   ("교사의 설명 준비", 1, 3),
                   ("난이도 단계화", 1, 2),
                   ("입문 모드", 0, 1)]),
    ("UI·기능", [("화면 구성 단순화", 1, 2),
                 ("동시 사용과 진행 지연", 1, 1),
                 ("화면 가독성", 0, 1),
                 ("실행 환경", 0, 1)]),
    ("자료 선택", [("자료 선택의 여지", 1, 0)]),
    ("긍정 평가", [("긍정 평가", 6, 11)]),
    ("기타", [("학습자의 흥미·동기", 0, 1)]),
]


def fig_c():
    """한 단으로 편다. 두 단으로 나누면 짧은 쪽 아래가 휑하게 비고, 행 간격을
    맞추면 x 축이 어긋난다 — 둘 다 만족하는 배치가 없었다(2026-09-11)."""
    import textwrap
    rows, ticks, bars, rules = [], [], [], []
    y = 0.0
    for name, items in CATS:
        ticks.append((y, name, True))
        rules.append(y + 0.55)
        y += 1.0
        for lab, a, b in items:
            ticks.append((y, textwrap.fill(lab, 24), False))
            bars.append((y, a, b))
            y += 1.1
        y += 0.3

    fig, ax = plt.subplots(figsize=(W, 132 * MM))
    h = 0.40
    ax.barh([t - h / 2 for t, _, _ in bars], [a for _, a, _ in bars],
            height=h, color=DARK, label="1차 현직 중심 (N=13)")
    ax.barh([t + h / 2 for t, _, _ in bars], [b for _, _, b in bars],
            height=h, color=LIGHT, label="2차 예비교사 (N=13)")
    for t, a, b in bars:
        ax.text(a + 0.16, t - h / 2, "%d" % a if a else "—", va="center",
                fontsize=7.6, color=DARK if a else "#777777")
        ax.text(b + 0.16, t + h / 2, "%d" % b if b else "—", va="center",
                fontsize=7.6, color=LIGHT if b else "#777777")
    for r in rules:
        ax.axhline(r, color="#cccccc", lw=0.5, zorder=0)
    ax.set_yticks([t for t, _, _ in ticks])
    ax.set_yticklabels([s for _, s, _ in ticks], fontsize=8, linespacing=1.1)
    for lbl, (_, _, grp) in zip(ax.get_yticklabels(), ticks):
        if grp:
            lbl.set_fontweight("bold")
            lbl.set_fontsize(8.4)
    ax.tick_params(axis="y", length=0, pad=3)
    ax.set_ylim(y - 0.7, -0.8)
    ax.set_xlim(0, 12.6)
    ax.set_xticks(range(0, 13, 2))
    ax.tick_params(axis="x", labelsize=8)
    for sp in ("top", "right", "left"):
        ax.spines[sp].set_visible(False)
    ax.set_xlabel("언급 인원", fontsize=8.5, labelpad=2)
    ax.legend(loc="lower right", fontsize=8, frameon=False)
    fig.tight_layout(pad=0.4)
    p = os.path.join(OUT, "fig_survey_categories.png")
    fig.savefig(p, dpi=400)
    plt.close(fig)
    print("  %s" % os.path.basename(p))


if __name__ == "__main__":
    print("사용자 검토 그림")
    fig_a()
    fig_b()
    fig_c()
