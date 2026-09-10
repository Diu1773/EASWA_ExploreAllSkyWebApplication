# -*- coding: utf-8 -*-
"""원고의 문장·문체·빈도를 재서 어디를 손볼지 짚는다 (2026-09-09).

고치지 않는다. 세고 위치만 알려 준다 — 문장은 소유자가 쓴다(논문 고정문서).

  python -X utf8 docs/check_style_freq.py            # 요약
  python -X utf8 docs/check_style_freq.py --full     # 예문까지

재는 것
  · 문장 길이 분포와 긴 문장
  · 종결 표현 쏠림과 같은 종결이 잇달아 오는 자리
  · 번역투·AI 관용구 (humanize-korean 의 ai-tell-taxonomy v2 에서 옮겼다)
  · 되풀이되는 어절 뭉치 (3~5 어절)
  · 쉼표 — KatFish 코퍼스(인간 470편 vs LLM 1,624편) 실측과 견준다
"""
import io
import re
import sys
from collections import Counter, defaultdict

SRC = "C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos/EASWA_논문_v17.md"
FULL = "--full" in sys.argv

# KatFish 코퍼스 실측값 (humanize-korean references/baseline.json v1.6, essay)
KATFISH = {
    "쉼표를 가진 문장 비율": (26.31, 61.03, "%"),
    "문장당 쉼표 수": (1.13, 2.56, "개"),
    "쉼표 구간 길이": (4.35, 8.56, "어절"),
    "연결어미 뒤 쉼표 비율": (4.10, 19.83, "%"),
}

# 문두 접속어. 「다만·이때·이에·그런데」를 빼 두면 실제의 3분의 2만 세어진다
# (2026-09-09: 23곳으로 보고했으나 실제로는 36곳이었다).
CONJ = ["그리고", "그러나", "하지만", "또한", "따라서", "그러므로", "또", "한편",
        "반면", "다만", "이때", "이에", "그런데", "즉", "특히", "결국"]
CONJ_RX = r"^(?:%s)(?=[\s,])" % "|".join(CONJ)

# 어미 뭉치 — 낱말이 달라도 같은 어미면 한 덩어리로 본다
END_FAMILY = ["하였다", "되었다", "이었다", "있었다", "였다", "한다", "된다", "이다",
              "있다", "없다", "않았다", "않는다", "았다", "었다", "겠다"]

PATTERNS = [
    ("A-1  ~에 대한/대하여", r"에 (?:대한|대하여|대해서|대해)\b"),
    ("A-2  ~를 통해/통하여", r"(?:을|를) 통(?:해|하여|한)\b"),
    ("A-3  ~에 있어(서)", r"에 있어(?:서)?\b"),
    ("A-4  ~라는 점에서", r"(?:라|다)는 점에서"),
    ("A-5  ~와 관련하여", r"와 관련(?:하여|된|해)"),
    ("A-6  ~을 바탕으로", r"(?:을|를) 바탕으로|에 기반하(?:여|은)"),
    ("A-7  가지고 있다", r"가지고 있"),
    ("A-8  이중 피동", r"(?:되어지|지게 되)"),
    ("A-9  ~에 의해 피동", r"에 의(?:해|하여)\b"),
    ("A-10 ~할 수 있다", r"수 있(?:다|다는|으며|고|어|는|을)"),
    ("A-11 ~을 위해", r"(?:을|를) 위(?:해|하여|한)\b"),
    ("A-12 만들어지다/이루어지다", r"(?:만들어지|이루어지)"),
    ("A-15 추상 주어 + 만능 동사", r"(?:이는|이것은|그것은)\s.{0,24}(?:의미한다|보여준다|시사한다)"),
    ("A-20 ~되고 있다", r"(?:되고|지고) 있"),
    ("A-21 단순한 X를 넘어", r"(?:단순한|단순히)\s.{0,20}(?:넘어|아니라)"),
    # 「A가 아니라 B」와 「~것은 아니다」는 같은 버릇이다. 앞엣것만 세면 절반을 놓친다
    # (2026-09-09: 12곳으로 보고했으나 실제로는 20곳이었다).
    ("C-8  아니라/아니다 한정", r"(?:이|가|은|는|것이|것은) 아니(?:라|며|고|다)"),
    ("C-11 연결어미 뒤 쉼표", r"(?:하고|하며|하지만|이며|이지만|되고|되며|으며|지만),"),
    ("D-1  종결·요약류", r"(?:요컨대|결론적으로|정리하면|종합하면|요약하면)"),
    ("D-2  의의·중요성 과장", r"(?:중요한 의미를|의의가 크|핵심적인 역할)"),
    ("D-9  결국 ~로 이어진다", r"(?:결국|궁극적으로)\s.{0,30}(?:이어진다|귀결)"),
    ("D-11 향후·앞으로", r"(?:향후|앞으로|중장기적)"),
    ("D-12 과제도 남아 있다", r"과제(?:도|가) 남아"),
    ("접속어 문두", CONJ_RX),
    ("F-1  정도부사", r"(?:매우|상당히|훨씬|크게|특히|보다 더|매우도)"),
    ("F-5  ~적 N 체인", r"[가-힣]적\s[가-힣]+적\s"),
    ("F-7  범용 정책동사", r"(?:확대하|강화하|개선하|제고하|모색하)"),
    ("G-1  추측형 종결", r"(?:것으로 보인다|것으로 판단된다|로 보인다|것으로 여겨진다)"),
    ("G-3  안전 균형말", r"(?:균형|조화롭게|적절히|적절한 수준)"),
    ("H-2  하지만/그러나 혼용", r"^(?:하지만|그러나)"),
    ("H-3  이는 ~", r"^이는\s"),
    ("H-4  즉", r"(?:^|\s)즉[,\s]"),
    ("I-1  것이다 종결", r"것이다\.?$"),
    ("I-3  ~라는 것", r"(?:라|다)는 것"),
    ("I-4  ~할 필요가 있다", r"(?:ㄹ|을) 필요가 있"),
    ("I-5  ~이 필요하다", r"(?:이|가) 필요하"),
    # 관찰 뒤에 「이는 …임을 보여준다」·「…와 연결된다」를 붙이는 마무리 꼴.
    # 어간만 잡으면 「~와 연결하여」 같은 동사가 섞인다(F-318). 어미까지 못 박는다.
    # 「같은 맥락에서 볼 수 있다」·「같은 방향이다」도 같은 꼴이다. 좁게 잡으면
    # 고친 뒤에 0 이 나와 다 없앤 것처럼 보인다(2026-09-10, 5.2 를 고치고 확인).
    ("마무리 꼴 — 문헌·의미로 잇기",
     r"(?:와|과)\s*(?:연결된다|연결할 수 있다|맞닿아|관련된다|같은 방향이다|같은 맥락)"
     r"|(?:을|를|음을|점을|것을)\s*(?:보여준다|시사한다)"
     r"|볼 수 있다\.?$|설명할 수 있다\.?$"),
    ("J-3  대시(—) 삽입", r"—"),
    # 인용 괄호((Wenger et al., 2000)·(3.5)·(표 7))는 부연이 아니므로 뺀다.
    ("J-4  괄호 부연(인용 제외)",
     r"\((?![^)]*(?:19|20)\d\d)(?![^)]*et al)(?![^)]*\d\.\d)[^)]{12,}\)"),
]

ASCII_ONLY = re.compile(r"^[A-Za-z0-9 ,.:;()&/-]+$")


def sections(md, caps=True):
    """(절 이름, 문단) 목록. 참고문헌·부록·영문초록·표는 뺀다.

    캡션도 사람이 읽는 문장이라 함께 센다. 빼 두었더니 그림 3 캡션의 「천체명이나
    좌표가 아니라」가 본문에서 다 걷힌 뒤에도 남아 있었다(2026-09-10).
    """
    cur, out, on = "표제부", [], False
    for ln in md.replace("\r\n", "\n").split("\n"):
        s = ln.strip()
        m = re.match(r"^#{1,4}\s+(.*)$", s)
        if m:
            cur = m.group(1).strip()
            on = not (cur.startswith("참고문헌") or cur.startswith("부록")
                      or cur in ("Abstract", "ABSTRACT"))
            continue
        if not on or not s or s.startswith("|") or s.startswith("![") or s == "---":
            continue
        if s.startswith("*교신저자"):
            continue
        if re.match(r"^\*\*(표|그림)\s", s):
            if not caps:
                continue
            cur = "캡션 " + re.sub(r"^\*\*((?:표|그림) \d+)\..*$", r"\1", s)
        if ASCII_ONLY.match(s):
            continue
        out.append((cur, re.sub(r"\*\*(.+?)\*\*", r"\1", s)))
    return out


def split_sent(p):
    """마침표로 문장을 나눈다.

    「다.」만 보고 자르면 인용으로 끝나는 문장(…였다(조훈·손정주, 2022).)이 앞뒤로
    붙어 한 문단이 통째로 한 문장이 된다(2026-09-09, 113어절로 잡혔다). 마침표 뒤가
    한글·대문자·숫자면 자르되 et al. 과 소수점·절 번호는 지킨다.

    숫자로 시작하는 다음 문장(「2022 개정 …」·「1차 결과에서 …」)까지 넣어야 한다.
    빼 두었을 때 47·51어절짜리 긴 문장 둘이 헛것으로 잡혔다(2026-09-09).
    """
    t = re.sub(r"(?<=[A-Za-z])\.(?=\s)", "\x00", p)
    t = re.sub(r"(?<=\d)\.(?=\d)", "\x01", t)
    return [x.replace("\x00", ".").replace("\x01", ".").strip()
            for x in re.split(r"(?<=\.)\s+(?=[가-힣A-Z(0-9])", t) if x.strip()]


def ending(s):
    s = re.sub(r"\([^)]*\)\s*$", "", s.rstrip("."))
    m = re.search(r"(\S{2,6})$", s)
    return m.group(1) if m else s[-4:]


def nested_left(s):
    """관형구 3중 이상 좌향 수식."""
    return len(re.findall(
        r"(?:하|되|이|있|없|같)는 \S+ (?:하|되|이|있|없|같)는 \S+ (?:하|되|이|있|없|같)는 ", s))


def end_family(s):
    t = re.sub(r"\([^)]*\)\s*$", "", s.rstrip(".")).strip()
    for k in END_FAMILY:
        if t.endswith(k):
            return k
    return t[-3:]


def humanize_report(sents):
    """되풀이·접속어·끝 단어·「아니라」 네 가지를 자리까지 다 찍는다."""
    n = len(sents)

    print("[가] 접속어 — 문장 첫머리")
    cnt, where = Counter(), defaultdict(list)
    for sec, s in sents:
        m = re.match(CONJ_RX, s)
        if m:
            w = m.group(0)
            cnt[w] += 1
            where[w].append(sec)
    print("    모두 %d곳 · 문장 %d개당 1회" % (sum(cnt.values()), round(n / max(1, sum(cnt.values())))))
    for w, c in cnt.most_common():
        print("    %-6s %2d회  %s" % (w, c, " · ".join(sorted(set(x[:14] for x in where[w])))))

    print("\n[나] 문구 끝 단어")
    fam = Counter(end_family(s) for _, s in sents)
    print("    어미 뭉치 (낱말이 달라도 같은 어미면 한 덩어리)")
    for e, c in fam.most_common(8):
        print("      %-8s %3d회 (%.1f%%)" % (e, c, 100.0 * c / n))
    ends = Counter(ending(s) for _, s in sents)
    print("    낱말 그대로 — %d가지 · 상위 8" % len(ends))
    for e, c in ends.most_common(8):
        print("      %-10s %3d회 (%.1f%%)" % (e, c, 100.0 * c / n))
    print("    같은 끝 단어가 3문장 이상 잇달아")
    run, prev, start = 1, None, 0
    found = 0
    for i, (sec, s) in enumerate(sents + [("", "")]):
        e = ending(s) if s else None
        if e == prev:
            run += 1
            continue
        if run >= 3 and prev:
            found += 1
            print("      %d연속 [%s] · %s" % (run, prev, sents[start][0][:26]))
            for j in range(start, start + run):
                print("          %s" % sents[j][1][:68])
        run, prev, start = 1, e, i
    if not found:
        print("      없음")

    print("\n[다] 되풀이되는 말")
    grams = Counter()
    for _, s in sents:
        w = s.split()
        for k in (3, 4, 5, 6):
            for i in range(len(w) - k + 1):
                grams[" ".join(w[i:i + k])] += 1
    cand = [(c, g) for g, c in grams.items() if c >= 3 and len(g) >= 9]
    cand.sort(key=lambda t: (-len(t[1].split()), -t[0]))
    keep = []
    for c, g in cand:
        if any(g in k and c <= kc for kc, k in keep):
            continue
        keep.append((c, g))
    print("    어절 뭉치 (3회 이상)")
    for c, g in sorted(keep, reverse=True)[:20]:
        print("      %2d회  %s" % (c, g))
    head = Counter(" ".join(s.split()[:2]) for _, s in sents)
    print("    문장 첫머리 (3회 이상)")
    for g, c in head.most_common(12):
        if c >= 3:
            print("      %2d회  %s ..." % (c, g))

    print("\n[라] 「A가 아니라 B」 · 「~것은 아니다」")
    rx = re.compile(r"(?:이|가|은|는|것이|것은) 아니(?:라|며|고|다)")
    hit = [(sec, s, rx.search(s)) for sec, s in sents if rx.search(s)]
    print("    모두 %d곳 · 문장 %d개당 1회" % (len(hit), round(n / max(1, len(hit)))))
    for sec, s, m in hit:
        a = s[max(0, m.start() - 30):m.start()]
        b = s[m.end():m.end() + 34]
        print("      %-20s ...%s 아니%s..." % (sec[:20], a, b))


def against_baseline(paras, sents):
    """실측 기준값과 견준다.

    출처는 humanize-korean 의 ai-tell-taxonomy v2 에 적힌 대조 실측이다. 기준 코퍼스는
    칼럼·에세이·위키이고 학술 논문이 아니다 — 학술문은 「따라서」가 논리 연결자로 쓰이고
    열거가 많아 쉼표도 많다. 그래서 밀도보다 각 항목이 정한 «처방 역치»를 함께 본다.
    """
    n = len(sents)
    eo = sum(len(s.split()) for _, s in sents)
    print("\n[마] 실측 기준값과 견줌 — 문장 %d · 어절 %d" % (n, eo))
    print("     기준 코퍼스는 칼럼·에세이·위키다. 학술 논문 기준선은 없다.")

    h1 = ("또한", "따라서", "즉", "나아가", "아울러", "게다가", "더욱이")
    c = sum(1 for _, s in sents if s.startswith(h1))
    dense = sum(1 for _, p in paras
                if sum(1 for s in split_sent(p) if s.startswith(h1)) >= 3)
    print("\n  H-1 문두 접속사   %5.2f/천어절   사람 0.43 · gpt 0.83 · haiku 6.85"
          % (1000.0 * c / eo))
    print("      처방 역치는 «한 문단 3회 이상»인 문단만 — %d개" % dense)

    rx = re.compile(r"(?:이|가|은|는|것이|것은) 아니(?:라|며|고|다)")
    c8 = sum(1 for _, s in sents if rx.search(s))
    chain = 0
    for sec, p in paras:
        ss = split_sent(p)
        chain += sum(1 for i in range(len(ss) - 1)
                     if rx.search(ss[i]) and rx.search(ss[i + 1]))
    print("\n  C-8 부정 대구     %5.2f/천어절   인간 0.6 · AI 5.8 (9.2배 차)"
          % (1000.0 * c8 / eo))
    print("      결정타는 출현 수가 아니라 «연쇄»다 — 인접 두 문장이 모두 대구인 곳 %d" % chain)

    print("\n  H-4 「즉」         %d회          기준 문서당 2회 이하"
          % sum(1 for _, s in sents if s.startswith("즉")))

    lg = sum(1 for _, s in sents if len(s) >= 100)
    print("\n  E-1 100자+ 장문   %5.1f/천문장   인간 91.3 · AI 8.1 (많을수록 사람)"
          % (1000.0 * lg / n))

    k = []
    for sec, p in paras:
        ss = split_sent(p)
        run, prev = 1, None
        for s in ss + [""]:
            e = end_family(s) if s else None
            if e == prev:
                run += 1
                continue
            if run >= 4 and prev:
                k.append((run, prev, sec))
            run, prev = 1, e
    print("\n  E-2 같은 종결어미  %d곳          기준 «한 문단 4문장 이상 연속»" % len(k))
    for r, e, sec in k:
        print("      %d연속 [%s] · %s" % (r, e, sec[:30]))

    h3 = sum(1 for _, p in paras
             if sum(1 for s in split_sent(p)
                    if s.startswith(("이는 ", "이 점에서", "이 관점에서", "이 말은"))) >= 3)
    print("\n  H-3 「이는 ~」      %d개          기준 «한 문단 3회 이상»인 문단" % h3)


def main():
    md = io.open(SRC, encoding="utf-8").read()
    paras = sections(md)
    sents = [(sec, s) for sec, p in paras for s in split_sent(p)]
    n = len(sents)
    if "--humanize" in sys.argv:
        print("문체 검사 (되풀이·접속어·끝 단어·대구) — 문장 %d개\n" % n)
        humanize_report(sents)
        against_baseline(paras, sents)
        return
    print("원고 %s" % SRC)
    print("문단 %d · 문장 %d · 글자 %d\n"
          % (len(paras), n, sum(len(s) for _, s in sents)))

    lens = [len(s.split()) for _, s in sents]
    lens_s = sorted(lens)
    mu = sum(lens) / n
    sd = (sum((x - mu) ** 2 for x in lens) / n) ** 0.5
    print("[1] 문장 길이 (어절)")
    print("    평균 %.1f · 중앙값 %d · 아래 사분 %d · 위 사분 %d · 최장 %d"
          % (mu, lens_s[n // 2], lens_s[n // 4], lens_s[3 * n // 4], lens_s[-1]))
    print("    표준편차 %.1f · 변동계수 %.2f  (0.4 아래면 리듬이 고르다 = E-1 신호)"
          % (sd, sd / mu))
    pl = [len(split_sent(p)) for _, p in paras]
    pc = Counter(pl)
    print("    문단당 문장 수: 평균 %.1f · 분포 %s"
          % (sum(pl) / len(pl), " ".join("%d문장×%d" % (k, v)
                                         for k, v in sorted(pc.items())[:8])))
    longs = sorted(((l, sec, s) for l, (sec, s) in zip(lens, sents) if l >= 35),
                   reverse=True)
    print("    35어절 넘는 문장 %d개 (%.0f%%)" % (len(longs), 100.0 * len(longs) / n))
    for l, sec, s in longs[:12 if FULL else 6]:
        print("      %2d어절 · %-22s %s..." % (l, sec[:22], s[:48]))

    ends = Counter(ending(s) for _, s in sents)
    print("\n[2] 종결 표현 — %d가지, 상위 8개가 전체의 %.0f%%"
          % (len(ends), 100.0 * sum(v for _, v in ends.most_common(8)) / n))
    for e, c in ends.most_common(10):
        print("    %-14s %3d회 (%.1f%%)" % (e, c, 100.0 * c / n))
    run, runs, prev, psec = 1, [], None, None
    for sec, s in sents:
        e = ending(s)
        if e == prev:
            run += 1
        else:
            if run >= 4:
                runs.append((run, prev, psec))
            run, prev, psec = 1, e, sec
    if run >= 4:
        runs.append((run, prev, psec))
    print("    같은 종결이 4문장 이상 잇달아: %d곳" % len(runs))
    for r, e, sec in sorted(runs, reverse=True)[:6]:
        print("      %d연속 [%s] · %s" % (r, e, (sec or "")[:28]))

    print("\n[3] 번역투·AI 관용구")
    hits = []
    for name, pat in PATTERNS:
        rx = re.compile(pat)
        per, c = defaultdict(list), 0
        for sec, s in sents:
            f = rx.findall(s)
            if f:
                c += len(f)
                per[sec].append(s)
        if c:
            hits.append((c, name, per))
    nl = sum(nested_left(s) for _, s in sents)
    if nl:
        hits.append((nl, "A-18 좌향 수식 3중", {}))
    for c, name, per in sorted(hits, reverse=True):
        top = sorted(per.items(), key=lambda kv: -len(kv[1]))[:3]
        where = " / ".join("%s %d" % (k[:18], len(v)) for k, v in top)
        print("    %-26s %3d회  문장 %d개당 1회  %s"
              % (name, c, round(n / c), where))
        if FULL and top:
            print("        예) %s..." % top[0][1][0][:72])

    print("\n[4] 되풀이되는 어절 뭉치 (3~5어절, 4회 이상)")
    grams = Counter()
    for _, s in sents:
        w = s.split()
        for k in (3, 4, 5):
            for i in range(len(w) - k + 1):
                grams[" ".join(w[i:i + k])] += 1
    # 긴 뭉치와 횟수가 같은 짧은 조각은 버린다 — 같은 되풀이를 여러 번 세지 않는다.
    cand = [(c, g) for g, c in grams.items() if c >= 4 and len(g) >= 8]
    cand.sort(key=lambda x: (-len(x[1].split()), -x[0]))
    keep = []
    for c, g in cand:
        if any(g in k and c <= kc for kc, k in keep):
            continue
        keep.append((c, g))
    for c, g in sorted(keep, reverse=True)[:20 if FULL else 12]:
        print("    %3d회  %s" % (c, g))

    with_c = sum(1 for _, s in sents if "," in s)
    ncom = sum(s.count(",") for _, s in sents)
    seg = [len(x.split()) for _, s in sents for x in s.split(",") if x.strip()]
    joined = " ".join(s for _, s in sents)
    endc = len(re.findall(
        r"(?:하고|하며|하지만|이며|이지만|되고|되며|으며|지만|어서|아서),", joined))
    mine = {
        "쉼표를 가진 문장 비율": 100.0 * with_c / n,
        "문장당 쉼표 수": ncom / n,
        "쉼표 구간 길이": sum(seg) / len(seg),
        "연결어미 뒤 쉼표 비율": 100.0 * endc / max(1, ncom),
    }
    print("\n[5] 쉼표 — KatFish 코퍼스(인간 470편 vs LLM 1,624편) 실측과 견줌")
    for k, (hu, ai, unit) in KATFISH.items():
        v = mine[k]
        side = "AI 값보다 높다" if v > ai else (
            "AI 쪽" if abs(v - ai) < abs(v - hu) else "사람 쪽")
        print("    %-22s 이 원고 %6.2f%-3s  사람 %.2f / AI %.2f  -> %s"
              % (k, v, unit, hu, ai, side))


if __name__ == "__main__":
    main()
