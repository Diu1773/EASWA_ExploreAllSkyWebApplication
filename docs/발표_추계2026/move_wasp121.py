# -*- coding: utf-8 -*-
"""WASP-121 b 결과를 발표 흐름에서 빼 부록으로 옮긴다 (사장님 지시).

빼면 8장의 「그래서 검증했음」이 근거를 잃으므로, WASP-6 b 재현성을 8장으로
끌어올려 그 자리를 메운다. 조건별 분해는 참고문헌 뒤 부록에 둔다 — 질문이
나오면 넘겨서 보여준다.
"""
import io

P = "deck/build.py"
s = io.open(P, encoding="utf-8").read()

# ── 9·10장을 떼어 낸다 ────────────────────────────────────────────
i = s.index("# ═════ 9. 결과 ① 검증 ═")
j = s.index("# ═════ 11. 결과 ③ 사용자 검토 ═")
s = s[:i] + s[j:]

# ── 8장에 검증 결과를 준다. 「했음」만 있고 결과가 없으면 허공에 뜬다 ──
old = ('    ("→ 산출값은 문헌값과 대조, 화면 안내 문장은 사용자 검토로 점검",\n'
       '     ACC, True),')
new = ('    ("→ 산출값은 문헌값과 대조, 화면 안내 문장은 사용자 검토로 점검",\n'
       '     ACC, True),\n'
       '    ("같은 자료·같은 설정을 반복 실행하면 WASP-6 b 반지름비가 0.14534로 재현됨. "\n'
       '     "처리 조건을 바꾼 민감도 점검 결과는 부록에 둠", BODY, False),')
assert s.count(old) == 1
s = s.replace(old, new)

# ── 결론에서 -12.8% → -2.8% 를 뺀다 ───────────────────────────────
old = ('    ("AI 코딩 도구로 만들었기에 산출값을 따로 검증함. 반복 실행에서 재현되었고 "\n'
       '     "문헌값 차이는 처리 조건으로 -12.8% → -2.8%까지 설명됨", BODY, False),')
new = ('    ("AI 코딩 도구로 만들었기에 산출값을 따로 검증함 — 반복 실행에서 재현되었고 "\n'
       '     "문헌값과 대조하였음", BODY, False),')
assert s.count(old) == 1
s = s.replace(old, new)

# ── 참고문헌에서 뺀 슬라이드에만 있던 것 셋을 지운다 ──────────────
for ref in (
    '    "Claret A (2017) Limb and gravity-darkening coefficients for the TESS satellite. A&A 600: A30.",\n',
    '    "Daylan T, Gunther M N, Mikal-Evans T, et al. (2021) TESS observations of the WASP-121 b phase curve. AJ 161: 131.",\n',
    '    "Delrez L, Santerne A, Almenara J-M, et al. (2016) High-precision multi-wavelength eclipse photometry of WASP-121 b. MNRAS 458: 4025-4043.",\n',
):
    assert s.count(ref) == 1, ref[:50]
    s = s.replace(ref, "")

# ── 부록을 참고문헌 뒤에 붙인다 ───────────────────────────────────
tail = '''
# ═════ 부록. 질문이 나오면 넘긴다 ═════════════════════════════════════
sl = S()
y = title(sl, "부록 · WASP-121 b 처리 조건별 결과",
          "-12.8%가 -2.8%까지 좁혀짐")
f = tb(sl, M, y - 0.08, W - 2 * M, 0.34)
put(f, "다섯 조건은 서로 다른 처리를 여러 개 함께 포함 — 순서대로 누적되지 않고 "
       "한 요인의 효과로도 읽을 수 없음", 13, GREY, first=True)
y += 0.30
pic(sl, "fig_table7.png", M, y - 0.02, W - 2 * M, H - y - 0.62, root=HERE)
cite(sl, "Daylan et al. (2021)과 같은 자료(TESS 섹터 7 · 2분 케이던스)를 별도 스크립트로 분석. "
         "플랫폼의 전체 실행 경로와는 다름. 남은 -2.8%와 비교성 효과는 나누지 못함.")

'''
k = s.index("os.makedirs(DEST, exist_ok=True)")
s = s[:k] + tail.lstrip("\n") + s[k:]

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("9·10장 제거 · 8장 보강 · 결론 수정 · 참고문헌 셋 삭제 · 부록 추가")
