# -*- coding: utf-8 -*-
"""v18 — ③ 에서 글줄이 도식을 밟았다 (2026-09-11).

Koch 인용이 두 줄로 접히면서 Uddin 줄이 도식 위로 내려앉았다. 셋을 고친다.
  ① 도식을 0.29인치 내린다
  ② 숫자를 도식 안으로 — WASP-6 b 0.14534 는 「다시 나오는가」 칸이 제자리다
  ③ 그래서 마지막 요지가 한 줄로 줄어 아래가 트인다
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# ══ 도식: 재현값을 제 칸에 넣는다 ═════════════════════════════════════
p = os.path.join(HERE, "fig_verify.py")
s = io.open(p, encoding="utf-8").read()
old = '"같은 자료·같은 설정에서 다시 나오는가",'
new = '"같은 자료·같은 설정에서 다시 나오는가 — WASP-6 b 0.14534 재현",'
assert s.count(old) == 1, "재현 칸"
io.open(p, "w", encoding="utf-8", newline="\n").write(s.replace(old, new))
print("재현값을 도식 안으로")

# ══ 11장: 도식을 내리고 마지막 요지를 한 줄로 ═════════════════════════
p = os.path.join(HERE, "build.py")
s = io.open(p, encoding="utf-8").read()
old = '''pic(sl, "fig_verify.png", M, y + 1.06, W - 2 * M, 2.42, root=HERE, top=True)
bullets(sl, M, y + 3.62, W - 2 * M, [
    ("→ 같은 자료·같은 설정을 반복하면 WASP-6 b 반지름비가 0.14534 로 재현됨. "
     "산출값이 학습 활동의 근거가 되는 도구에서는 «화면의 동작»과 «값의 타당성»을 "
     "각각 확인해야 함", ACC, True),'''
new = '''pic(sl, "fig_verify.png", M, y + 1.25, W - 2 * M, 2.46, root=HERE, top=True)
bullets(sl, M, y + 3.90, W - 2 * M, [
    ("→ 산출값이 학습 활동의 근거가 되는 도구에서는 «화면의 동작»과 «값의 타당성»을 "
     "각각 확인해야 함", ACC, True),'''
assert s.count(old) == 1, "11장 본문"
io.open(p, "w", encoding="utf-8", newline="\n").write(s.replace(old, new))
print("도식을 내리고 요지를 한 줄로")
