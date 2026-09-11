# -*- coding: utf-8 -*-
"""v17 — ③ 검증 장을 도식 중심으로 바꾼다 (2026-09-11).

사장님 지시 — *「글보다 도식이나 사진이 좋은데」*.

③ 이 이 절에서 유일하게 글만 있는 장이었다. 가운데 세 줄(산출값·민감도·화면 문장)을
`fig_verify.png` 로 옮기고, 남기는 글은 근거 둘(Koch·Uddin)과 요지 둘뿐이다.
**새 주장을 만들지 않았다** — 그림에 들어간 문장은 모두 원래 이 장에 있던 것이다.

10장 출처 줄에서 Koch 를 뺀다. v16 에서 Koch 를 ③ 으로 옮겼는데 출처만 남아 있었다.
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

# ══ 10장 출처에서 Koch 를 뺀다 ════════════════════════════════════════
old = '''cite(sl, "왼쪽 그림 — Sapkota, Roumeliotis and Karkee (2025) 「Vibe Coding vs. Agentic "
         "Coding」 arXiv:2505.19443 Fig. 5, CC BY 4.0 · Koch (2026) arXiv:2605.20456.")'''
new = '''cite(sl, "왼쪽 그림 — Sapkota, Roumeliotis and Karkee (2025) 「Vibe Coding vs. Agentic "
         "Coding」 arXiv:2505.19443 Fig. 5, CC BY 4.0. 2026-09-11 원문 확인.")'''
assert s.count(old) == 1, "10장 출처"
s = s.replace(old, new)

# ══ 11장을 도식 중심으로 ══════════════════════════════════════════════
i = s.index('y = title(sl, "개발 방식 ③ 결과물 검증",')
i = s.rindex("# ═════", 0, i)
j = s.index("# ═════", i + 10)

verify = '''# ═════ 개발 방식 ③ 결과물 검증 ═══════════════════════════════════════
sl = S()
y = title(sl, "개발 방식 ③ 결과물 검증",
          "화면이 도는 것과 값이 맞는 것은 별개임")
bullets(sl, M, y + 0.06, W - 2 * M, [
    ("「중심 문제는 더 이상 프롬프트 공학이 아니라 공학적 과정 통제다」 — 자율 생성은 "
     "요구사항·제약·추적성과 «독립 검증»이 함께 있을 때만 성립함 (Koch, 2026)",
     WARN, True),
    ("생성된 코드는 오류 없이 실행되면서도 산출값이 틀릴 수 있음 (Uddin, 2026)",
     WARN, True),
], size=15, gap=8)
pic(sl, "fig_verify.png", M, y + 1.06, W - 2 * M, 2.42, root=HERE, top=True)
bullets(sl, M, y + 3.62, W - 2 * M, [
    ("→ 같은 자료·같은 설정을 반복하면 WASP-6 b 반지름비가 0.14534 로 재현됨. "
     "산출값이 학습 활동의 근거가 되는 도구에서는 «화면의 동작»과 «값의 타당성»을 "
     "각각 확인해야 함", ACC, True),
    ("개발 방식 간 비교는 하지 않았음. 시간·비용을 기록하지 않아 빨랐다고 말할 수 없음",
     GREY, False),
], size=15, gap=8)

'''
s = s[:i] + verify + s[j:]

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("③ 을 도식 중심으로 · 10장 출처 정리")
