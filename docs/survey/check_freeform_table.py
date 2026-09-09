# -*- coding: utf-8 -*-
"""본문 표 12(자유응답 범주)를 두 코드북과 대조한다.

2026-09-09에 두 가지가 드러났다.

  ① **표 12의 2차 열은 사람 수가 아니라 의미 단위 수다.** 열아홉 범주 전부에서 값이
     단위 수와 일치하고 일곱 범주에서 사람 수와 다르다(긍정 평가 12↔11, 교육과정 6↔4,
     교사의 설명 준비 4↔3, 화면 구성 단순화 3↔2, 용어·기호 8↔7, 실행 환경 2↔1,
     학습자의 흥미·동기 2↔1). 그런데 표 제목은 「언급 인원」이고 3.6은 같은 응답자의
     반복을 한 번만 셌다고 쓴다. 선언과 숫자가 다르다.

  ② **1차 열은 어떤 파일로도 재현되지 않는다.** 2026-07-24 판정 파일의 라벨은
     「선수 지식·난이도 한계」처럼 응답별 메모라 표 12의 범주 이름이 없다. 손으로 센
     숫자다. 저장소 완료 조건(본문 수치의 원자료 역추적)을 이 표가 못 지킨다.

이 검사는 표 12의 두 열을 각각의 출처와 맞춘다. 1차는 `현직_범주배정지_2026-09-09.md`의
범주 칸이 채워져야 돌아간다. 채우기 전에는 그 사실을 그대로 알린다.

  python -X utf8 docs/survey/check_freeform_table.py
  python -X utf8 docs/survey/check_freeform_table.py --unit   # 2차를 단위 수로 본다
"""
import importlib.util
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAPER = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\EASWA_논문_v17.md"
SHEET = os.path.join(HERE, "현직_범주배정지_2026-09-09.md")
BY_UNIT = "--unit" in sys.argv


def load_codebook():
    spec = importlib.util.spec_from_file_location("cb", os.path.join(HERE, "codebook_2026-09-08.py"))
    cb = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cb)
    unit, person, _, _ = cb.tally(cb.PRE)
    return unit, {k: len(v) for k, v in person.items()}


def load_table():
    """표 12를 (범주, 1차, 2차)로 읽는다. — 는 None."""
    lines = io.open(PAPER, encoding="utf-8").read().split("\n")
    i = next(n for n, l in enumerate(lines) if l.startswith("**표 12."))
    rows = [l for l in lines[i:i + 40] if l.startswith("|") and "---" not in l][1:]
    out = []
    for r in rows:
        c = [x.strip() for x in r.strip("|").split("|")]
        if len(c) < 3 or not c[1]:
            continue
        m = re.match(r"(.+?)\s*/\s*(.+)$", c[2])
        if not m:
            continue
        def num(x):
            x = x.strip()
            return None if x in ("—", "-", "") else int(x)
        out.append((c[1], num(m.group(1)), num(m.group(2))))
    return out


def load_sheet():
    """배정지의 범주 칸에서 1차 집계를 만든다. 안 채웠으면 (None, None)."""
    if not os.path.exists(SHEET):
        return None, None
    unit, person = {}, {}
    filled = 0
    total = 0
    for line in io.open(SHEET, encoding="utf-8").read().split("\n"):
        if not line.startswith("| Q"):
            continue
        c = [x.strip() for x in line.strip("|").split("|")]
        if len(c) < 6:
            continue
        total += 1
        who, cat = c[1], c[5]
        if not cat:
            continue
        filled += 1
        unit[cat] = unit.get(cat, 0) + 1
        person.setdefault(cat, set()).add(who)
    if filled == 0:
        return None, total
    return (unit, {k: len(v) for k, v in person.items()}), (filled, total)


pre_unit, pre_person = load_codebook()
table = load_table()
sheet, sheet_state = load_sheet()

print("표 12 대조 — %s" % os.path.basename(PAPER))
print("2차 기준: %s · 범주 %d개" % ("의미 단위 수" if BY_UNIT else "언급 인원", len(table)))
print()

want = pre_unit if BY_UNIT else pre_person
bad2 = []
print("%-30s %8s %8s %8s" % ("범주", "표(2차)", "단위", "인원"))
print("-" * 58)
for cat, a, b in table:
    u, p = pre_unit.get(cat), pre_person.get(cat)
    mark = ""
    if u is None:
        mark = "  ← 코드북에 없는 범주"
    elif b is not None and b != want.get(cat):
        mark = "  ← 어긋남"
        bad2.append((cat, b, want.get(cat)))
    print("%-30s %8s %8s %8s%s" % (cat, "—" if b is None else b,
                                   "-" if u is None else u, "-" if p is None else p, mark))
print()
if bad2:
    print("2차 열이 %s과 어긋난 범주 %d개: %s" % (
        "단위" if BY_UNIT else "인원", len(bad2),
        ", ".join("%s(표 %s ↔ %s)" % (c, x, y) for c, x, y in bad2)))
else:
    print("2차 열 어긋남 0건.")
print()

if sheet is None:
    n = sheet_state if isinstance(sheet_state, int) else "?"
    print("1차 열: **대조 못 했다.** 배정지의 범주 칸이 %s개 모두 비어 있다." % n)
    print("        %s" % os.path.basename(SHEET))
    print("        채우기 전에는 표 12의 1차 열을 뒷받침하는 파일이 없다.")
else:
    su, sp = sheet
    filled, total = sheet_state
    w = su if BY_UNIT else sp
    print("1차 열 (배정지 %d/%d 채움)" % (filled, total))
    bad1 = [(c, a, w.get(c, 0)) for c, a, _ in table if a is not None and a != w.get(c, 0)]
    for c, a, x in bad1:
        print("   %-28s 표 %s ↔ 배정지 %s" % (c, a, x))
    print("   어긋남 %d건." % len(bad1))
