# -*- coding: utf-8 -*-
"""논문마다 다른 값을 한 곳에서 읽는다.

2026-09-13 이전에는 원고 경로·부록 경계·금지어·기준선이 스크립트마다 박혀 있었다.
부록 제목이 「# 부록 A」에서 「# 부록. 서술형…」으로 바뀌었을 때 세 스크립트 가운데
하나만 안 따라와, 검사에서 뺀다고 주석에 적어 둔 부록 45행이 그대로 검사에 들어갔다.
결과가 우연히 같아서 아무도 몰랐다.

쓰는 쪽:

    from paper_config import CFG
    src = CFG.원고("마크다운")
    app = CFG.경계("부록시작")

**없는 키를 물으면 즉시 멈춘다.** 조용히 기본값으로 흐르면 같은 사고가 되풀이된다.
"""
import io
import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_PATH = os.path.join(_HERE, "논문설정.json")


class _Config:
    def __init__(self, path):
        self.path = path
        if not os.path.exists(path):
            raise SystemExit(
                "논문설정.json 이 없다: %s\n"
                "다음 논문에서는 이 파일을 만들고 원고 경로·경계·금지어를 적는다." % path)
        with io.open(path, encoding="utf-8") as f:
            self._d = json.load(f)

    def _get(self, group, key=None):
        if group not in self._d:
            raise SystemExit("논문설정.json 에 「%s」 항목이 없다" % group)
        g = self._d[group]
        if key is None:
            return g
        if isinstance(g, dict) and key not in g:
            raise SystemExit("논문설정.json 의 「%s」 에 「%s」 가 없다" % (group, key))
        return g[key]

    def 원고(self, which="마크다운"):
        return self._get("원고", which)

    def 코퍼스(self, key="폴더"):
        return self._get("코퍼스", key)

    def 경계(self, key):
        return self._get("경계", key)

    def 제목꼴(self, key):
        return self._get("제목꼴", key)

    def 캡션꼴(self, key):
        return self._get("캡션꼴", key)

    def 못하는주장(self):
        return [tuple(x) for x in self._get("못하는주장")]

    def 못하는주장_예외(self):
        return self._get("못하는주장_예외")

    def 금지어(self):
        return dict(self._get("금지어"))

    def 장별역할(self, ch=None):
        return self._get("장별역할", ch)

    def 기준선(self, key):
        p = self._get("기준선", key)
        full = p if os.path.isabs(p) else os.path.join(os.path.dirname(_HERE), p)
        if not os.path.exists(full):
            raise SystemExit("기준선 파일이 없다: %s" % full)
        with io.open(full, encoding="utf-8") as f:
            return json.load(f)


CFG = _Config(_PATH)


if __name__ == "__main__":
    print("논문설정.json 을 읽었다 — %s" % _PATH)
    print("  원고     %s" % os.path.basename(CFG.원고()))
    print("  조판PDF  %s" % os.path.basename(CFG.원고("조판PDF")))
    print("  코퍼스   %s (%d편)" % (os.path.basename(CFG.코퍼스()), CFG.코퍼스("편수")))
    print("  부록시작 %r" % CFG.경계("부록시작"))
    print("  금지어   %d개" % len(CFG.금지어()))
    print("  못하는주장 %d개" % len(CFG.못하는주장()))
    print("  리듬기준선 %d지표" % len([k for k in CFG.기준선("리듬") if k != "n"]))
