# -*- coding: utf-8 -*-
"""순환 논리를 원고 전체에서 찾는다.

2026-09-09에 소유자가 잡았다 — *「순환논리 쓰던것들 사례분석이랑 설계원리들, 3장에만
있는게 아닐가능성이 있어 논문전체에 걸쳐서 있을거야」*. 실제로 초록·1.3·표 1·3.4·6장
다섯 곳에 남아 있었다. 3.4만 고치고 끝냈으면 그대로 나갔다.

순환은 **근거가 결론을 미리 담고 있을 때** 생긴다. 이 원고에서 위험한 자리는 셋이다.

  A. 사례분석(3.2·4.1)이 설계 원리를 낳았다고 쓰는 곳.
     분석 기준 일곱 개와 설계 원리 다섯 개가 같은 대목을 다루므로, 기준이 원리를
     낳았다고 쓰면 답을 정해 놓고 잰 것이 된다. 원리의 근거는 이론(Ⅱ장)과
     교육과정·교과서 검토이고, 사례분석은 그 방향이 실제로 요구되는지 확인하는
     자료다. 이 구분은 3.4 와 표 5 의 「원리가 나온 자리」 열에 밝혀 두었다.

  B. 사용자 응답을 설계 원리의 타당성 근거로 쓰는 곳.
     문항이 원리를 묻는 것 자체는 형성평가 도구의 정상 절차다. 다만 「높게 나왔으니
     원리가 타당하다」는 순환이다. 응답은 보완 지점을 찾는 자료다(5.6 셋째).

  C. 산출값 점검을 코드의 정확도 근거로 쓰는 곳.
     별도 스크립트가 플랫폼과 분석 함수를 일부 공유하므로 서로를 검증하지 못한다.
     이미 3.5 둘째 문단에 밝혀 두었다.

기계는 **의심되는 문장을 꺼내 놓기만** 한다. 순환인지 아닌지는 사람이 그 줄을 읽고
판정한다. 0건이 정상이 아니라, 0건이면 검사가 안 돈 것일 수도 있으므로 첫 줄에 찍히는
파일명과 문장 수를 먼저 본다(F-312).

  python -X utf8 docs/check_circularity.py
  python -X utf8 docs/check_circularity.py <다른 원고 경로>
"""
import io
import os
import re
import sys

DEFAULT = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\EASWA_논문_v17.md"
P = sys.argv[1] if len(sys.argv) > 1 else DEFAULT

# 「A 때문에 B」를 만드는 말들. 이것이 없으면 두 낱말이 한 문장에 있어도 인과가 아니다.
LINK = r"(바탕으로|근거로|토대로|종합하여|따라|따라서|그래서|이를 통해|도출|이끌어|기반으로|반영하여|받아들여)"

RULES = [
    # (딱지, 왼쪽 낱말, 오른쪽 낱말, 설명)
    ("A 사례분석 → 설계 원리",
     r"(사례분석|기존 서비스 분석|4\.1|분석 기준|표 2)",
     r"(설계 원리|다섯 원리|원리를|원리로)",
     "원리의 근거는 이론과 교육과정이다. 사례분석은 그 방향이 요구되는지 확인하는 자료다."),
    ("B 사용자 응답 → 원리의 타당성",
     r"(반응|응답|평균|척도|검토 결과|만족)",
     r"(타당|적절함|유효|입증|원리가 확인|원리의 타당)",
     "문항이 원리를 묻고 있으므로 높은 응답은 원리의 근거가 못 된다. 보완 지점을 찾는 자료다."),
    ("C 산출값 점검 → 코드 정확도",
     r"(별도 스크립트|재분석|대조한 결과|점검)",
     r"(정확도|정확함|옳음을|검증하였|입증)",
     "별도 스크립트가 분석 함수를 일부 공유하므로 서로를 검증하지 못한다(3.5)."),
]

# 이미 고지한 문장은 걸러 낸다. 이 말들이 있으면 순환을 밝히고 있는 쪽이다.
SAFE = r"(아니라|아니다|못 한다|않았다|않는다|한정하여|보아야|자료로 사용|자료로 다루|확인하는 자료|구분하여)"

src = io.open(P, encoding="utf-8").read()
head = src.split("\n# 참고문헌")[0]

# 표 안은 한 줄이 한 칸씩이라 문장 분절이 통하지 않는다. 줄 단위로 따로 본다.
lines = head.split("\n")
units = []
for n, line in enumerate(lines, 1):
    if line.startswith("|"):
        units.append((n, line))
        continue
    for sent in re.split(r"(?<=다\.)\s+", line):
        if sent.strip():
            units.append((n, sent.strip()))

print("순환 논리 검사 — %s" % os.path.basename(P))
print("본문 %d줄 · 문장·표칸 %d개" % (len(lines), len(units)))
print()

total = 0
for tag, left, right, why in RULES:
    hits = []
    for n, u in units:
        if not (re.search(left, u) and re.search(right, u)):
            continue
        if not re.search(LINK, u):
            continue
        hits.append((n, u, bool(re.search(SAFE, u))))
    flagged = [h for h in hits if not h[2]]
    total += len(flagged)
    print("[%s] 의심 %d건 (고지된 문장 %d건은 뺐다)" % (tag, len(flagged), len(hits) - len(flagged)))
    print("   %s" % why)
    for n, u, _ in flagged:
        print("   %5d행  %s" % (n, u[:150] + ("…" if len(u) > 150 else "")))
    print()

print("합계 %d건 — 사람이 각 줄을 읽고 순환인지 판정한다." % total)
print()
print("주. 인과를 만드는 말(%s)이 없으면 두 낱말이 한 문장에 있어도 잡지 않는다." % LINK.strip("()"))
print("    「아니라·확인하는 자료로」처럼 스스로 밝힌 문장도 뺀다. 그래서 0건이 곧 안전은")
print("    아니다. 낱말을 바꿔 쓴 문장은 이 검사가 못 잡으므로 사람이 한 번 훑는다.")
