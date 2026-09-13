# -*- coding: utf-8 -*-
"""코퍼스 본문에서 **어절 사용 편수**를 세어 어휘 색인을 만든다.

`check_wording.py` 가 이것을 읽어 「원고의 이 말을 게재 논문 몇 편이 쓰는가」를 답한다.

**목록을 사람이 짓지 않는다.** 「구어체 낱말 목록」을 손으로 만들면 만든 사람의
취향이 그대로 잣대가 된다. 여기서는 게재 논문이 실제로 쓰는지만 센다.

세는 것은 **출현 횟수가 아니라 편수**다. 한 논문이 같은 말을 서른 번 써도 1편이다.
한 저자의 말버릇이 기준선을 흔들지 않게 한다.

    python -X utf8 build_wording_index.py [코퍼스txt폴더] [내보낼.json]
"""
import collections
import glob
import io
import json
import os
import re
import sys

STEM_LEN = 2          # 어간 근사 길이. 활용이 달라도 앞 두 글자는 대개 남는다
MIN_LEN = 2           # 한 글자 어절은 조사·의존명사라 세지 않는다

WORD = re.compile(r"[가-힣]{%d,}" % MIN_LEN)


def eojeols(line):
    """한 문장에서 한글 어절을 뽑는다. 괄호 안 원어·수식은 뺀다."""
    line = re.sub(r"\([^)]*\)", " ", line)
    return WORD.findall(line)


def build(txt_dir):
    full = collections.Counter()      # 어절 그대로 → 편수
    stem = collections.Counter()      # 앞 STEM_LEN 글자 → 편수
    files = sorted(glob.glob(os.path.join(txt_dir, "*.txt")))
    for p in files:
        seen_f, seen_s = set(), set()
        for line in io.open(p, encoding="utf-8"):
            for w in eojeols(line):
                seen_f.add(w)
                seen_s.add(w[:STEM_LEN])
        full.update(seen_f)
        stem.update(seen_s)
    return {
        "편수": len(files),
        "어간길이": STEM_LEN,
        "어절": dict(full),
        "어간": dict(stem),
    }


if __name__ == "__main__":
    d = sys.argv[1] if len(sys.argv) > 1 else \
        "C:/Users/bmffr/Desktop/Research/코퍼스_국문학술/_산출/txt"
    out = sys.argv[2] if len(sys.argv) > 2 else \
        "C:/Users/bmffr/Desktop/Research/코퍼스_국문학술/_산출/어휘색인.json"
    ix = build(d)
    io.open(out, "w", encoding="utf-8").write(
        json.dumps(ix, ensure_ascii=False, separators=(",", ":")))
    print("%d편 · 어절 %s가지 · 어간 %s가지 → %s"
          % (ix["편수"], format(len(ix["어절"]), ","), format(len(ix["어간"]), ","), out))
