# -*- coding: utf-8 -*-
"""부록 C 용어표의 「처음 나오는 절」 열이 실제와 맞는지 본다.

v16 전환에서 3장의 절 번호가 바뀌었는데 부록 C를 함께 고치지 않아 서른 개가 넘는
참조가 한 절씩 밀렸다. 용어 하나하나를 사람이 대조하기 어려우므로 기계로 찾는다.

각 용어의 «본문 첫 등장»을 찾아 그 행이 속한 절 번호를 구하고, 표에 적힌 번호와 비교한다.
괄호 안 원어(예: 「식현상(transit)」)는 한글 부분으로도 찾는다.

  python -X utf8 docs/check_glossary_refs.py [원고경로]
"""
import io, re, sys

DEFAULT = r'C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\EASWA_논문_v17.md'
P = next((a for a in sys.argv[1:] if not a.startswith('--')), DEFAULT)
PATH_OUT = P
L = io.open(P, encoding='utf-8').read().replace('\r\n', '\n').split('\n')
# v17 에서 부록이 「# 부록. 용어 풀이」 하나로 줄었다. 옛 이름만 찾으면 표를 한 줄도
# 못 읽고 「0건」으로 통과한다 — 둘 다 받는다.
APP = next((n for n, x in enumerate(L) if x.startswith('# 부록')), len(L))
if APP == len(L):
    raise SystemExit('부록을 찾지 못했다 — 제목이 「# 부록」으로 시작하는지 본다')
BODY = next((n for n, x in enumerate(L) if x.startswith('# Ⅰ')), 0)   # 초록은 절이 없으므로 뺀다

# 행 번호 → 절 번호
sec_at, cur = {}, None
for n, x in enumerate(L):
    m = re.match(r'## (\d+\.\d+)\.', x)
    if m:
        cur = m.group(1)
    sec_at[n] = cur

def variants(term):
    """「식현상(transit)」 → ['식현상(transit)', '식현상', 'transit']"""
    out = [term]
    m = re.match(r'^(.+?)\s*[(（](.+?)[)）]$', term)
    if m:
        out += [m.group(1).strip(), m.group(2).strip()]
    for v in list(out):          # 「MCMC·emcee」·「BTJD·HJD」는 조각으로도 찾는다.
        # 한글이 섞인 표제어(「설계·개발 연구」)는 나누면 흔한 낱말이 되므로 두지 않는다.
        if '·' in v and not re.search(r'[가-힣]', v):
            out += [x.strip() for x in v.split('·')]
    return [v for v in out if len(v) >= 2]

rows, bad, miss = [], [], []
for n in range(APP, len(L)):
    if not L[n].startswith('|'):
        continue
    c = [x.strip() for x in L[n].strip('|').split('|')]
    if len(c) < 3 or set(''.join(c)) <= set('- '):
        continue
    term, ref = c[0], c[-1]
    # 4.4.4 처럼 세 자리로 적힌 것도 잡는다 — v16 의 하위 절 번호가 남아 있었고
    # 두 자리만 받으면 조용히 걸러져 「0건」으로 통과했다(2026-09-09).
    if not re.fullmatch(r'\d+\.\d+(?:\.\d+)?', ref):
        continue
    first = None
    for v in variants(term):
        for k in range(BODY, APP):
            # 그림 캡션은 본문이 읽는 설명이므로 첫 등장으로 인정한다. 표 캡션만 뺀다.
            if L[k].startswith('#') or L[k].startswith('**표'):
                continue
            if v in L[k]:
                if first is None or k < first[0]:
                    first = (k, v)
                break
    rows.append((n + 1, term, ref, first))
    if first is None:
        miss.append((n + 1, term, ref))
    elif sec_at[first[0]] != ref:
        bad.append((n + 1, term, ref, sec_at[first[0]], first[0] + 1, first[1]))

# --fix: 표의 절 번호를 실제 첫 등장 절로 맞춘다. 절이 움직일 때마다 스물 몇 줄을
# 손으로 고치면 반드시 몇 개를 빠뜨린다.
if '--fix' in sys.argv and bad:
    for ln, term, ref, real, fl, v in bad:
        if not real:
            continue
        cells = L[ln - 1].rstrip().rstrip('|').split('|')
        assert cells[-1].strip() == ref, (ln, cells[-1], ref)
        cells[-1] = ' %s ' % real
        L[ln - 1] = '|'.join(cells) + '|'
    io.open(PATH_OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(L))
    print('절 번호 %d건을 실제 첫 등장 절로 맞췄다 — %s' % (len([b for b in bad if b[3]]), PATH_OUT))
    print()

print('부록 C 참조 검사 — 용어 %d개 (본문 %d~%d행)' % (len(rows), BODY + 1, APP))
print()
print('[상] 표의 절 번호와 실제 첫 등장 절이 다르다 — %d건' % len(bad))
for ln, term, ref, real, fl, v in bad:
    print('   %4d행  %-22s  표 %-5s → 실제 %-5s  (%d행 「%s」)' % (ln, term[:22], ref, real or '없음', fl, v))
print()
print('[중] 본문에서 찾지 못한 용어 — %d건' % len(miss))
for ln, term, ref in miss:
    print('   %4d행  %-22s  표 %s' % (ln, term[:22], ref))
print()
print('주. 첫 등장은 표·그림 캡션과 제목 줄을 뺀 본문 기준이다. 표 안에서만 쓰이는 용어는')
print('    「찾지 못함」으로 나올 수 있으므로 그 경우는 사람이 본다.')
