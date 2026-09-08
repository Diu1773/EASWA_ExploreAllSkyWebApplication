# -*- coding: utf-8 -*-
"""영문 저자명을 학회 규정 제7조(4) 형식으로 바꾼다 (2026-09-09).

규정 원문(http://kosss.org/html/sub02-05.asp 제7조 4항):
    Smith PA, Spencer CD and Jones DE (1992) Force Concept Inventory. Phys. Teach. 30: 141-158.
    (영문 저자명은 family name을 앞에 given name은 initial들을 모아서 구두점 및
     쉼표 없이 표기하고 …)

`convert_references.py` 는 「(연도).」 뒤에 마침표가 있을 때만 저자를 손댄다. v17 전환에서
참고문헌이 APA 판으로 돌아오면서 「(연도) 제목」 형태가 되었고, 그래서 저자 변환만 빠졌다.
이 스크립트는 연도 앞 저자 구간만 다시 바꾼다. 이미 규정 형식인 항목은 정규식이 맞지 않아
그대로 지나간다.

    python -X utf8 docs/fix_ref_authors.py <원고경로>
"""
import io
import re
import sys

P = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\EASWA_논문_v17.md'
L = io.open(P, encoding='utf-8').read().replace('\r\n', '\n').split('\n')

i = next(n for n, x in enumerate(L) if x.startswith('# 참고문헌'))
j = next((n for n, x in enumerate(L) if n > i and x.startswith('# 부록')), len(L))

# 「Lastname, A. B.」 한 사람. 성은 O'Brien·van der Meer 같은 것도 받는다.
ONE = re.compile(r"([A-Z][A-Za-z''\-]+(?:\s+[a-z]{2,4}\s+[A-Z][A-Za-z''\-]+)?),\s*((?:[A-Z]\.\s*)+)")


def initials(s):
    return ''.join(re.findall(r'[A-Z]', s))


changed, skipped = [], []
for n in range(i, j):
    if not L[n].startswith('- '):
        continue
    m = re.match(r'^- (.+?)\s*\((\d{4}[a-z]?)\)', L[n])
    if not m:
        continue
    authors = m.group(1)
    if re.search(r'[가-힣]', authors):          # 국문 항목은 규정이 다르다
        continue
    if not ONE.search(authors):                 # 이미 규정 형식이거나 기관 저자
        skipped.append(L[n][2:60])
        continue
    new = ONE.sub(lambda x: '%s %s' % (x.group(1), initials(x.group(2))), authors)
    new = re.sub(r'\s+', ' ', new).strip().rstrip(',')
    L[n] = '- %s %s' % (new, L[n][2 + len(authors):].lstrip())
    changed.append((authors[:52], new[:52]))

io.open(P, 'w', encoding='utf-8', newline='\n').write('\n'.join(L))
print('영문 저자 %d건 변환 · 손대지 않은 영문 항목 %d건' % (len(changed), len(skipped)))
print()
for a, b in changed[:5]:
    print('  %-52s → %s' % (a, b))
print('  …')
for a, b in changed[-3:]:
    print('  %-52s → %s' % (a, b))
if skipped:
    print()
    print('사람이 볼 것 (저자 형태가 예시와 달라 손대지 않음):')
    for s in skipped:
        print('   %s' % s)
