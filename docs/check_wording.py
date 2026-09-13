# -*- coding: utf-8 -*-
"""문장을 다듬을 자리를 **어휘 층**에서 찾는다.

`check_cadence.py` 는 종결의 **박자**를 본다. 그래서 「떠안는다」와 「다룬다」를 똑같이
「기타」로 넣는다 — 둘 다 그 목록에 없어서다. 구어체를 잡은 것이 아니라 목록이 좁았던
것이고, 목록을 넓히면 구어체도 함께 통과한다(2026-09-13 확인).

**어휘는 어휘로 봐야 한다.** 여기서는 원고의 낱말이 같은 학술지 게재 논문 267편 가운데
몇 편에 나오는지를 센다. 사람이 「구어체 낱말 목록」을 짓지 않는다 — 지으면 지은 사람의
취향이 잣대가 된다.

**전문어를 잘못 짚지 않는 법.** 「반지름비」·「주연감광」도 코퍼스에 0편이다. 가르는 것은
**원고 안 되풀이 횟수**다. 그 논문의 용어는 여러 번 나오고, 문체가 튄 자리는 한 번 나온다.
그래서 원고에 세 번 이상 나오는 말은 짚지 않는다.

    python -X utf8 check_wording.py                한 편 전체
    python -X utf8 check_wording.py --sec 5.3      한 절만
    python -X utf8 check_wording.py --편수 5       역치를 바꿔서
"""
import collections
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paper_config import CFG                                  # noqa: E402
from check_style_freq import sections, split_sent             # noqa: E402

편수역치 = 3       # 게재 논문 이 편수 이하에만 나오는 말을 짚는다
원고역치 = 3       # 원고에 이만큼 이상 **어간이** 나오면 그 논문의 용어다

# 용언만 본다. 명사는 분야마다 달라 코퍼스에 없는 것이 정상이다.
YONG = re.compile(
    r"(?:다|며|면서|고|아서|어서|여서|지만|는데|도록|므로|으므로"
    r"|어야|아야|여야|는지|은지|을지|던|하여|되어|지고|진다|친다|킨다)$")

# **명사에 붙은 조사는 용언이 아니다.** 「아홉 배였고」·「중앙값 위였고」·「1차보다」가
# 위 그물에 걸린다. 서술격 조사 「이다」의 활용과 비교 조사 「보다」를 여기서 뺀다.
JOSA = re.compile(
    r"(?:(?:이|였|이었|이라)(?:다|며|고|지만|므로|라고|라는|던)"
    r"|뿐이었고|보다|처럼|만큼|밖에)$")

# 용언 뒤에 보조사가 붙으면 그물을 빠져나간다 — 「버티는지」는 걸리는데 「버티는지는」은
# 안 걸린다(2026-09-13, Liner 가 짚은 넷 가운데 하나를 이것 때문에 놓쳤다). 먼저 뗀다.
BOJO = re.compile(r"(?:는|은|도|만|까지|부터|조차|마저|라도|요)$")


def strip_josa(w):
    b = BOJO.sub("", w)
    return b if len(b) >= 2 and YONG.search(b) else w


def _jong_strip(ch):
    """받침을 뗀 글자. 「힌」→「히」, 「는」→「느」. 활용 앞머리를 되돌린다."""
    if not ("가" <= ch <= "힣"):
        return ch
    o = ord(ch) - 0xAC00
    if o % 28 == 0:
        return ch
    return chr(0xAC00 + (o // 28) * 28)


def stem_keys(w):
    """어간 근사 후보. 활용으로 둘째 글자 받침이 바뀌므로 뗀 꼴도 함께 본다."""
    out = {w[:2]}
    if len(w) >= 2:
        out.add(w[0] + _jong_strip(w[1]))
    return out


def stem_disp(w, S):
    """세어 준 뿌리 가운데 편수가 가장 많은 것. 「재확/재화」 둘 다 보지만 보여 줄 것은 하나다."""
    return max(stem_keys(w), key=lambda k: (S.get(k, 0), k == w[:2]))


def load_index():
    p = CFG.값("어휘색인", 필수=False) if hasattr(CFG, "값") else None
    if not p:
        p = os.environ.get("WORDING_INDEX") or \
            "C:/Users/bmffr/Desktop/Research/코퍼스_국문학술/_산출/어휘색인.json"
    if not os.path.exists(p):
        sys.exit("어휘 색인이 없다: %s\n  먼저 build_wording_index.py 를 돌린다." % p)
    return json.load(io.open(p, encoding="utf-8"))


def eojeols(s):
    return re.findall(r"[가-힣]{2,}", re.sub(r"\([^)]*\)", " ", s))


def main():
    a = sys.argv[1:]
    only = a[a.index("--sec") + 1] if "--sec" in a else None
    thr = int(a[a.index("--편수") + 1]) if "--편수" in a else 편수역치
    wide = "--낯선꼴" in a

    ix = load_index()
    F, S, N = ix["어절"], ix["어간"], ix["편수"]
    md = io.open(CFG.원고("마크다운"), encoding="utf-8").read()

    secs = list(sections(md, caps=False))
    # 원고 되풀이는 **어간으로** 센다. 「호출하고」·「호출한다」·「호출하여」는 한 말이다.
    manuscript = collections.Counter()
    for _, body in secs:
        for w in eojeols(body):
            manuscript.update(stem_keys(w))

    hits = []
    for title, body in secs:
        if only and not title.startswith(only):
            continue
        for s in split_sent(body):
            for raw in eojeols(s):
                w = strip_josa(raw)
                if not YONG.search(w) or JOSA.search(w):
                    continue                       # 용언만. 명사+조사는 뺀다
                if max(manuscript[k] for k in stem_keys(w)) >= 원고역치:
                    continue                       # 이 논문의 용어다
                f = F.get(w, 0)
                if f > thr:
                    continue
                st = max(S.get(k, 0) for k in stem_keys(w))
                # 뿌리도 드물면 낯선 말, 뿌리는 흔한데 이 꼴만 드물면 활용이 낯선 말이다.
                tier = "낯선 말" if st <= thr else "낯선 꼴"
                hits.append((title, s, raw, f, st, tier))

    print("문장 다듬을 자리 — %s" % os.path.basename(CFG.원고("마크다운")))
    print("게재 논문 %d편 가운데 %d편 이하에만 나오는 용언. 원고에 %d번 이상 쓴 말은 그 논문의"
          % (N, thr, 원고역치))
    print("용어로 보고 뺐다.\n")
    print("[ 이 검사가 재지 못하는 것 ]")
    print("  · 틀렸는지. 드문 말이 곧 나쁜 말은 아니다. 자리를 짚을 뿐 문안은 사람이 고른다.")
    print("  · 맞춤법. 「바까지만」 같은 오탈자는 코퍼스에도 없어 여기 섞여 나온다 — 그건 반갑다.")
    print("  · 이 학술지에 없는 분야의 말. 다른 학회지에 낼 것이면 그 학회지로 색인을 다시 만든다.\n")

    if not hits:
        print("  짚을 것이 없다.")
        return

    # 「낯선 꼴」은 267편에 견주니 42자리가 나왔고 그 대부분이 「정제하여」·「감소하지만」
    # 처럼 멀쩡한 학술어였다. 뿌리가 흔하면 활용이 드문 것만으로는 신호가 되지 않는다.
    # 기본에서 뺀다. 그래도 보려면 --낯선꼴.
    for want in (("낯선 말", "낯선 꼴") if wide else ("낯선 말",)):
      group = [h for h in hits if h[5] == want]
      if not group:
        continue
      print("═══ %s — %s (%d자리)" % (
          want,
          "뿌리째 게재 논문에 거의 없다" if want == "낯선 말"
          else "뿌리는 흔한데 이 활용꼴로는 안 쓴다",
          len(group)))
      cur = None
      for title, s, w, f, st, _ in group:
        if title != cur:
            print("── %s" % title)
            cur = title
        mark = "★" if f == 0 and st == 0 else " "
        body = s.strip()
        i = body.find(w)
        if i >= 0:
            lo, hi = max(0, i - 34), min(len(body), i + len(w) + 34)
            body = ("…" if lo else "") + body[lo:i] + "「" + w + "」" + \
                   body[i + len(w):hi] + ("…" if hi < len(body) else "")
        print("  %s %-10s 뿌리「%s」%d편(%.0f%%) · 이 꼴 그대로 %d편"
              % (mark, w, stem_disp(w, S), st, 100.0 * st / N, f))
        print("      %s" % body)
    shown = len(hits) if wide else sum(1 for h in hits if h[5] == "낯선 말")
    print("모두 %d자리. ★ 는 뿌리째 한 편도 안 쓰는 말이다." % shown)
    n2 = sum(1 for h in hits if h[5] == "낯선 꼴")
    if not wide and n2:
        print("「낯선 꼴」 %d자리는 감췄다 — 뿌리가 흔하면 활용이 드문 것만으론"
              " 신호가 아니다. 보려면 --낯선꼴." % n2)


if __name__ == "__main__":
    main()
