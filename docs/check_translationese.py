# -*- coding: utf-8 -*-
"""영어 번역체를 잡는다 (2026-09-12).

소유자가 되풀이해 짚은 문장들에서 규칙을 뽑았다. `check_style_freq.py` 의
A-15 는 「이는 … 의미한다」 한 꼴만 봐서 하나도 걸리지 않았다.

    python -X utf8 docs/check_translationese.py            # 요약
    python -X utf8 docs/check_translationese.py --full     # 문장 전부
    python -X utf8 docs/check_translationese.py --검증     # 소유자가 짚은 문장으로 시험

공통점은 하나다 — **사람이나 사물이 아니라 개념이 주어 자리에 앉고, 술어가
범용 동사로 끝난다.** 영어의 "The scope of X is limited to Y" 를 옮기면
「X의 적용 범위는 Y에 한정된다」가 된다. 한국어 논문은 「X는 Y까지만 확인하였다」
쪽으로 쓴다.

고치지 않는다. 세고 자리만 알려 준다 — 문장은 소유자가 쓴다.
"""
import io
import os
import re
import sys
import os as _os
sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))

BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
from paper_config import CFG   # noqa: E402
SRC = CFG.원고("마크다운")
FULL = "--full" in sys.argv
VERIFY = "--검증" in sys.argv or "--verify" in sys.argv

# 개념·추상을 가리키는 말. 이것이 주어 자리에 오면 후보다.
ABSTRACT = ("범위", "핵심", "결과", "요구", "설계", "응답", "구성", "방식", "구조",
            "내용", "특성", "의미", "경향", "차이", "간극", "조정", "지원", "순서",
            "흐름", "기능", "활동", "과업", "조건", "수준", "점", "것", "일", "부분",
            "문항", "지점", "기준", "값", "자료", "정보", "사례", "관계", "영향")
# 영어 light verb 를 옮긴 술어. 주어가 개념일 때 특히 걸린다.
LIGHT = ("된다", "된다.", "이다", "이었다", "한정된다", "남았다", "나타났다", "보였다",
         "가리킨다", "남긴다", "이루어졌다", "이루어진다", "요구되었다", "요구된다",
         "확인되었다", "드러났다", "제기하였다", "지닌다", "갖는다", "띤다")

# 게재 논문 11편 2,702문장에서 잰 값 (백 문장당). 2026-09-12 측정.
# 「몇 건」은 판정이 아니다 — 기준선과 견주어야 결함인지 알 수 있다. T4 를 25건이라
# 가장 큰 문제로 올렸다가 기준선이 더 높은 것을 확인하고 물렸다(OPERATOR C-236).
BASELINE = {"T1": 0.1, "T2": 0.2, "T3": 0.0, "T4": 7.3,
            "T5": 1.7, "T6": 0.0, "T7": 0.6, "T8": 0.1}

RULES = [
    # T1 개념이 주어 + 범용 술어로 끝난다
    ("T1 개념 주어 + 범용 술어",
     r"(?:^|(?<=\s))[^ .]{0,14}(?:%s)(?:은|는),?\s[^.]{0,130}(?:이 된다|가 된다|한정된다|남았다|"
     r"나타났다|보였다|가리킨다|남긴다|이루어졌다|이루어진다|요구되었다|드러났다|쓰인다)\."
     % "|".join(ABSTRACT)),
    # T2 개념을 계사로 정의한다 — 「~은 ~이다」
    ("T2 계사 정의문",
     r"(?:^|(?<=\s))[^ .]{0,18}(?:%s)(?:은|는)\s[^.]{0,60}(?:이다|이었다|순서이다|점이다|간극이었다)\."
     % "|".join(ABSTRACT)),
    # T3 명사화 술어 — 「~ㄹ 것은 …ㄹ지다」·「~할 부분은 ~해야 한다」
    ("T3 명사화 술어",
     r"(?:할|정할|남길|고를|설명할)\s*(?:것은|부분은|일은)[^.]{0,44}(?:지다|것이다|해야 한다|이다)\."),
    # T4 서로 다른 주어를 연결어미로 잇는다
    ("T4 주어 둘을 연결어미로 접합",
     r"[^.]{4,60}(?:은|는)\s[^.]{0,60}(?:하며|으며|이며|하고|는데|한데)\,?\s[^.]{4,60}(?:은|는)\s[^.]{0,60}\."),
    # T5 부정으로 한정한다
    ("T5 부정 한정",
     r"(?:(?:은|는|이|가)\s*아니(?:다|었다|라)|아니라)"),
    # T6 인용·행위를 범용 동사로 옮긴다
    ("T6 범용 동사 술어",
     r"(?:(?:으로|로)\s*들었다|화면에 남[긴는]|같은 방향을 가리킨|방식으로 이루어[졌지]|"
     r"필요를 제기하|인식으로 해석하|자료로 해석하[였]|것으로 해석하)"),
    # T7 「~에 대한/관한 N」이 주어로 온다
    ("T7 「~에 대한 N은」 주어",
     r"[^.]{0,30}에\s*(?:대한|관한)\s[^ .]{1,12}(?:은|는|도)\s[^.]{0,50}\."),
]

# 소유자가 실제로 짚은 문장들. 규칙이 이것을 잡는지로 검증한다.
FLAGGED = [
 ("학습 활동을 미리 담아 둔 교육 지향 환경은 사례분석의 대상이 아니었다.", "T5"),
 ("도구가 학습에 미친 효과는 이 자료로 판단할 수 없다.", "T8"),
 ("지원이 모자라면 수행이 끊기고 지나치면 학습자의 사고를 대신한다는 도움의 딜레마에서, "
  "이 설계가 정할 것은 어느 쪽을 줄이고 어느 쪽을 남길지다.", "T3"),
 ("EASWA의 세 모듈이 공유하는 핵심은 실제 자료를 학교 탐구로 조직하는 순서이다.", "T2"),
 ("실제 수업에서는 화면 안내와 함께 선수 개념, 차시 운영, 교사의 설명 준비도 필요한데, "
  "차시 운영에 대해서는 참여자들이 이미 응답을 냈다.", "T4"),
 ("세 모듈은 실제 자료를 학교 탐구로 조직하는 순서를 공유하며, "
  "본 연구에서 확인한 그 흐름의 적용 범위는 현재 구현한 세 모듈에 한정된다.", "T4"),
 ("시계열 영상, 다지점 광도곡선, 다수 천체 카탈로그처럼 서로 다른 자료 구조에서 "
  "같은 탐구 순서를 구현한 결과는, 다른 모듈에서도 같은 구조를 적용할 수 있는지 "
  "검토할 출발점이 된다.", "T1"),
 ("지원 수준은 학습자 수준과 수업 목표에 맞추되, 학습자가 직접 선택하고 설명할 부분은 "
  "유지해야 한다.", "T3"),
 ("Chinn과 Malhotra(2002)는 자료의 결함을 살피는 활동을 실제 탐구와 학교 탐구를 "
  "가르는 지점으로 들었다.", "T6"),
 ("EASWA는 자동화된 처리에서도 그 단서를 화면에 남긴다.", "T6"),
 ("한 모듈에서 익힌 순서는 다음 모듈에서도 그대로 쓰인다.", "T1"),
 ("두 사용자 검토에서 학생 수준의 재구성과 영어·전문 용어가 두 집단 모두에서 "
  "많이 선택된 점도 같은 방향을 가리킨다.", "T6"),
 ("EASWA에서 그 조정은 자료 자체를 바꾸는 대신 접근 경로와 분석 절차를 "
  "학교 흐름에 맞추는 방식으로 이루어졌다.", "T6"),
 ("전문 용어와 그래프 해석에 대한 추가 지원 요구는 두 조사 모두에서 나타났다.", "T1"),
]


def sentences(text):
    out, buf = [], ""
    for tok in re.split(r"(\.)", text):
        buf += tok
        if tok == "." and re.search(r"(다|음|함)(\([^)]*\)|」|”)?\.$", buf.strip()):
            out.append(buf.strip()); buf = ""
    if buf.strip():
        out.append(buf.strip())
    return [x for x in out if len(x.split()) >= 3]


def tails(ss):
    """T8 — 긴 문장 뒤에 붙은 짧은 한정 문장.

    「…로 해석하였다. 도구가 학습에 미친 효과는 이 자료로 판단할 수 없다.」
    한 문장으로 쓸 것을 둘로 끊어 한정을 꼬리로 붙인 자리다.
    """
    # **못 하는 것**만 센다. 「~하지 않았다」는 연구자가 안 한 것을 밝히는 정상
    # 한계 진술이고 게재 논문에도 흔하다. 「~할 수 없다」는 능력 부정이라 한계 절에서
    # 주체가 흐려진다 — 소유자가 걸린 것도 그쪽이다(2026-09-12).
    LIMIT = re.compile(r"(수 없다|수는 없다|못한다|불가능하다)(\([^)]*\))?\.$")
    out = []
    for i, x in enumerate(ss):
        if i == 0:
            continue
        if len(x.split()) <= 12 and len(ss[i - 1].split()) >= 15 and LIMIT.search(x):
            out.append((ss[i - 1], x))
    return out


def scan(ss):
    hits = {}
    for name, pat in RULES:
        rx = re.compile(pat)
        hits[name] = [x for x in ss if rx.search(x)]
    hits["T8 짧은 한정 꼬리"] = [b for a, b in tails(ss)]
    return hits


def chapters(path):
    s = io.open(path, encoding="utf-8").read()
    out, cur = {}, None
    for ln in s.splitlines():
        m = re.match(r"^#{1,3}\s+(.*)", ln)
        if m:
            t = m.group(1).strip().lstrip("*# ")
            for pre, nm in (("Ⅰ", "1장"), ("1.", "1장"), ("Ⅱ", "2장"), ("2.", "2장"),
                            ("Ⅲ", "3장"), ("3.", "3장"), ("Ⅳ", "4장"), ("4.", "4장"),
                            ("Ⅴ", "5장"), ("5.", "5장"), ("Ⅵ", "6장")):
                if t.startswith(pre):
                    cur = nm
                    break
            out.setdefault(cur, [])
            continue
        if cur and ln.strip() and not ln.startswith(("|", "!", "- ", "**표", "**그림")):
            out[cur].append(ln.strip())
    return {k: sentences(" ".join(v)) for k, v in out.items() if k}


def verify():
    """소유자가 짚은 문장을 규칙이 잡는지 본다."""
    print("소유자가 짚은 문장 %d개로 시험한다.\n" % len(FLAGGED))
    ok = 0
    for text, want in FLAGGED:
        got = [n.split()[0] for n, pat in RULES if re.search(pat, text)]
        if want == "T8":
            got += ["T8"] if re.search(r"(수 없다|수는 없다|못한다)\.$", text) else []
        mark = "잡음" if want in got else "놓침"
        ok += want in got
        print("  [%s] %-4s %s" % (mark, want, text[:62]))
        if got and want not in got:
            print("         (대신 %s 로 걸림)" % "·".join(got))
    print("\n  %d / %d 잡음" % (ok, len(FLAGGED)))
    return ok


def main():
    if VERIFY:
        verify()
        return 0
    if not os.path.exists(SRC):
        sys.exit("원고가 없다 — %s" % SRC)
    ch = chapters(SRC)
    total = {n: 0 for n, _ in RULES}
    total["T8 짧은 한정 꼬리"] = 0
    per = {}
    for k in sorted(ch):
        h = scan(ch[k])
        per[k] = h
        for n, v in h.items():
            total[n] += len(v)
    names = [n for n, _ in RULES] + ["T8 짧은 한정 꼬리"]
    print("영어 번역체 — %s" % os.path.basename(SRC))
    print("개념이 주어 자리에 앉고 술어가 범용 동사로 끝나는 자리를 센다.\n")
    ns = sum(len(v) for v in ch.values())
    print("%-26s %5s %7s %7s  %s"
          % ("", "합계", "백문장당", "게재대비", "  ".join("%4s" % k for k in sorted(ch))))
    for n in names:
        key = n.split()[0]
        rate = 100.0 * total[n] / ns if ns else 0.0
        base = BASELINE.get(key)
        if base is None:
            mark = ""
        elif base < 0.05:
            mark = "—" if total[n] == 0 else "기준 0"
        else:
            mark = "%.1f배" % (rate / base)
        row = "  ".join("%4d" % len(per[k].get(n, [])) for k in sorted(ch))
        print("%-26s %5d %7.1f %7s  %s" % (n, total[n], rate, mark, row))
    print("\n  게재 논문 11편 2,702문장 기준선(백 문장당): %s"
          % " · ".join("%s %.1f" % (k, v) for k, v in BASELINE.items()))
    print("  문장 %d개 · 걸린 자리 %d" % (ns, sum(total.values())))
    if FULL:
        for k in sorted(ch):
            for n in names:
                for x in per[k].get(n, []):
                    print("  %-4s %-5s %s" % (k, n.split()[0], x[:100]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
