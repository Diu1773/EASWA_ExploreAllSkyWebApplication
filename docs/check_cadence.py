# -*- coding: utf-8 -*-
"""문장 종결을 **기능**으로 묶어 절별 리듬 쏠림을 잰다.

`check_style_freq.py` 가 이 현상을 놓친 이유는 셋이다 (2026-09-10 소유자 지적).

1. 종결을 **문자열**로 세었다. 「수행하였다」·「확인하였다」·「정리하였다」가 서로 다른
   항목으로 잡혀 「206가지」가 나왔고, 그 숫자가 다양해 보이게 만들었다. 독자가 느끼는
   박자는 셋 다 「연구자가 한 일을 보고하는 과거 서술」로 같다.
2. 같은 계열 연속을 보는 E-2 는 **`--humanize` 옵션에서만** 돌았다. 기본 실행에 없다.
3. E-2 는 **한 문단 안 4문장 연속**만 본다. 절이 세 문장씩 여러 문단으로 나뉘면 절대
   걸리지 않고, 「열 문장 가운데 아홉이 과거 보고형」인데 중간에 하나만 끼어도 놓친다.

그래서 여기서는 **절 단위로 기능 비율**을 재고, 문단 경계를 넘는 연속도 함께 센다.

    python -X utf8 docs/check_cadence.py
    python -X utf8 docs/check_cadence.py --sec 3.6      한 절의 문장을 다 본다
"""
import io
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_style_freq import SRC, sections, split_sent   # noqa: E402

# 기능 묶음. 순서가 곧 우선순위다 — 「할 수 있었다」는 과거가 아니라 가능으로 센다.
FUNCS = [
    ("당위", r"(?:어야 (?:한다|하며|하고|했다)|필요가 있다|필요하다|필요하였다"
             r"|중요하다|중요해진다|바람직하다|마땅하다)$"),
    ("가능·난이", r"(?:수 있다|수 있었다|수 없다|수 없었다|수는 없다|수는 없었다"
                r"|어렵다|어려웠다|쉽다|가능하다|가능하였다|가능해진다)$"),
    ("과거 보고", r"(?:하였다|하였고|되었다|였다|았다|었다|했다|밝혔다|봤다|낮았다|높았다)$"),
    ("현재 서술", r"(?:한다|된다|이다|아니다|같다|있다|없다|난다|든다|따른다|받는다)$"),
]

LABEL_W = 30


def func(s):
    """문장 하나의 종결 기능. 괄호 주석은 떼고 본다."""
    t = re.sub(r"\([^)]*\)\s*$", "", s.rstrip(".")).strip()
    for name, pat in FUNCS:
        if re.search(pat, t):
            return name
    return "기타"


def bar(ratio, width=18):
    n = int(round(ratio * width))
    return "█" * n + "·" * (width - n)


def grade(top_ratio, longest, n):
    """소유자가 손으로 매긴 등급을 기계로 옮긴 것. 비율과 최장 연속을 함께 본다."""
    if n < 4:
        return "—"
    if top_ratio >= 0.80 or longest >= 7:
        return "빨강빨강"
    if top_ratio >= 0.65 or longest >= 5:
        return "빨강"
    if top_ratio >= 0.55 or longest >= 4:
        return "주황"
    return "노랑"


def main():
    md = io.open(SRC, encoding="utf-8").read()
    paras = sections(md)

    # 절 단위로 모은다. 캡션과 표는 본문 리듬이 아니므로 뺀다.
    order, bysec = [], {}
    for sec, p in paras:
        if sec.startswith("캡션") or sec.startswith("표 "):
            continue
        for s in split_sent(p):
            if s.startswith("|") or s.startswith("**표") or s.startswith("**그림"):
                continue
            if sec not in bysec:
                bysec[sec] = []
                order.append(sec)
            bysec[sec].append(s)

    want = None
    if "--sec" in sys.argv:
        want = sys.argv[sys.argv.index("--sec") + 1]

    if want:
        for sec in order:
            if not sec.startswith(want):
                continue
            print("### %s ###\n" % sec)
            for i, s in enumerate(bysec[sec], 1):
                print("%2d [%-6s] %s" % (i, func(s), s[:110]))
            return
        sys.exit("그런 절이 없다: %s" % want)

    print("종결 기능 쏠림 — %s" % os.path.basename(SRC))
    print("기능 넷으로 묶어 절마다 가장 많은 기능의 비율과 최장 연속을 센다.")
    print("연속은 문단 경계를 넘어서도 잇는다 — 독자는 문단 경계에서 박자를 새로 세지 않는다.\n")
    print("%-*s %4s %5s %5s %-20s %s" % (LABEL_W, "절", "문장", "최다", "연속", "쏠림", "등급"))
    print("-" * 88)

    rows = []
    for sec in order:
        ss = bysec[sec]
        n = len(ss)
        fs = [func(s) for s in ss]
        cnt = {}
        for f in fs:
            cnt[f] = cnt.get(f, 0) + 1
        top, topn = max(cnt.items(), key=lambda kv: kv[1])
        # 「당위」와 「가능·난이」는 세는 자리는 달라도 독자에게는 한 박자로 들린다
        # — 둘 다 단정을 피하는 종결이다. 2장이 그 예다(2026-09-10 소유자 지적).
        hedge = cnt.get("당위", 0) + cnt.get("가능·난이", 0)
        if hedge > topn:
            top, topn = "당위+가능", hedge
        # 최장 연속. 당위와 가능이 번갈아 와도 한 박자이므로 묶어서 센다.
        merged = ["당위+가능" if f in ("당위", "가능·난이") else f for f in fs]
        longest, run, prev = 1, 1, None
        for f in merged:
            if f == prev:
                run += 1
                longest = max(longest, run)
            else:
                run, prev = 1, f
        ratio = topn / n
        rows.append((sec, n, top, topn, ratio, longest))

    for sec, n, top, topn, ratio, longest in rows:
        g = grade(ratio, longest, n)
        mark = "  " if g in ("노랑", "—") else "**"
        print("%s%-*s %4d %5s %5d %-20s %s"
              % (mark, LABEL_W - 2, sec[:LABEL_W - 2], n,
                 "%d/%d" % (topn, n), longest, bar(ratio), g))

    print("\n한 줄 요약")
    hard = [r for r in rows if grade(r[4], r[5], r[1]).startswith("빨강")]
    hard.sort(key=lambda r: (-r[4], -r[5]))
    for sec, n, top, topn, ratio, longest in hard:
        print("  %-*s %d문장 중 %d개가 «%s» · 최장 %d연속"
              % (LABEL_W, sec[:LABEL_W], n, topn, top, longest))
    if not hard:
        print("  빨강 없음")

    tot = sum(r[1] for r in rows)
    allf = {}
    for sec in order:
        for s in bysec[sec]:
            f = func(s)
            allf[f] = allf.get(f, 0) + 1
    print("\n원고 전체 %d문장" % tot)
    for f, c in sorted(allf.items(), key=lambda kv: -kv[1]):
        print("  %-8s %4d  %5.1f%%  %s" % (f, c, 100.0 * c / tot, bar(c / tot)))


if __name__ == "__main__":
    main()
