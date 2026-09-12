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

# 기능 묶음. 순서가 곧 우선순위다 — 「할 수 있었다」는 과거가 아니라 유보로 센다.
#
# 2026-09-13 에 어미 목록 방식을 버렸다. 게재 논문 25편 3,126문장을 재니 16.2% 가
# 「기타」로 빠졌고, 그 가운데 45건이 「나타났다·나타냈다」였다. 목록에 「았다」는 있는데
# 「났다」가 없어서다. **과거는 목록이 아니라 받침으로 가른다** — 한국어 과거 선어말어미
# -았/었/였- 의 종성은 언제나 ㅆ 이다(종성 인덱스 20). 「났다·졌다·겼다」가 한꺼번에 잡힌다.
#
# 다만 「있다·없다」도 종성이 ㅆ 이라 먼저 걸러야 한다. 「있었다」는 「었」이 받쳐 과거로 간다.
FUNCS = [
    ("당위", r"(?:어야 (?:한다|하며|하고|했다)|필요가 있다|필요하다|필요하였다"
             r"|중요하다|중요해진다|바람직하다|마땅하다)$"),
    # 단정을 피하는 종결은 한 묶음이다 — 가능·난이·추측이 독자에게 같은 망설임으로 들린다.
    ("유보", r"(?:수 있다|수 있었다|수 없다|수 없었다|수는 없다|수는 없었다"
            r"|수 있겠다|어렵다|어려웠다|쉽다|가능하다|가능하였다|가능해진다"
            r"|보인다|보였다|겠다|듯하다|것 같다)$"),
]
NOW_TAIL = ("한다", "된다", "이다", "아니다", "같다", "난다", "든다", "따른다", "받는다")

LABEL_W = 30


def _jong(ch):
    """한글 한 글자의 종성 인덱스. 20 이면 ㅆ."""
    if not ("가" <= ch <= "힣"):
        return -1
    return (ord(ch) - 0xAC00) % 28


def func(s):
    """문장 하나의 종결 기능. 괄호 주석은 떼고 본다."""
    t = re.sub(r"\([^)]*\)\s*$", "", s.rstrip(".")).strip()
    # PDF 에서 뽑으면 「수 있 다」·「나타 났다」처럼 낱말이 갈려 온다. 끝의 「다」를 붙인다.
    t = re.sub(r"\s+다$", "다", t)
    for name, pat in FUNCS:
        if re.search(pat, t):
            return name
    if not t.endswith("다"):
        return "기타"
    core = t[:-1]
    if core.endswith(("있", "없")):        # 있다·없다 — 존재. ㅆ 이지만 과거가 아니다
        return "현재 서술"
    if core and _jong(core[-1]) == 20:     # -았/었/였- 의 받침
        return "과거 보고"
    if t.endswith(NOW_TAIL):
        return "현재 서술"
    return "기타"


def bar(ratio, width=18):
    n = int(round(ratio * width))
    return "█" * n + "·" * (width - n)


# 게재 논문 267편에서 잰 값. 만든 것은 `_산출/리듬기준선.json`.
# 2026-09-13 에 손으로 매긴 등급을 버렸다. 그 역치(연속 5 이상 빨강)로 게재 논문을
# 재니 **96% 가 걸렸다.** 눈대중으로 「심하다」고 부른 자리가 실은 흔한 자리였다.
BASELINE = {
    "최장연속": {"p50": 9.0, "p75": 13.0, "p90": 17.0, "p95": 20.0, "p99": 32.0},
    "창쏠림":   {"p50": 0.80, "p75": 0.90, "p90": 0.95, "p95": 1.00, "p99": 1.00},
    "나열비율": {"p50": 5.85, "p75": 8.82, "p90": 14.00, "p95": 16.56, "p99": 23.81},
}


def where(kind, v):
    """게재 논문 분포에서 이 값이 놓이는 자리를 말로 돌려준다.

    등급이 아니라 위치다. 「빨강」이라고 부르면 사람은 결함으로 읽는데,
    p95 를 넘어도 게재 논문 다섯 편 중 하나는 그 자리에 있다.
    """
    b = BASELINE[kind]
    if v >= b["p99"]:
        return "상위 1%"
    if v >= b["p95"]:
        return "상위 5%"
    if v >= b["p90"]:
        return "상위 10%"
    if v >= b["p75"]:
        return "상위 25%"
    if v >= b["p50"]:
        return "중앙 위"
    return "중앙 아래"


def grade(top_ratio, longest, n):
    """옛 이름. 절 단위로는 기준선이 없으므로 문서 단위 위치만 돌려준다."""
    if n < 4:
        return "—"
    return where("최장연속", longest)


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
    print("연속은 문단 경계를 넘어서도 잇는다 — 독자는 문단 경계에서 박자를 새로 세지 않는다.")
    print()
    print("[ 이 검사가 재지 못하는 것 ]")
    print("  · AI 가 썼는지 아닌지. 잴 수 있는 것은 게재 논문 267편 분포의 어디에 놓이는가뿐이다.")
    print("    AI 가 쓴 국문 학술 논문을 모은 것이 없어 민감도는 모른다.")
    print("  · 절 단위 기준선. 아래 절별 자리는 문서 단위 분포를 갖다 댄 것이라 짧은 절일수록")
    print("    낮게 나온다. 판정에 쓸 것은 맨 아래 문서 전체 값이다.")
    print("  · 뜻이 맞는지. 종결이 고르다고 좋은 글이라는 뜻이 아니다.")
    print()
    print("%-*s %4s %5s %5s %-20s %s" % (LABEL_W, "절", "문장", "최다", "연속", "쏠림", "자리"))
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
        hedge = cnt.get("당위", 0) + cnt.get("유보", 0)
        if hedge > topn:
            top, topn = "당위+유보", hedge
        # 최장 연속. 당위와 가능이 번갈아 와도 한 박자이므로 묶어서 센다.
        merged = ["당위+유보" if f in ("당위", "유보") else f for f in fs]
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

    print("\n절 가운데 위쪽에 있는 것")
    hard = [r for r in rows if grade(r[4], r[5], r[1]).startswith("상위")]
    hard.sort(key=lambda r: (-r[5], -r[4]))
    for sec, n, top, topn, ratio, longest in hard[:8]:
        print("  %-*s %d문장 중 %d개가 «%s» · 최장 %d연속"
              % (LABEL_W, sec[:LABEL_W], n, topn, top, longest))
    if not hard:
        print("  없음")
    print("  주. 절 단위 기준선이 없어 문서 단위 분포를 갖다 댄 값이다. 판정에 쓰지 않는다.")

    # 종결과 같은 종류의 반복이 하나 더 있다 — 「A, B, C」 나열이 잦으면 독자는
    # 종결이 달라도 같은 박자를 듣는다(2026-09-10). 세 항 이상 든 문장을 센다.
    listy = []
    for sec in order:
        for x in bysec[sec]:
            c = len(re.findall(r"[가-힣A-Za-z0-9)]\s*[,·]\s*[가-힣A-Za-z(]", x))
            if c >= 3:
                listy.append((c, sec, x))
    allsent = sum(len(bysec[k]) for k in order)
    print("\n세 항 이상 나열 %d문장 (%.1f%%)   기준 «15%% 넘으면 잦다»"
          % (len(listy), 100.0 * len(listy) / allsent))
    for c, sec, x in sorted(listy, reverse=True)[:5]:
        print("  %2d항 · %-16s %s..." % (c, sec[:16], x[:52]))

    tot = sum(r[1] for r in rows)
    allf = {}
    for sec in order:
        for s in bysec[sec]:
            f = func(s)
            allf[f] = allf.get(f, 0) + 1
    print("\n원고 전체 %d문장" % tot)
    for f, c in sorted(allf.items(), key=lambda kv: -kv[1]):
        print("  %-8s %4d  %5.1f%%  %s" % (f, c, 100.0 * c / tot, bar(c / tot)))

    # 문서 단위 — 게재 논문 267편 분포와 곧바로 견줄 수 있는 유일한 자리다.
    allsents = [x for sec in order for x in bysec[sec]]
    fs = ["당위+유보" if func(x) in ("당위", "유보") else func(x) for x in allsents]
    longest = run = 1
    prev = None
    for f in fs:
        if f == prev:
            run += 1
            longest = max(longest, run)
        else:
            run, prev = 1, f
    win = 0.0
    for i in range(0, max(1, len(fs) - 19)):
        w = fs[i:i + 20]
        if len(w) < 10:
            break
        win = max(win, max(w.count(x) for x in set(w)) / len(w))
    lst = 100.0 * len(listy) / allsent
    print("\n문서 전체를 게재 논문 267편과 견주면")
    print("  %-20s %8s %8s   %s" % ("지표", "이 원고", "267편 중앙", "자리"))
    print("  " + "-" * 56)
    for nm, key, v in [("같은 기능 최장 연속", "최장연속", float(longest)),
                       ("20문장 창 최대 쏠림", "창쏠림", win),
                       ("세 항 이상 나열(%)", "나열비율", lst)]:
        print("  %-20s %8.2f %8.2f   %s"
              % (nm, v, BASELINE[key]["p50"], where(key, v)))
    print("  주. 셋을 곱해 판정하지 않는다. 지표끼리 상관이 있어 셋 다 상위 20% 인")
    print("      게재 논문이 21편(7.9%)이다 — 독립이면 0.8% 여야 한다.")


if __name__ == "__main__":
    main()
