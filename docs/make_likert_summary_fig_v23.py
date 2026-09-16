import csv
from pathlib import Path
from statistics import mean

import matplotlib.pyplot as plt
from matplotlib import font_manager


OUTPUT = Path(r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\원고_그림\fig_likert_summary.png")
DATA_DIR = Path(__file__).resolve().parent / "survey" / "data"
TEACHER_DATA = DATA_DIR / "교사_설문_원자료_2026-07-24.tsv"
PRESERVICE_DATA = DATA_DIR / "예비교사_설문_원자료_2026-09-07_통합.tsv"


def korean_font() -> str:
    preferred = ["KoPubWorld돋움체", "KoPubWorld Dotum", "Malgun Gothic"]
    installed = {font.name for font in font_manager.fontManager.ttflist}
    for name in preferred:
        if name in installed:
            return name
    return "DejaVu Sans"


items = [
    ("8.", "탐구 주제·질문에서 시작", False),
    ("9.", "코딩 없이 공공자료 분석", False),
    ("11.", "분석 조건 직접 조절", False),
    ("13.", "단계별 질문의 도움", False),
    ("15.", "기준값 비교 화면 이해*", True),
    ("16.", "산출값과 기준값 차이 해석", False),
    ("18.", "교육용 웹 플랫폼의 적절성", False),
]


def survey_means(path: Path) -> tuple[list[float], list[int]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        rows = list(reader)
        headers = reader.fieldnames or []

    values_by_item: list[float] = []
    counts: list[int] = []
    for prefix, _, reverse in items:
        header = next(name for name in headers if name.startswith(prefix))
        values = [float(row[header]) for row in rows if row.get(header, "").strip()]
        if reverse:
            values = [6.0 - value for value in values]
        values_by_item.append(mean(values))
        counts.append(len(values))
    return values_by_item, counts


labels = [label for _, label, _ in items]
teachers, teacher_counts = survey_means(TEACHER_DATA)
preservice, preservice_counts = survey_means(PRESERVICE_DATA)

assert teacher_counts == [13, 13, 13, 13, 13, 13, 13], teacher_counts
assert preservice_counts == [13, 12, 13, 13, 13, 13, 13], preservice_counts


plt.rcParams.update(
    {
        "font.family": korean_font(),
        "axes.unicode_minus": False,
        "font.size": 11,
    }
)

fig, ax = plt.subplots(figsize=(7.4, 4.6), dpi=220)
y = list(range(len(labels)))
offset = 0.13

ax.scatter(
    teachers,
    [value - offset for value in y],
    s=49,
    marker="o",
    facecolor="black",
    edgecolor="black",
    linewidth=0.8,
    label="현직교사 중심 적용 (N=13)",
    zorder=3,
)
ax.scatter(
    preservice,
    [value + offset for value in y],
    s=54,
    marker="s",
    facecolor="white",
    edgecolor="black",
    linewidth=1.1,
    label="예비교사 적용 (N=13)",
    zorder=3,
)

for x_value, y_value in zip(teachers, y):
    ax.text(x_value + 0.06, y_value - offset, f"{x_value:.2f}", va="center", ha="left", fontsize=9)
for x_value, y_value in zip(preservice, y):
    ax.text(x_value + 0.06, y_value + offset, f"{x_value:.2f}", va="center", ha="left", fontsize=9)

ax.set_yticks(y, labels)
ax.invert_yaxis()
ax.set_xlim(1, 5.18)
ax.set_xticks([1, 2, 3, 4, 5])
ax.set_xlabel("평균 (5점 척도)")
ax.grid(axis="x", color="#d5d5d5", linewidth=0.7)
ax.tick_params(axis="y", length=0, pad=8)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.spines["left"].set_visible(False)
ax.spines["bottom"].set_color("#666666")
ax.legend(loc="lower center", bbox_to_anchor=(0.5, 1.01), ncol=2, frameon=False, fontsize=9.5)

fig.subplots_adjust(left=0.37, right=0.96, top=0.86, bottom=0.14)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUTPUT, dpi=300, bbox_inches="tight", facecolor="white")
plt.close(fig)
print(OUTPUT)
