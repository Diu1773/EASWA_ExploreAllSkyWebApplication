# -*- coding: utf-8 -*-
"""한국어 과학교육 논문으로 문체 기준선을 만든다 (2026-09-09).

`humanize-korean` 이 들고 있는 실측 기준은 칼럼·에세이·위키 코퍼스다. 학술 논문은
「따라서」가 논리 연결자로 쓰이고 열거가 많아 쉼표도 많다. 소유자 지적 —
*「기준이 학술논문이 아니면 흠… 애매한데」*. 그래서 손에 있는 게재 논문으로 직접 잰다.

같은 잣대로 재기 위해 **우리 원고도 PDF 에서 같은 방식으로 뽑는다.** 원고만 md 에서
뽑으면 표·머리글 처리가 달라져 비교가 되지 않는다.

  python -X utf8 docs/build_style_baseline.py
  python -X utf8 docs/build_style_baseline.py --list     # 어떤 논문을 썼는지
"""
import glob
import io
import json
import os
import re
import statistics
import sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "문체기준선.json")

# 한국어 과학교육·천문교육 학술지 게재 논문. 시험지·과제·보고서·영어 논문은 뺀다.
ROOTS = [r"C:/Users/bmffr/Desktop/Research", r"C:/Users/bmffr/Desktop/Research/ERP2026"]
CORPUS = [
    "고등학교 천문학 수업에서 코딩을 활용한 데이터 기반 탐구활동의 활성화 방안 탐색.pdf",
    "데이터 사이언스를 적용한 H-R도 교사교육프로그램 개발.pdf",
    "데이터 리터러시 역량 강화를 위한 ‘가속팽창 우주’ 주제의 프로젝트 기반 OER 교육 프로그램 개발 노혜주, 손정주.pdf",
    "지식정보처리역량 함양을 위한 데이터 기반 과학탐구 모형 개발.pdf",
    "공공 데이터를 활용한 지구과학 탐구 활동 개발.pdf",
    "DSLR을 활용한 과학 영재 대상 천체 관측 R&E 프로그램 개발.pdf",
    "초등과학영재를 위한 원격천문대 시스템의 개발 및 적용.pdf",
    "WWT 빅데이터를 활용한 중학교 STEAM 프로그램 개발 및 적용.pdf",
    "별의 분광 분류를 주제로 한 관측 및 데이터 분석 교육 프로그램 개발.pdf",
    "외계행성탐사주제의프로젝트기반학습교사교육콘텐츠개발.pdf",
    "중학교 천문학 용어에 대한 학생의 오개념 유형 탐색.pdf",
    "윤진아 남윤경.pdf",
    "공병민2023.pdf",
]
MINE = r"C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos/EASWA_논문_v17_투고본_미리보기.pdf"

H1 = ("또한", "따라서", "즉", "나아가", "아울러", "게다가", "더욱이")
# 부정 대구는 두 꼴이다. 나눠서 세야 어느 쪽이 튀는지 보인다.
#   갈래 1 「A가 아니라 B」 — 부정하고 대신 B 를 내세운다
#   갈래 2 「~은 아니다」   — 부정으로 끝난다(한정·유보)
NEG = re.compile(r"(?:이|가|은|는|것이|것은)\s*아니(라|며|고|다)")


def neg_kinds(sents):
    a = b = 0
    for s in sents:
        m = NEG.search(s)
        if not m:
            continue
        if m.group(1) == "다" or len(s[m.end():].strip()) < 3:
            b += 1
        else:
            a += 1
    return a, b


ENDC = re.compile(r"(?:하고|하며|하지만|이며|이지만|되고|되며|으며|지만|어서|아서),")


def find(name):
    for r in ROOTS:
        p = os.path.join(r, name)
        if os.path.exists(p):
            return p
    hit = [x for r in ROOTS for x in glob.glob(os.path.join(r, "**", name), recursive=True)]
    return hit[0] if hit else None


def prose(path):
    """PDF 에서 한국어 본문 문장만 뽑는다.

    표·머리글·영문·참고문헌을 거르려고 세 조건을 모두 건다 — 「다.」로 끝나고,
    한글이 절반을 넘고, 다섯 어절 이상. 모든 문서에 같은 잣대를 쓴다.
    """
    import fitz
    d = fitz.open(path)
    txt = []
    for pg in d:
        t = pg.get_text()
        cut = t.find("참고문헌")
        txt.append(t[:cut] if cut > 200 else t)
    d.close()
    t = "\n".join(txt)
    t = re.sub(r"-\n", "", t)                       # 줄 끝 붙임표
    t = re.sub(r"\s*\n\s*", " ", t)                 # 줄바꿈을 한 칸으로
    t = re.sub(r"(?<=[A-Za-z])\.(?=\s)", "\x00", t)
    t = re.sub(r"(?<=\d)\.(?=\d)", "\x01", t)
    out = []
    for s in re.split(r"(?<=다\.)\s+", t):
        s = s.replace("\x00", ".").replace("\x01", ".").strip()
        if not s.endswith("다.") or len(s.split()) < 5:
            continue
        ko = len(re.findall(r"[가-힣]", s))
        if ko / max(1, len(s)) < 0.5:
            continue
        out.append(s)
    return out


def measure(sents):
    n = len(sents)
    if n < 40:
        return None
    eo = sum(len(s.split()) for s in sents)
    ka, kb = neg_kinds(sents)
    ncom = sum(s.count(",") for s in sents)
    seg = [len(x.split()) for s in sents for x in s.split(",") if x.strip()]
    return {
        "문장": n,
        "어절": eo,
        "평균 문장 길이(어절)": eo / n,
        "문두 접속사(천어절당)": 1000.0 * sum(1 for s in sents if s.startswith(H1)) / eo,
        "부정 대구(천어절당)": 1000.0 * (ka + kb) / eo,
        "  ├ A가 아니라 B(천어절당)": 1000.0 * ka / eo,
        "  └ ~은 아니다(천어절당)": 1000.0 * kb / eo,
        "100자+ 문장(천문장당)": 1000.0 * sum(1 for s in sents if len(s) >= 100) / n,
        "「이는 ~」(천문장당)": 1000.0 * sum(1 for s in sents if s.startswith("이는 ")) / n,
        "쉼표를 가진 문장(%)": 100.0 * sum(1 for s in sents if "," in s) / n,
        "문장당 쉼표": ncom / n,
        "쉼표 구간 길이(어절)": sum(seg) / max(1, len(seg)),
        "연결어미 뒤 쉼표(%)": 100.0 * len(ENDC.findall(" ".join(sents))) / max(1, ncom),
    }


def main():
    rows, missing = {}, []
    for name in CORPUS:
        p = find(name)
        if not p:
            missing.append(name)
            continue
        m = measure(prose(p))
        if m:
            rows[os.path.splitext(name)[0][:38]] = m
        else:
            missing.append(name + " (문장 40개 미만)")

    mine = measure(prose(MINE))
    keys = [k for k in mine if k not in ("문장", "어절")]

    if "--list" in sys.argv:
        print("기준선 논문 %d편" % len(rows))
        for k, v in rows.items():
            print("  %-40s 문장 %4d · 어절 %5d" % (k, v["문장"], v["어절"]))
        if missing:
            print("\n못 찾은 것 %d: %s" % (len(missing), " / ".join(missing)))
        return

    print("한국어 과학교육 논문 %d편으로 만든 기준선" % len(rows))
    print("모든 문서에 같은 잣대 — PDF 본문에서 「다.」로 끝나고 한글이 절반 넘는")
    print("다섯 어절 이상 문장만. 참고문헌은 잘랐다.\n")
    print("%-24s %8s %8s %8s   %8s  %s" % ("지표", "최소", "중앙값", "최대", "이 원고", "자리"))
    print("-" * 84)
    res = {}
    for k in keys:
        vals = sorted(v[k] for v in rows.values())
        lo, mid, hi = vals[0], statistics.median(vals), vals[-1]
        v = mine[k]
        below = sum(1 for x in vals if x < v)
        pct = 100.0 * below / len(vals)
        mark = "범위 안" if lo <= v <= hi else ("최대보다 높다" if v > hi else "최소보다 낮다")
        print("%-24s %8.2f %8.2f %8.2f   %8.2f  %3.0f%% 지점 · %s"
              % (k, lo, mid, hi, v, pct, mark))
        res[k] = {"min": lo, "median": mid, "max": hi, "mine": v, "percentile": pct}

    io.open(OUT, "w", encoding="utf-8").write(json.dumps(
        {"corpus": list(rows), "n": len(rows), "metrics": res, "papers": rows},
        ensure_ascii=False, indent=1))
    print("\n기준선 %d편 · %s" % (len(rows), OUT))
    if missing:
        print("못 찾은 것: %s" % " / ".join(missing))


if __name__ == "__main__":
    main()
