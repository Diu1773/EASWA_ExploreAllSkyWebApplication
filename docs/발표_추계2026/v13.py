# -*- coding: utf-8 -*-
"""v13 — 목차 한 장 (2026-09-11).

사장님 지시 — *「목차도 만들자」*.

쪽 번호는 `build.py` 끝의 runner 가 실제 장 수를 세어 매기므로, 목차가 끼어도
저절로 밀린다. 다만 **목차에 적는 쪽 번호는 손으로 적는다** — 장을 더 넣거나 빼면
여기도 같이 고쳐야 한다. 그래서 이름만 적고 쪽은 굳이 안 적는 쪽을 골랐다.
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

toc = '''# ═════ 목차 ══════════════════════════════════════════════════════════
sl = S()
y = title(sl, "목차")
ITEMS = [
    ("연구 배경", "공공 천문자료는 쏟아지는데 학교 현장에서 활용하기에 어려움이 있음"),
    ("기존 웹 환경", "자료 제공 서비스와 교육 지향 환경 — 두 갈래를 화면으로"),
    ("EASWA가 가야 할 방향", "두 갈래에서 갈라지는 지점 셋"),
    ("개발 방식", "바이브 코딩 · AI 에이전트 · 그래서 값을 따로 검증했음"),
    ("EASWA의 구조와 웹 기능", "세 모듈에 같은 일곱 단계 · 탐구 질문 진입 · 분석 조건 · 기준값 비교"),
    ("사용자 검토 결과", "현직·예비교사 26명의 반응과 보완 요구"),
    ("후속 과제와 결론", "학생 적용과 수업 자료가 먼저"),
]
ty = y + 0.14
for i, (head, sub) in enumerate(ITEMS):
    yy = ty + i * 0.63
    n = tb(sl, M, yy, 0.62, 0.5)
    put(n, "%02d" % (i + 1), 20, C(0xC8, 0xD6, 0xE4), True, first=True)
    f = tb(sl, M + 0.66, yy - 0.03, W - 2 * M - 0.66, 0.6)
    put(f, head, 19, ACC, True, first=True, space_after=2)
    put(f, sub, 13, GREY)
    if i:
        rule(sl, yy - 0.10, M, W - 2 * M, C(0xEC, 0xEF, 0xF3))
cite(sl, "발표 12분 · 질의 3분. 값의 신뢰도와 기존 웹 화면은 부록 셋에 두었음.")

'''

k = s.index("# ═════ 2. 연구 배경 ① 자료는 쏟아진다 ═")
s = s[:k] + toc + s[k:]
io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("목차 한 장 넣음")
