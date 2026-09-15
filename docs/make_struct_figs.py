# -*- coding: utf-8 -*-
"""그림 2(연구 절차)와 그림 4(세 주제별 탐구활동의 공통 구조)를 그린다.

2026-09-14 소유자가 고른 가로형 도식의 구성을 사용하되, 연구 절차에서는
초기 식현상 시험 구현과 설계 근거 검토, 현직교사 적용과 보완, 예비교사 적용의
실제 순서를 보존한다.
다운로드한 시안은 참고본으로만 두고, 논문에는 한글이 정확하고 400 dpi인
재현 가능한 그림을 넣는다.

    python -X utf8 docs/make_struct_figs.py
"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt                       # noqa: E402
from matplotlib import font_manager                   # noqa: E402
from matplotlib.patches import Circle, FancyBboxPatch, Rectangle  # noqa: E402

OUT = Path(r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\원고_그림")
MM = 1 / 25.4
PAPER_W = 166.0

for cand in ("HCR Batang", "Batang", "HYSinMyeongJo-Medium", "Malgun Gothic"):
    if any(f.name == cand for f in font_manager.fontManager.ttflist):
        plt.rcParams["font.family"] = cand
        break
plt.rcParams["axes.unicode_minus"] = False

INK = "#111111"
LINE = "#737373"
ARROW = "#666666"
HEAD_FILL = "#ececec"
LABEL_FILL = "#f3f3f3"
BOX_FILL = "#f7f7f7"


def save(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    fig.savefig(path, dpi=400, facecolor="white")
    plt.close(fig)
    print("  %s" % path.name)


# ── 그림 2: 연구 절차 ────────────────────────────────────────────────

PROCEDURE = [
    "초기 구상·\n식현상 시험 구현",
    "설계 근거 검토\n서비스·이론·\n교육과정·교과서",
    "설계 원리·\n공통 탐구 흐름\n정리",
    "세 주제별\n탐구활동 구현",
    "식현상 활동\n기능 점검",
    "현직교사\n적용·보완",
    "예비교사\n적용",
]


def fig_procedure():
    """사용자가 고른 가로형 도식을 실제 연구 순서에 맞춘 7단계로 그린다."""
    w_mm, h_mm = PAPER_W, 52.0
    fig, ax = plt.subplots(figsize=(w_mm * MM, h_mm * MM))
    ax.set_xlim(0, w_mm)
    ax.set_ylim(0, h_mm)
    ax.axis("off")

    ax.text(w_mm / 2, 46.0, "연구 절차", fontsize=12.0, fontweight="bold",
            ha="center", va="center", color=INK)

    n = len(PROCEDURE)
    left, right, gap = 1.5, 1.5, 2.7
    bw = (w_mm - left - right - gap * (n - 1)) / n
    by, bh = 9.0, 22.0
    cy, cr = 34.1, 2.65

    for i, label in enumerate(PROCEDURE):
        x = left + i * (bw + gap)
        ax.add_patch(FancyBboxPatch(
            (x, by), bw, bh,
            boxstyle="round,pad=0.25,rounding_size=1.25",
            fc=BOX_FILL, ec=LINE, lw=0.75,
        ))
        ax.add_patch(Circle((x + bw / 2, cy), cr, fc="#6d6d6d", ec="none"))
        ax.text(x + bw / 2, cy, str(i + 1), fontsize=7.3, color="white",
                ha="center", va="center")
        ax.text(x + bw / 2, by + bh / 2 - 0.2, label, fontsize=7.0,
                ha="center", va="center", color=INK, linespacing=1.35)

        if i < n - 1:
            x0 = x + bw + 0.35
            x1 = x + bw + gap - 0.35
            ax.annotate("", xy=(x1, by + bh / 2), xytext=(x0, by + bh / 2),
                        arrowprops=dict(arrowstyle="->", color=ARROW, lw=0.9,
                                        shrinkA=0, shrinkB=0, mutation_scale=8))

    fig.subplots_adjust(0, 0, 1, 1)
    save(fig, "fig_procedure.png")


# ── 그림 4: 공통 탐구 흐름과 활동별 구조 ─────────────────────────────

FLOW = [
    ("Step 0", "탐구 주제 소개"),
    ("Step 1", "탐구 대상 선택"),
    ("Step 2", "자료 확인"),
    ("Step 3", "분석 준비"),
    ("Step 4", "분석 실행·시각화"),
    ("Step 5", "기준 자료와 비교"),
    ("Step 6", "해석·기록"),
]

MODULES = [
    (
        "TESS 외계행성 식현상",
        [
            "TESS FFI 컷아웃",
            "구경측광·차등측광·\n식현상 모델 적합",
            "측광 구경·배경·비교성 등",
            "반지름비 등 모델 파라미터",
        ],
    ),
    (
        "KMTNet 미시중력렌즈",
        [
            "관측소별 공개 측광표",
            "다지점 병합·점렌즈 모델 적합",
            "적합 대상·조건 확인",
            "최대 증광 시각·충격 변수·\n아인슈타인 시간",
        ],
    ),
    (
        "Gaia DR3 성단 색등급도",
        [
            "Gaia DR3 카탈로그",
            "구성원 선별·색등급도·\n등시선 맞춤",
            "구성원 선별 엄격도·나이·\n금속함량·거리지수·소광",
            "성단 나이·거리·소광",
        ],
    ),
]

ROW_LABELS = ["공공 자료", "분석 구조", "학습자가\n조절하는 조건", "주요 산출"]


def fig_modules():
    """공통 흐름은 위에, 세 탐구활동의 같은 비교 항목은 아래 표에 맞춰 그린다."""
    w_mm, h_mm = PAPER_W, 112.0
    fig, ax = plt.subplots(figsize=(w_mm * MM, h_mm * MM))
    ax.set_xlim(0, w_mm)
    ax.set_ylim(0, h_mm)
    ax.axis("off")

    ax.text(w_mm / 2, 107.0,
            "세 주제별 탐구활동의 공통 탐구 흐름과 활동별 자료·분석 구조",
            fontsize=11.3, fontweight="bold", ha="center", va="center", color=INK)

    # 위쪽 공통 탐구 흐름
    px, py, pw, ph = 1.5, 70.0, 163.0, 30.8
    ax.add_patch(FancyBboxPatch(
        (px, py), pw, ph,
        boxstyle="round,pad=0.18,rounding_size=1.15",
        fc="white", ec=LINE, lw=0.7,
    ))
    ax.add_patch(Rectangle((px + 0.2, py + ph - 8.0), pw - 0.4, 7.8,
                           fc=HEAD_FILL, ec="none"))
    ax.text(px + 3.0, py + ph - 4.0, "공통 탐구 흐름", fontsize=8.3,
            ha="left", va="center", color=INK)

    fx0, fy, fgap = px + 3.0, py + 4.2, 3.55
    fw = (pw - 6.0 - fgap * 6) / 7
    fh = 13.5
    for i, (step, label) in enumerate(FLOW):
        x = fx0 + i * (fw + fgap)
        ax.add_patch(FancyBboxPatch(
            (x, fy), fw, fh,
            boxstyle="round,pad=0.18,rounding_size=0.9",
            fc=BOX_FILL, ec=LINE, lw=0.65,
        ))
        ax.text(x + fw / 2, fy + 8.5, step, fontsize=6.4, fontstyle="italic",
                ha="center", va="center", color=INK)
        ax.text(x + fw / 2, fy + 4.2, label, fontsize=6.2,
                ha="center", va="center", color=INK)
        if i < 6:
            ax.annotate("", xy=(x + fw + fgap - 0.35, fy + fh / 2),
                        xytext=(x + fw + 0.35, fy + fh / 2),
                        arrowprops=dict(arrowstyle="-|>", color=ARROW, lw=0.75,
                                        shrinkA=0, shrinkB=0, mutation_scale=7.5))

    # 아래쪽 세 탐구활동 표
    table_y, table_h = 2.0, 60.0
    gap = 2.5
    table_w = (w_mm - 3.0 - gap * 2) / 3
    title_h = 9.0
    row_h = (table_h - title_h) / 4
    label_w = 15.6

    for j, (title, values) in enumerate(MODULES):
        x = 1.5 + j * (table_w + gap)
        cx = x + table_w / 2

        ax.annotate("", xy=(cx, py - 0.2), xytext=(cx, table_y + table_h + 0.1),
                    arrowprops=dict(arrowstyle="-|>", color=ARROW, lw=0.85,
                                    shrinkA=0, shrinkB=0, mutation_scale=8.5))

        ax.add_patch(FancyBboxPatch(
            (x, table_y), table_w, table_h,
            boxstyle="round,pad=0.0,rounding_size=0.75",
            fc="white", ec=LINE, lw=0.75,
        ))
        ax.add_patch(Rectangle((x + 0.1, table_y + table_h - title_h),
                               table_w - 0.2, title_h - 0.1,
                               fc=HEAD_FILL, ec="none"))
        ax.text(cx, table_y + table_h - title_h / 2, title, fontsize=7.5,
                fontweight="bold", ha="center", va="center", color=INK)

        y_top = table_y + table_h - title_h
        for i, (label, value) in enumerate(zip(ROW_LABELS, values)):
            y = y_top - (i + 1) * row_h
            ax.add_patch(Rectangle((x, y), label_w, row_h,
                                   fc=LABEL_FILL, ec="none"))
            ax.plot([x, x + table_w], [y, y], color=LINE, lw=0.45)
            ax.plot([x + label_w, x + label_w], [y, y + row_h], color=LINE, lw=0.45)
            ax.text(x + label_w / 2, y + row_h / 2, label, fontsize=6.1,
                    ha="center", va="center", color=INK, linespacing=1.25)
            ax.text(x + label_w + 2.0, y + row_h / 2, value, fontsize=6.05,
                    ha="left", va="center", color=INK, linespacing=1.27)
        ax.plot([x, x + table_w], [y_top, y_top], color=LINE, lw=0.5)

    fig.subplots_adjust(0, 0, 1, 1)
    save(fig, "fig_modules.png")


if __name__ == "__main__":
    print("논문 구조 도식")
    fig_procedure()
    fig_modules()
