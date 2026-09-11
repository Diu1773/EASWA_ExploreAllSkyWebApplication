# -*- coding: utf-8 -*-
"""v11 — 사장님 지시 다섯 (2026-09-11).

  ① 「그런데 교실까지 오지 않음」 → 「그런데 학교 현장에서 활용하기에 어려움이 있음」
  ② 커밋 막대 그림을 뺀다
  ③ 쪽 번호를 넣는다
  ④ 머리말을 넣는다
  ⑤ 개발 방식에 AI 에이전트를 ② 로 끼운다

새로 넣은 문헌 둘은 2026-09-11 에 arXiv 초록을 직접 열어 확인했다.
  Khosravani and Mockus (2026) arXiv:2606.24429
      공개 저장소 1억 8천만 개 조사. 에이전트 커밋 월 32만 건 이상.
      Claude Code 는 17,295개 프로젝트에서 886,122 커밋.
  Koch (2026) arXiv:2605.20456
      「중심 문제는 더 이상 프롬프트 공학이 아니라 공학적 과정 통제다.」
      자율 코드 생성은 요구사항·제약·추적성·독립 검증이 함께 있을 때만 성립한다.
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

# ══ ① 배경 ② 제목 ════════════════════════════════════════════════════
old = '''y = title(sl, "연구 배경 ② 그런데 교실까지 오지 않음",
          "탐구보다 자료 준비가 먼저 옴")'''
new = '''y = title(sl, "연구 배경 ② 그런데 학교 현장에서 활용하기에 어려움이 있음",
          "탐구보다 자료 준비가 먼저 옴")'''
assert s.count(old) == 1
s = s.replace(old, new)

# ══ ② 커밋 막대 제거 ═════════════════════════════════════════════════
old = '''pic(sl, "fig_commits.png", M, y + 0.02, W - 2 * M, 2.35, root=HERE, top=True)
bullets(sl, M, y + 2.52, W - 2 * M, ['''
new = '''bullets(sl, M, y + 0.10, W - 2 * M, ['''
assert s.count(old) == 1
s = s.replace(old, new)
s = s.replace('''    ("개발 방식 간 비교는 하지 않았음. 시간·비용을 기록하지 않아 빨랐다고 말할 수 없음",
     GREY, False),
], size=14, gap=8)''',
'''    ("개발 방식 간 비교는 하지 않았음. 시간·비용을 기록하지 않아 빨랐다고 말할 수 없음",
     GREY, False),
], size=17, gap=12)''')

# ══ ⑤ AI 에이전트를 ② 로 ═════════════════════════════════════════════
s = s.replace('y = title(sl, "개발 방식 ② 그래서 값을 따로 검증했음",',
              'y = title(sl, "개발 방식 ③ 그래서 값을 따로 검증했음",')

agent = '''# ═════ 개발 방식 ② AI 에이전트 ═══════════════════════════════════════
sl = S()
y = title(sl, "개발 방식 ② AI 에이전트",
          "지시를 받아 저장소를 읽고, 고치고, 명령을 돌려 확인하고, 스스로 되풀이하는 단계로 넘어감")
bullets(sl, M, y + 0.10, W - 2 * M, [
    ("한 번의 물음에 답하는 방식에서, 목표를 주면 저장소를 살피고 파일을 고치고 실행해 "
     "확인하기를 되풀이하는 방식으로 바뀜", BODY, False),
    ("공개 저장소 1억 8천만 개를 훑은 조사에서 에이전트가 만든 커밋이 월 32만 건을 넘음. "
     "한 도구만도 17,295개 프로젝트에서 886,122 커밋 (Khosravani and Mockus, 2026)",
     BODY, False),
    ("", BODY, False),
    ("「중심 문제는 더 이상 프롬프트 공학이 아니라 공학적 과정 통제다」 (Koch, 2026)",
     WARN, True),
    ("자율 코드 생성은 요구사항·제약·추적성·독립 검증이 함께 있을 때만 성립한다는 지적임",
     BODY, False),
    ("", BODY, False),
    ("→ 에이전트에 맡기는 폭이 넓어질수록 «무엇을 어떻게 확인했는가»를 따로 세워야 함",
     ACC, True),
], size=17, gap=11)
cite(sl, "arXiv:2606.24429 · 2605.20456. 2026-09-11 초록 확인.")

'''
k = s.index('y = title(sl, "개발 방식 ③ 그래서 값을 따로 검증했음",')
k = s.rindex("# ═════", 0, k)
s = s[:k] + agent + s[k:]

# ══ 참고문헌 둘 ══════════════════════════════════════════════════════
old = '    "Kreidberg L (2015) batman:'
new = ('    "Khosravani A and Mockus A (2026) Detecting AI coding agents in open source: A validated '
       'multi-method census of 180 million repositories. arXiv:2606.24429.",\n'
       '    "Koch C (2026) Agentic Agile-V: From vibe coding to verified engineering in software and '
       'hardware development. arXiv:2605.20456.",\n'
       '    "Kreidberg L (2015) batman:')
assert s.count(old) == 1
s = s.replace(old, new)

# ══ ③④ 머리말과 쪽 번호 ═════════════════════════════════════════════
runner = '''

# ═════ 머리말과 쪽 번호 ═══════════════════════════════════════════════
# 표제는 빼고 둘째 장부터 넣는다. 부록도 이어서 매긴다.
RUN = "천문 탐구 웹 플랫폼 EASWA의 개발과 현장 적용 방안 · 박민준 · 손정주"
_all = list(prs.slides)
for n, sl in enumerate(_all[1:], start=2):
    f = tb(sl, M, 0.16, W - 2 * M - 0.9, 0.24)
    put(f, RUN, 10, C(0x9A, 0x9A, 0x9A), first=True)
    g = tb(sl, W - M - 0.9, 0.16, 0.9, 0.24, PP_ALIGN.RIGHT)
    put(g, "%d / %d" % (n, len(_all)), 10, C(0x9A, 0x9A, 0x9A), first=True,
        align=PP_ALIGN.RIGHT)

'''
k = s.index("os.makedirs(DEST, exist_ok=True)")
s = s[:k] + runner.lstrip("\n") + s[k:]

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("배경 ② 제목 · 커밋 막대 제거 · AI 에이전트 한 장 · 머리말과 쪽 번호")
