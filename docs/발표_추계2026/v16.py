# -*- coding: utf-8 -*-
"""v16 — 원문 그림을 키우고 Koch 를 ③ 으로 옮긴다 (2026-09-11).

사장님 지시 — *「글보다 도식이나 사진이 좋은데 논문에 있을듯한데」*.

10장 첫 판은 그림이 슬라이드 폭의 28% 밖에 안 돼 안쪽 글씨가 안 읽혔다.
  ① 그림에 폭을 더 준다 (0.345 → 0.400) — 바깥 여백은 이미 잘랐다
  ② 표 칸 글줄을 손으로 접는다. 칸이 좁아졌으므로 두 줄짜리는 세 줄로
  ③ Koch 인용을 ③ 결과물 검증으로 옮긴다 — 원래 그쪽으로 넘어가는 다리였고,
     10장에서 한 줄을 덜어야 그림이 커진다. ③ 은 아래가 비어 있었다

**heredoc 으로 쓰지 않는다.** 문자열 안의 줄바꿈 기호가 실제 줄바꿈으로 바뀌어
`SyntaxError` 가 난다. 이 저장소에서 되풀이된 함정이라 파일로 쓴다.
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
NL = "\\n"                      # 대상 파일 안에 «글자 그대로» 남아야 하는 줄바꿈 기호

# ══ 그림: 폭을 늘리고 칸 글줄을 접는다 ════════════════════════════════
p = os.path.join(HERE, "fig_agent_vs.py")
s = io.open(p, encoding="utf-8").read()
E = [
    ("fig = plt.figure(figsize=(13.6, 4.05), dpi=200)",
     "fig = plt.figure(figsize=(13.6, 4.50), dpi=200)"),
    ("axi = fig.add_axes([0.004, 0.105, 0.345, 0.855])",
     "axi = fig.add_axes([0.004, 0.100, 0.400, 0.860])"),
    ("fig.text(0.176, 0.030,", "fig.text(0.204, 0.028,"),
    ("ax = fig.add_axes([0.372, 0.105, 0.624, 0.855])",
     "ax = fig.add_axes([0.425, 0.100, 0.571, 0.860])"),
    ("fig.text(0.684, 0.030,", "fig.text(0.710, 0.028,"),
    ("RH, GAP = 0.235, 0.025", "RH, GAP = 0.245, 0.025"),
    ('"감독·부조종사.' + NL + '작은 작업을 정하고 나온 코드를 매번 본다"',
     '"감독·부조종사.' + NL + '작은 작업을 정하고' + NL + '나온 코드를 매번 본다"'),
    ('"설계자·관리자·감독.' + NL + '목표·구조·제약을 정하고 진행을 지켜본다"',
     '"설계자·관리자·감독.' + NL + '목표·구조·제약을 정하고' + NL + '진행을 지켜본다"'),
    ('"중간~높음.' + NL + '계획·분해·실행을 스스로 이어 간다"',
     '"중간~높음.' + NL + '계획·분해·실행을' + NL + '스스로 이어 간다"'),
]
for old, new in E:
    assert s.count(old) == 1, "%d 곳 — %s" % (s.count(old), old[:46])
    s = s.replace(old, new)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("그림을 키우고 칸 글줄을 접었다")

# ══ 10장: 그림을 키우고 Koch 를 뺀다 ══════════════════════════════════
p = os.path.join(HERE, "build.py")
s = io.open(p, encoding="utf-8").read()

old = '''pic(sl, "fig_agent_vs.png", M, y + 0.04, W - 2 * M, 3.62, root=HERE, top=True)
bullets(sl, M, y + 3.80, W - 2 * M, [
    ("「중심 문제는 더 이상 프롬프트 공학이 아니라 공학적 과정 통제다」 (Koch, 2026)",
     WARN, True),
    ("→ 이 연구가 정한 경계'''
new = '''pic(sl, "fig_agent_vs.png", M, y + 0.04, W - 2 * M, 4.00, root=HERE, top=True)
bullets(sl, M, y + 4.16, W - 2 * M, [
    ("→ 이 연구가 정한 경계'''
assert s.count(old) == 1, "10장 본문"
s = s.replace(old, new)

# ══ 11장: Koch 를 Uddin 앞에 세운다 ═══════════════════════════════════
old = '''    ("생성된 코드는 오류 없이 실행되면서도 산출값이 틀릴 수 있음 (Uddin, 2026)",
     WARN, True),'''
new = '''    ("「중심 문제는 더 이상 프롬프트 공학이 아니라 공학적 과정 통제다」 — 자율 생성은 "
     "요구사항·제약·추적성과 «독립 검증»이 함께 있을 때만 성립함 (Koch, 2026)",
     WARN, True),
    ("생성된 코드는 오류 없이 실행되면서도 산출값이 틀릴 수 있음 (Uddin, 2026)",
     WARN, True),'''
assert s.count(old) == 1, "11장 본문"
s = s.replace(old, new)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("Koch 를 ③ 으로 옮겼다")
