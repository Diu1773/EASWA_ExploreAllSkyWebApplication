# -*- coding: utf-8 -*-
"""본문 표 12(자유응답 범주)를 두 코드북과 대조한다.

두 열의 출처가 다르다.

  · **1차(현직)** — `audit_teacher_feedback.py` 의 `ANNOTATIONS`. 응답마다 코드가 붙어 있다.
    문항 6(기존 서비스)을 빼고 **사람 수**로 세면 표 12 의 1차 열 열세 범주가 모두 맞는다.
  · **2차(예비교사)** — `codebook_2026-09-08.py`. 여기서는 표 값이 **의미 단위 수**와 맞고
    일곱 범주에서 사람 수와 다르다(긍정 평가 12↔11, 교육과정 6↔4, 교사의 설명 준비 4↔3,
    화면 구성 단순화 3↔2, 용어·기호 8↔7, 실행 환경 2↔1, 학습자의 흥미·동기 2↔1).

표 제목은 「언급 인원」이고 3.6 은 같은 응답자의 반복을 한 번만 셌다고 쓴다. **1차는 그 선언대로
사람 수인데 2차만 단위 수다.** 두 열이 다른 것을 세고 있으므로 나란히 놓으면 비교가 되지 않는다.

2026-09-09 에 이 파일을 만들면서 1차를 「재현 불가」로 보고했는데 틀렸다. 판정 JSON 의
응답별 메모만 보고 `audit_teacher_feedback.py` 의 `ANNOTATIONS` 를 열지 않았다(FAILURES F-314).

  python -X utf8 docs/survey/check_freeform_table.py
  python -X utf8 docs/survey/check_freeform_table.py --unit   # 두 열을 단위 수 기준으로 본다
"""
import collections
import importlib.util
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAPER = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\EASWA_논문_v17.md"
BY_UNIT = "--unit" in sys.argv

# audit_teacher_feedback.py 의 코드 이름 ↔ 표 12 의 범주 이름
AUDIT_MAP = {
    "terms": "용어·기호·단위의 뜻", "concepts": "사전 개념·통계 지식·전공 배경",
    "meaning": "자료·그래프 요소의 의미", "independence": "학습자의 근거 설명과 주도 수행",
    "self_check": "생각해보기 문항의 발견과 이용", "language": "안내 문장의 자연스러움",
    "classroom": "교육과정·수업 시간·학생 수준", "teacher_support": "교사의 설명 준비",
    "progression": "난이도 단계화", "layout": "화면 구성 단순화",
    "concurrency": "동시 사용과 진행 지연", "choice": "자료 선택의 여지",
    "positive": "긍정 평가",
}


def _load(name, mod):
    sys.path.insert(0, HERE)
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, mod))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def second_round():
    """예비교사 — 의미 단위 수와 사람 수."""
    cb = _load("cb", "codebook_2026-09-08.py")
    unit, person, _, _ = cb.tally(cb.PRE)
    return unit, {k: len(v) for k, v in person.items()}


def first_round():
    """현직 — 문항 6(기존 서비스)을 빼고 센다."""
    aud = _load("aud", "audit_teacher_feedback.py")
    unit, person = collections.Counter(), collections.defaultdict(set)
    for key, (_persp, codes) in aud.ANNOTATIONS.items():
        q, who = key.rsplit("-", 1)
        if q == "Q6":
            continue
        for c in codes:
            cat = AUDIT_MAP.get(c)
            if not cat:
                continue
            unit[cat] += 1
            person[cat].add(who)
    return dict(unit), {k: len(v) for k, v in person.items()}


def table():
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


u1, p1 = first_round()
u2, p2 = second_round()
rows = table()
w1, w2 = (u1, u2) if BY_UNIT else (p1, p2)
basis = "의미 단위 수" if BY_UNIT else "언급 인원"

print("표 12 대조 — %s · 기준 %s · 범주 %d개" % (os.path.basename(PAPER), basis, len(rows)))
print()
print("%-28s %7s %7s %7s %7s" % ("범주", "표1차", "실제1차", "표2차", "실제2차"))
print("-" * 62)
bad = []
for cat, a, b in rows:
    x, y = w1.get(cat), w2.get(cat)
    tag = ""
    if a is not None and a != x:
        tag += " ←1차"
        bad.append(("1차", cat, a, x))
    if b is not None and b != y:
        tag += " ←2차"
        bad.append(("2차", cat, b, y))
    f = lambda v: "—" if v is None else v
    print("%-28s %7s %7s %7s %7s%s" % (cat, f(a), f(x), f(b), f(y), tag))
print()
if bad:
    print("어긋남 %d건 (기준 %s)" % (len(bad), basis))
    for col, cat, said, real in bad:
        print("   %s  %-26s 표 %s ↔ 실제 %s" % (col, cat, said, real))
else:
    print("어긋남 0건 (기준 %s)" % basis)
