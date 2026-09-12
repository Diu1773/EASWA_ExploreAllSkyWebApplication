# -*- coding: utf-8 -*-
"""표 1(연구 절차)과 표 6(세 모듈)을 도식으로 그린다 — 시안 (2026-09-11).

표로는 안 보이는 것이 있다.

  · 표 1 은 여덟 단계가 **순서대로 이어진다**는 것이 핵심인데, 행으로 늘어놓으면
    그 이어짐이 보이지 않는다. 방법 절과 결과 절이 짝을 이루는 것도 열로는
    떨어져 보인다.
  · 표 6 은 세 모듈이 **같은 흐름을 공유한다**는 것이 핵심인데, 행으로 늘어놓으면
    각 모듈이 따로 보인다.

    python -X utf8 docs/make_struct_figs.py
"""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt                       # noqa: E402
from matplotlib.patches import FancyBboxPatch, FancyArrow, Rectangle   # noqa: E402
from matplotlib import font_manager                   # noqa: E402

OUT = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\원고_그림"
MM = 1 / 25.4
W = 166 * MM

for cand in ("Malgun Gothic", "HCR Dotum", "Gulim", "Batang"):
    if any(f.name == cand for f in font_manager.fontManager.ttflist):
        plt.rcParams["font.family"] = cand
        break
plt.rcParams["axes.unicode_minus"] = False

# 학술 도식은 검은 선과 빈 바탕이다. 채운 색과 둥근 모서리는 발표 슬라이드의
# 어법이지 논문 그림의 어법이 아니다(2026-09-11 소유자 지적).
INK, MUTE, RULE = "#000000", "#555555", "#000000"

# ── 표 1 ────────────────────────────────────────────────────────────
STEPS = [
    ("초기 구상과 시험 구현", "3.1", "—"),
    ("기존 서비스 사례분석", "3.2", "4.1"),
    ("교육과정·교과서 검토", "3.3", "4.2"),
    ("설계 원리와 공통 탐구 흐름 정리", "3.4", "4.3"),
    ("세 탐구모듈 구현", "3.4", "4.3"),
    ("식현상 모듈의 분석 기능 점검", "3.5", "4.4"),
    ("1차 사용자 검토와 보완", "3.6", "4.5"),
    ("2차 사용자 검토", "3.6", "4.6"),
]
# 연구문제와의 대응 — 표 1 아래 문장이 말하던 것을 그림 안으로 옮긴다
RQ = {1: "RQ1", 6: "RQ3", 7: "RQ3"}
RQ_SPAN = [(1, 1, "RQ 1"), (3, 5, "RQ 2"), (6, 7, "RQ 3")]


def fig_procedure():
    """세로로 96mm 를 쓰던 것을 68mm 로 줄인다 (2026-09-12 소유자 지시).

    상자가 본문 폭을 다 쓰면서 글자는 왼쪽에 몰려 있어 상자 안이 비어 보였다.
    상자 폭을 글자에 맞추고 글자를 가운데로 옮겼다.

    **자리 단위는 mm 다.** `typeset_hwp.py` 가 그림을 본문 폭(166mm)으로 늘리므로
    바탕을 166mm 로 잡고 도식을 그 가운데에 놓는다. 이러면 늘어나도 1:1 이라
    글자 크기가 8.6pt 그대로 찍힌다. 바탕을 120mm 로 잡으면 1.38배로 불어난다.
    """
    n = len(STEPS)
    w_mm, h_mm = 166.0, 68.0
    fig, ax = plt.subplots(figsize=(w_mm * MM, h_mm * MM))
    ax.set_xlim(0, w_mm)
    ax.set_ylim(0, h_mm)
    ax.axis("off")

    bx, bw, bh, pitch = 29.0, 78.0, 5.4, 8.0
    top = h_mm - 5.0
    for i, (name, m, r) in enumerate(STEPS):
        y = top - i * pitch - bh
        ax.add_patch(Rectangle((bx, y), bw, bh, fc="none", ec=RULE, lw=0.8))
        ax.text(bx + bw / 2, y + bh / 2, name, fontsize=8.6,
                ha="center", va="center", color=INK)
        ax.text(bx + bw + 3.0, y + bh / 2, "%s → %s" % (m, r),
                fontsize=7.6, va="center", color=MUTE)
        if i < n - 1:
            ax.annotate("", xy=(bx + bw / 2, y - pitch + bh),
                        xytext=(bx + bw / 2, y - 0.2),
                        arrowprops=dict(arrowstyle="-|>", color=RULE, lw=0.8,
                                        mutation_scale=7))

    ax.text(bx + bw + 3.0, top + 2.4, "방법 절 → 결과 절",
            fontsize=7.6, color=MUTE, va="center")
    fig.subplots_adjust(0, 0, 1, 1)
    p = os.path.join(OUT, "fig_procedure.png")
    fig.savefig(p, dpi=400)
    plt.close(fig)
    print("  %s" % os.path.basename(p))


# ── 표 6 ────────────────────────────────────────────────────────────
FLOW = ["탐구 주제\n소개", "탐구 대상\n선택", "자료\n확인", "분석\n준비",
        "분석 실행·\n시각화", "기준 자료와\n비교", "해석·\n기록"]
# 값은 표 6 원문 그대로다. 옮겨 적으면서 「소광」을 「금속량」으로 바꾸고
# 「등」을 빼먹은 적이 있다(2026-09-11).
# 값은 표 6 원문 그대로다. 옮겨 적으면서 「소광」을 「금속량」으로 바꾸고
# 「등」을 빼먹은 적이 있다(2026-09-11).
MODULES = [
    ("TESS 외계행성 식현상", "TESS FFI 컷아웃",
     "구경·차등측광 →\n식현상 모델 적합", "측광 구경·배경·\n비교성 등",
     "반지름비 등\n모델 파라미터"),
    ("KMTNet 미시중력렌즈", "관측소별 공개 측광표",
     "다지점 병합 →\n점렌즈 모델 적합", "적합 대상·조건 확인",
     "최대 증광 시각·충격 변수·\n아인슈타인 시간"),
    ("Gaia 성단 색등급도", "Gaia DR3 카탈로그",
     "구성원 선별 → 색등급도\n→ 등시선 맞춤",
     "구성원 선별 엄격도,\n나이·금속함량·\n거리지수·소광",
     "성단 나이·거리·소광"),
]

ROWS = ["공공 자료", "분석 구조", "학습자가 조작하는 값", "주요 산출"]


def fig_modules():
    fig, ax = plt.subplots(figsize=(W, 92 * MM))
    ax.set_xlim(0, 100)
    # 아래를 0 으로 두면 마지막 행이 0.4 만큼 잘린다(2026-09-11).
    ax.set_ylim(-8.0, 60)
    ax.axis("off")

    # 위 — 세 모듈이 함께 쓰는 일곱 단계
    fw = 100 / len(FLOW)
    for i, t in enumerate(FLOW):
        x = i * fw
        ax.add_patch(Rectangle((x + 0.7, 50.5), fw - 3.0, 7.0,
                               fc="none", ec=RULE, lw=0.8))
        ax.text(x + (fw - 3.0) / 2 + 0.7, 54.0, t, fontsize=6.9,
                ha="center", va="center", color=INK, linespacing=1.25)
        if i < len(FLOW) - 1:
            ax.annotate("", xy=(x + fw + 0.35, 54.0), xytext=(x + fw - 2.0, 54.0),
                        arrowprops=dict(arrowstyle="-|>", color=RULE, lw=0.9,
                                        mutation_scale=9,
                                        shrinkA=0, shrinkB=0))
    ax.text(0, 58.4, "세 모듈이 공유하는 일곱 단계 탐구 흐름",
            fontsize=8.4, color=INK, va="bottom")

    # 아래 — 모듈별. 행 높이를 세 열에서 같게 맞춘다(어긋나면 비교가 안 된다).
    cw = 100 / 3
    ax.text(0, 46.2, "모듈별 자료와 분석 구조", fontsize=8.4, color=INK, va="bottom")
    NL = chr(10)
    # 7.4pt 글자는 한 줄에 2.4 단위를 먹는다. 3.2+3.3n 으로 잡았더니 「공공 자료」
    # 한 줄짜리 값이 상자 아래 선에 닿았다(2026-09-11).
    heights = [5.4 + max(m[k + 1].count(NL) + 1 for m in MODULES) * 2.4
               for k in range(len(ROWS))]
    for j, (title, *cells) in enumerate(MODULES):
        x = j * cw
        ax.add_patch(Rectangle((x + 0.8, 39.6), cw - 1.6, 5.2, fc="none", ec=RULE, lw=1.2))
        ax.text(x + cw / 2, 42.2, title, fontsize=8.0, ha="center", va="center",
                color=INK)
        y = 38.2
        for lab, cell, hgt in zip(ROWS, cells, heights):
            ax.add_patch(Rectangle((x + 0.8, y - hgt), cw - 1.6, hgt,
                                   fc="none", ec=RULE, lw=0.5))
            ax.text(x + 2.2, y - 2.4, lab, fontsize=6.6, color=MUTE, va="top")
            ax.text(x + 2.2, y - 4.9, cell, fontsize=7.4, color=INK,
                    va="top", linespacing=1.3)
            y -= hgt + 0.9
    fig.tight_layout(pad=0.3)
    p = os.path.join(OUT, "fig_modules.png")
    fig.savefig(p, dpi=400)
    plt.close(fig)
    print("  %s" % os.path.basename(p))


if __name__ == "__main__":
    print("구조 도식 시안")
    fig_procedure()
    fig_modules()
