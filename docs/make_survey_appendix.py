# -*- coding: utf-8 -*-
"""두 조사의 설문 문항 전문과 응답 요약을 부록 표로 만든다 (2026-09-11).

문항을 골라 싣다가 값이 빠진 자리가 생겼다는 지적에서 나왔다 — 1차의 활용
의향 3.92 는 어디에도 없는데 2차의 4.38 만 실렸다. **고르지 말고 전부 싣는다.**
서술형은 응답 원문 대신 응답 수만 적는다(범주는 부록 표 1~3).

    python -X utf8 docs/make_survey_appendix.py
"""
import collections
import csv
import io
import os
import statistics as st

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "survey", "data")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "survey",
                   "_부록_설문문항.md")
SKIP = ("타임스탬프", "본 조사의 목적")
# 5점 척도 문항 — 분포와 평균을 적는다
LIKERT = tuple("%d." % n for n in list(range(8, 19))) + ("18-1.", "21-1.")
# 유형은 응답 길이가 아니라 문항 번호로 정한다 — 선택지가 긴 복수선택 문항을
# 서술형으로 잘못 분류했다(2026-09-11).
FREE = ("6.", "20.", "20-1.", "22.", "23.")
SCALE = ("2.",)                       # 배경 문항이지만 5점 척도다


def summarize(head, vals, n):
    blank = n - len(vals)
    if head.startswith(LIKERT) and all(v.isdigit() for v in vals):
        num = [int(v) for v in vals]
        dist = [num.count(k) for k in range(1, 6)]
        s = "분포 %s · 평균 %.2f (SD %.2f)" % ("·".join(map(str, dist)),
                                              st.mean(num), st.stdev(num))
    elif head.startswith(SCALE) and all(v.isdigit() for v in vals):
        num = [int(v) for v in vals]
        s = " · ".join("%d점 %d명" % (k, num.count(k))
                       for k in range(1, 6) if num.count(k))
    elif head.startswith(FREE):
        return "서술형 · 응답 %d명" % len(vals)
    else:
        items = []
        for k, c in collections.Counter(
                x.strip() for v in vals for x in v.split(", ") if x.strip()).most_common():
            items.append("%s %d" % (k, c))
        s = " · ".join(items)
    return s + (" · 무응답 %d" % blank if blank else "")


def table(fname, title, note):
    rows = list(csv.reader(io.open(os.path.join(BASE, fname), encoding="utf-8"),
                           delimiter="\t"))
    hdr, body = rows[0], [r for r in rows[1:] if any(x.strip() for x in r)]
    out = ["**%s**" % title, "", "| 문항 | 응답 |", "| --- | --- |"]
    first19 = [True]
    for i, h in enumerate(hdr):
        if not h.strip() or h.startswith(SKIP):
            continue
        vals = [r[i].strip() for r in body if i < len(r) and r[i].strip()]
        name = h.strip()
        if name.startswith("19.") and "[" in name:
            sub = name[name.index("[") + 1:name.rindex("]")]
            name = ("19. 본인이 어려움을 겪은 단계와 학생이 어려워할 것으로 "
                    "예상한 단계 — " + sub) if first19[0] else "19. — " + sub
            first19[0] = False
        out.append("| %s | %s |" % (name.replace("|", "／"),
                                    summarize(h.strip(), vals, len(body)) or "—"))
    out += ["", note, ""]
    return out


if __name__ == "__main__":
    lines = table(
        "교사_설문_원자료_2026-07-24.tsv",
        "부록 표 4. 1차 조사의 설문 문항과 응답 (현직교사 중심, N=13)",
        "주. 문항은 설문 원문 그대로이다. 5점 척도 문항의 분포는 1점부터 5점까지의 "
        "인원이며, 역채점하지 않은 원점수이다. 서술형 문항은 응답 원문 대신 응답한 "
        "인원만 적었고, 범주와 포함 기준은 부록 표 1~3에 있다.")
    lines += table(
        "예비교사_설문_원자료_2026-09-07_통합.tsv",
        "부록 표 5. 2차 조사의 설문 문항과 응답 (예비교사, N=13)",
        "주. 표기 방식은 부록 표 4와 같다. 문항 17과 21-1은 1차와 문구가 다르고, "
        "문항 2-1·18-1·18-2는 2차에만 두었다.")
    io.open(OUT, "w", encoding="utf-8").write("\n".join(lines))
    print("만들었다 — %s (%d줄)" % (OUT, len(lines)))
