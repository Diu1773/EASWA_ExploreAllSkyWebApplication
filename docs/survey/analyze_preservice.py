# -*- coding: utf-8 -*-
"""예비교사 재평가 구글폼 응답(TSV) 집계.

사용법:
    python -X utf8 docs/survey/analyze_preservice.py \
        docs/survey/data/예비교사_설문_원자료_2026-09-06_18시.tsv [추가.tsv ...] \
        --label "1회차(9/6 18시)" \
        --out docs/survey/RESULTS_2026-09-06_예비교사_1회차.md \
        --json docs/survey/data/예비교사_집계_2026-09-06.json

- 입력은 구글 시트 「응답」 탭을 탭 구분으로 붙여 넣거나 내려받은 파일(첫 행 = 헤더).
  여러 파일을 주면 합쳐 집계하고 회차별로도 나눈다. 같은 타임스탬프 행은 한 번만 센다.
- 선택지 목록은 `preservice_form_spec_20260906.json`(같은 폴더)에서 읽는다. 체크박스 셀은
  쉼표로 자르지 않고 알려진 선택지를 긴 것부터 대조한다(「기준값 비교, 차이 원인 설명, …」처럼
  선택지 안에 쉼표가 있다).
- 역문항 12·15는 원점수를 보존하고 6−원점수를 따로 적는다. 빈칸은 무응답으로 세고 0·3점으로
  바꾸지 않는다. 표준편차는 표본 표준편차(n−1)이며 n<2면 적지 않는다.
- 1차 현직(N=12, 2026-07-24) 값은 `RESULTS_2026-07-24_교사시연.md`에서 옮겨 적은 것으로,
  진술을 유지한 10문항(8~16·18)에만 나란히 둔다. 참여 집단·배포본·안내 조건이 다르므로
  차이를 보완의 효과로 읽지 않는다(원고 3.6·5.5).
- 서술형은 원문 그대로 싣는다. 범주 부호화는 연구자가 별도 문서에서 한다.
- 수치는 만들지 않는다. 자료에 없는 것은 「없음」으로 남긴다.
"""
import argparse
import collections
import csv
import datetime as dt
import io
import json
import math
import os
import re
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC_PATH = os.path.join(HERE, 'preservice_form_spec_20260906.json')

LIKERT_IDS = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '18-1', '21-1']
REVERSE_IDS = {'12', '15'}
KEPT_FROM_ROUND1 = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '18']  # 진술 유지 10문항
CHANGED_WORDING = {'17': '학교 천문탐구 활동 적절성(문구 변경)', '21-1': '본인의 향후 활용 의향(문구 변경)'}
NEW_IN_ROUND2 = {'18-1': '기준값 비교 화면의 명료성(긍정 진술, 2차 신설)'}
CHECKBOX_IDS = ['2-1', '3-1', '5', '19', '21']
SINGLE_IDS = ['1', '3', '4', '7', '7-1']
FREE_IDS = ['6', '20', '20-1', '22', '23']
GRID_ID = '18-2'

# 1차 현직 코호트(N=12) — RESULTS_2026-07-24_교사시연.md §5 원자료. 원평균·역채점평균·분포(1→5).
ROUND1 = {
    '8':  {'mean': 4.08, 'rev': 4.08, 'dist': [0, 0, 2, 7, 3]},
    '9':  {'mean': 4.50, 'rev': 4.50, 'dist': [0, 0, 0, 6, 6]},
    '10': {'mean': 4.42, 'rev': 4.42, 'dist': [0, 0, 2, 3, 7]},
    '11': {'mean': 4.42, 'rev': 4.42, 'dist': [0, 0, 1, 5, 6]},
    '12': {'mean': 2.50, 'rev': 3.50, 'dist': [3, 3, 4, 1, 1]},
    '13': {'mean': 4.00, 'rev': 4.00, 'dist': [0, 0, 3, 6, 3]},
    '14': {'mean': 4.50, 'rev': 4.50, 'dist': [0, 0, 1, 4, 7]},
    '15': {'mean': 2.58, 'rev': 3.42, 'dist': [1, 7, 1, 2, 1]},
    '16': {'mean': 3.75, 'rev': 3.75, 'dist': [0, 1, 3, 6, 2]},
    '18': {'mean': 4.33, 'rev': 4.33, 'dist': [0, 0, 0, 8, 4]},
}
ROUND1_N = 12

SHORT_LABEL = {
    '8': '탐구 주제·질문에서 출발', '9': '코딩 환경 없이 분석 과정을 따라감',
    '10': '자료 출처·관측 정보 확인 가능', '11': '분석 조건 직접 조정 가능',
    '12': '화면이 복잡해 흐름 파악이 어렵다(역)', '13': 'STEP별 질문·생각해보기가 도움',
    '14': '광도곡선·모델 적합 결과 해석 가능하게 제시', '15': '기준값 비교 화면이 무엇을 해석할지 파악 어렵다(역)',
    '16': '산출값–기준값 차이를 스스로 해석하도록 돕는다', '17': '단계별 안내·질문이 학교 천문탐구 활동에 적절',
    '18': '교육용 웹 플랫폼으로 적절', '18-1': '기준값 비교 화면이 무엇을 해석할지 분명히 보여준다',
    '21-1': '향후 학생 대상 활동에 활용할 의향',
}
PRINCIPLE = {
    '8': '탐구 주제 중심 접근', '9': '기술 실행 부담 완화', '10': '분석 과정의 가시화(정보 제시)',
    '11': '분석 과정의 가시화(조건 조절)', '12': '사용 부담(역문항, 화면 복잡성)', '13': 'STEP별 스캐폴딩',
    '14': '분석 과정의 가시화(시각화 해석)', '15': '사용 부담(역문항, 해석 난이도)', '16': '결과 해석의 학습자 수행',
    '17': '수업 적용 가능성 지원', '18': '종합 적절성', '18-1': '결과 해석의 학습자 수행(긍정 진술)',
    '21-1': '활용 의향',
}

ITEM_RE = re.compile(r'^\s*(\d+(?:-\d+)?)\.\s')


# ---------------------------------------------------------------- 입력 ----------
def load_spec():
    with io.open(SPEC_PATH, encoding='utf-8') as f:
        spec = json.load(f)
    choices, grid = {}, {}
    for it in spec['items']:
        title = (it.get('setTitle') or [''])[0]
        m = ITEM_RE.match(title)
        if not m:
            continue
        qid = m.group(1)
        if 'setChoiceValues' in it:
            choices[qid] = list(it['setChoiceValues'][0])
        if it.get('type') == 'addGridItem':
            grid[qid] = {'rows': list(it['setRows'][0]), 'cols': list(it['setColumns'][0])}
    return choices, grid


def read_tsv(path):
    with io.open(path, encoding='utf-8-sig', newline='') as f:
        rows = list(csv.reader(f, delimiter='\t'))
    header, body = rows[0], [r for r in rows[1:] if any(c.strip() for c in r)]
    return header, body


def map_columns(header):
    """헤더 → {'ts': i, 'consent': i, 'session': i, 'q': {qid: i}, 'grid': {row_label: i}}"""
    cols = {'q': {}, 'grid': {}}
    for i, h in enumerate(header):
        hs = h.strip()
        if hs.startswith('타임스탬프'):
            cols['ts'] = i
        elif '동의' in hs and '익명' in hs:
            cols['consent'] = i
        elif hs.startswith('오늘 참여한 회차'):
            cols['session'] = i
        else:
            m = ITEM_RE.match(hs)
            if not m:
                continue
            qid = m.group(1)
            if qid == GRID_ID:
                g = re.search(r'\[(.+?)\]\s*$', hs)
                if g:
                    cols['grid'][g.group(1).strip()] = i
            else:
                cols['q'][qid] = i
    return cols


def parse_ts(s):
    s = (s or '').strip()
    m = re.match(r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})', s)
    if m:
        y, mo, d, ampm, hh, mm, ss = m.groups()
        hh = int(hh) % 12 + (12 if ampm == '오후' else 0)
        return dt.datetime(int(y), int(mo), int(d), hh, int(mm), int(ss))
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M:%S', '%m/%d/%Y %H:%M:%S'):
        try:
            return dt.datetime.strptime(s, fmt)
        except ValueError:
            pass
    return None


def parse_checkbox(cell, options):
    """알려진 선택지를 긴 것부터 대조. 남는 글자는 기타."""
    text = (cell or '').strip()
    picked, rest = [], text
    for opt in sorted(options, key=len, reverse=True):
        if opt in rest:
            picked.append(opt)
            rest = rest.replace(opt, ' ')
    other = re.sub(r'[\s,]+', ' ', rest).strip(' ,')
    return picked, other


def is_empty_text(s):
    t = (s or '').strip()
    return t == '' or re.fullmatch(r'[\s.。…\-–—~ㅡ,·]+', t) is not None


def to_int(cell):
    c = (cell or '').strip()
    return int(c) if re.fullmatch(r'[1-5]', c) else None


# ---------------------------------------------------------------- 집계 ----------
def likert_stats(vals):
    v = [x for x in vals if x is not None]
    n = len(v)
    dist = [v.count(k) for k in range(1, 6)]
    out = {'n': n, 'missing': len(vals) - n, 'dist': dist}
    if n:
        out['mean'] = round(sum(v) / n, 2)
        out['median'] = statistics.median(v)
        out['rev_mean'] = round(sum(6 - x for x in v) / n, 2)
    if n >= 2:
        out['sd'] = round(statistics.stdev(v), 2)
    return out


def fmt(x, nd=2):
    if x is None:
        return '—'
    if isinstance(x, float):
        return f'{x:.{nd}f}'
    return str(x)


def dist_str(d):
    return '·'.join(str(x) for x in d)


def analyze(records, choices, grid):
    """records: list of dict(pid, ts, session, cells, cols)"""
    N = len(records)
    R = {'N': N, 'respondents': [], 'single': {}, 'q2': {}, 'checkbox': {}, 'likert': {},
         'grid': {}, 'free': {}, 'cross_15_18_1': [], 'sessions': collections.Counter()}

    def cell(rec, qid):
        i = rec['cols']['q'].get(qid)
        return rec['cells'][i].strip() if i is not None and i < len(rec['cells']) else ''

    for rec in records:
        R['sessions'][rec['session'] or '(미기재)'] += 1
        R['respondents'].append({'pid': rec['pid'], 'ts': rec['ts'].isoformat(sep=' ') if rec['ts'] else None,
                                 'session': rec['session']})

    # 단일 선택
    for qid in SINGLE_IDS:
        cnt = collections.Counter(cell(r, qid) or '(무응답)' for r in records)
        order = choices.get(qid, [])
        keys = [k for k in order if k in cnt] + [k for k in cnt if k not in order]
        R['single'][qid] = [(k, cnt[k]) for k in keys]

    # Q2 경험 1~5
    q2 = [to_int(cell(r, '2')) for r in records]
    R['q2'] = likert_stats(q2)

    # 체크박스
    for qid in CHECKBOX_IDS:
        opts = choices.get(qid, [])
        cnt = collections.Counter()
        others, per = [], []
        for r in records:
            picked, other = parse_checkbox(cell(r, qid), opts)
            per.append({'pid': r['pid'], 'picked': picked, 'other': other})
            for p in picked:
                cnt[p] += 1
            if other:
                others.append((r['pid'], other))
        R['checkbox'][qid] = {'counts': [(o, cnt[o]) for o in opts], 'others': others, 'per': per}

    # 반응 척도
    for qid in LIKERT_IDS:
        vals = [to_int(cell(r, qid)) for r in records]
        st = likert_stats(vals)
        st['values'] = vals
        R['likert'][qid] = st

    # Q15 × Q18-1
    for r in records:
        a, b = to_int(cell(r, '15')), to_int(cell(r, '18-1'))
        R['cross_15_18_1'].append({'pid': r['pid'], 'q15': a, 'q18_1': b,
                                   'consistent': (None if a is None or b is None else ((a <= 2 and b >= 4) or (a >= 4 and b <= 2) or (a == 3 and b == 3)))})

    # 18-2 격자
    g = grid.get(GRID_ID, {'rows': [], 'cols': []})
    for row in g['rows']:
        cnt = collections.Counter()
        for r in records:
            i = r['cols']['grid'].get(row)
            v = r['cells'][i].strip() if i is not None and i < len(r['cells']) else ''
            cnt[v if v else '(무응답)'] += 1
        R['grid'][row] = {'counts': [(c, cnt[c]) for c in g['cols']], 'missing': cnt['(무응답)'],
                          'unknown': {k: v for k, v in cnt.items() if k not in g['cols'] and k != '(무응답)'}}
    R['grid_cols'] = g['cols']

    # 서술형
    for qid in FREE_IDS:
        items = []
        for r in records:
            t = cell(r, qid)
            items.append({'pid': r['pid'], 'text': t, 'empty': is_empty_text(t)})
        R['free'][qid] = items
    return R


# ---------------------------------------------------------------- 출력 ----------
def render_md(R, label, sources, per_session):
    L = []
    N = R['N']
    L.append(f'# 예비교사 재평가 설문 결과 — {label} (N={N})')
    L.append('')
    L.append(f'> 생성: {dt.datetime.now():%Y-%m-%d %H:%M} · `docs/survey/analyze_preservice.py` · 원자료: ' +
             ', '.join(f'`{os.path.relpath(s).replace(os.sep, "/")}`' for s in sources))
    L.append('> 회차별 응답 수: ' + ' · '.join(f'{k} {v}명' for k, v in R['sessions'].items()))
    L.append('> 참여자 번호(P)는 제출 시각 순서이며 개인 식별자가 아니다. 빈칸은 무응답으로 세고 0·3점으로 바꾸지 않았다.')
    L.append('> 1차 현직(N=12) 값은 진술을 유지한 10문항에만 나란히 둔다. 집단·배포본·안내 조건이 달라 차이를 보완의 효과로 읽지 않는다.')
    L.append('')

    # 1. 배경
    L.append('## 1. 응답자 배경과 수행')
    L.append('')
    L.append('| 문항 | 응답 | 인원 |')
    L.append('|---|---|---|')
    names = {'1': 'Q1 현재 역할', '3': 'Q3 공공·실제 관측자료 활용 경험', '4': 'Q4 웹 기반 분석 도구 경험',
             '7': 'Q7 직접 수행 완료 수준', '7-1': 'Q7-1 직접 수행 소요 시간'}
    for qid in SINGLE_IDS:
        for k, c in R['single'][qid]:
            L.append(f'| {names[qid]} | {k} | {c} |')
    q2 = R['q2']
    L.append(f"| Q2 천문 관련 교육·자료 활용 경험(1~5) | 분포(1→5) {dist_str(q2['dist'])} · 평균 {fmt(q2.get('mean'))} · 중앙값 {fmt(q2.get('median'))} | 유효 {q2['n']} · 무응답 {q2['missing']} |")
    L.append('')
    L.append('**Q2-1 고교 과학 선택과목 이수(복수선택)**')
    L.append('')
    L.append('| 과목 | 인원 |')
    L.append('|---|---|')
    for o, c in R['checkbox']['2-1']['counts']:
        L.append(f'| {o} | {c} |')
    L.append('')
    L.append('개인별: ' + ' · '.join(f"{p['pid']}={'/'.join(x.split(' ')[0] for x in p['picked']) or '없음'}" for p in R['checkbox']['2-1']['per']))
    L.append('')

    # 2. Q3-1
    L.append('## 2. Q3-1 실제 관측자료를 수업에 활용하고 싶은 이유(복수선택)')
    L.append('')
    L.append('| 이유 | 인원 |')
    L.append('|---|---|')
    for o, c in R['checkbox']['3-1']['counts']:
        L.append(f'| {o} | {c} |')
    if R['checkbox']['3-1']['others']:
        L.append('| 기타 | ' + '; '.join(f'{p}: {t}' for p, t in R['checkbox']['3-1']['others']) + ' |')
    L.append('')

    # 3. Q5·Q6
    L.append('## 3. Q5 기존 공공 천문자료 서비스 활용 장벽(복수선택) · Q6 이유')
    L.append('')
    L.append('Q5·Q6의 대상은 **기존 서비스**다. EASWA의 개선 효과로 읽지 않는다. 실제 사용 경험이 없는 응답자(Q3 없음)의 응답은 예시 화면을 본 뒤의 예상이다.')
    L.append('')
    L.append('| 장벽 | 인원 |')
    L.append('|---|---|')
    for o, c in R['checkbox']['5']['counts']:
        L.append(f'| {o} | {c} |')
    if R['checkbox']['5']['others']:
        L.append('| 기타 | ' + '; '.join(f'{p}: {t}' for p, t in R['checkbox']['5']['others']) + ' |')
    L.append('')
    L.append('**Q6 원문**')
    L.append('')
    for it in R['free']['6']:
        L.append(f"- {it['pid']}: " + ('(내용 없음)' if it['empty'] else it['text'].replace('\n', ' / ')))
    L.append('')

    # 4. 척도
    L.append('## 4. EASWA 프로토타입 반응 척도(1~5)')
    L.append('')
    L.append('역문항 12·15는 원점수 분포를 적고 6−원점수 평균을 괄호에 둔다. SD는 표본 표준편차(n−1).')
    L.append('')
    L.append('### 4-1. 1차와 진술을 유지한 10문항')
    L.append('')
    L.append(f'| 문항 | 영역 | 예비 유효 n | 무응답 | 예비 분포(1·2·3·4·5) | 예비 평균 | 예비 SD | 현직 N={ROUND1_N} 분포 | 현직 평균 |')
    L.append('|---|---|---|---|---|---|---|---|---|')
    for qid in KEPT_FROM_ROUND1:
        st = R['likert'][qid]
        rev = qid in REVERSE_IDS
        mean = f"{fmt(st.get('mean'))}" + (f" (역채점 {fmt(st.get('rev_mean'))})" if rev and st['n'] else '')
        r1 = ROUND1[qid]
        r1mean = f"{fmt(r1['mean'])}" + (f" (역채점 {fmt(r1['rev'])})" if rev else '')
        L.append(f"| {qid}. {SHORT_LABEL[qid]} | {PRINCIPLE[qid]} | {st['n']} | {st['missing']} | {dist_str(st['dist'])} | {mean} | {fmt(st.get('sd'))} | {dist_str(r1['dist'])} | {r1mean} |")
    L.append('')
    L.append('### 4-2. 문구를 바꾼 문항과 2차 신설 문항(1차와 나란히 두지 않음)')
    L.append('')
    L.append('| 문항 | 구분 | 유효 n | 무응답 | 분포(1·2·3·4·5) | 평균 | SD |')
    L.append('|---|---|---|---|---|---|---|')
    for qid in ['17', '21-1', '18-1']:
        st = R['likert'][qid]
        kind = CHANGED_WORDING.get(qid) or NEW_IN_ROUND2.get(qid)
        L.append(f"| {qid}. {SHORT_LABEL[qid]} | {kind} | {st['n']} | {st['missing']} | {dist_str(st['dist'])} | {fmt(st.get('mean'))} | {fmt(st.get('sd'))} |")
    L.append('')
    L.append('### 4-3. Q15(역문항) × Q18-1(긍정 진술) 응답 방향')
    L.append('')
    L.append('| 참여자 | Q15 「파악하기 어렵다」 | Q18-1 「분명하게 보여준다」 | 방향 일치 |')
    L.append('|---|---|---|---|')
    for x in R['cross_15_18_1']:
        cons = '—' if x['consistent'] is None else ('일치' if x['consistent'] else '불일치')
        L.append(f"| {x['pid']} | {fmt(x['q15'])} | {fmt(x['q18_1'])} | {cons} |")
    L.append('')
    L.append('일치 = 어려움에 반대(1·2)하면서 명료성에 동의(4·5), 또는 그 반대, 또는 둘 다 3. 불일치만으로 응답자를 제외하거나 역문항 효과를 확정하지 않는다.')
    L.append('')

    # 5. 18-2
    L.append('## 5. Q18-2 이해·수행에 필요했던 도움(행별 빈도)')
    L.append('')
    L.append('순서형 능력 점수가 아니다. 범주 빈도와 무응답만 보고한다.')
    L.append('')
    L.append('| 내용 | ' + ' | '.join(R['grid_cols']) + ' | 무응답 |')
    L.append('|---|' + '---|' * len(R['grid_cols']) + '---|')
    for row, g in R['grid'].items():
        L.append(f'| {row} | ' + ' | '.join(str(c) for _, c in g['counts']) + f" | {g['missing']} |")
        if g['unknown']:
            L.append(f'| ↳ 알 수 없는 값 | {g["unknown"]} |')
    L.append('')

    # 6. Q19·Q20
    L.append('## 6. Q19 직접 수행하며 어려웠던 단계(복수선택, 본인 경험만) · Q20 이유')
    L.append('')
    L.append('| 단계 | 인원 |')
    L.append('|---|---|')
    for o, c in R['checkbox']['19']['counts']:
        L.append(f'| {o} | {c} |')
    if R['checkbox']['19']['others']:
        L.append('| 기타 | ' + '; '.join(f'{p}: {t}' for p, t in R['checkbox']['19']['others']) + ' |')
    L.append('')
    L.append('**Q20 원문**')
    L.append('')
    for it in R['free']['20']:
        L.append(f"- {it['pid']}: " + ('(내용 없음)' if it['empty'] else it['text'].replace('\n', ' / ')))
    L.append('')

    # 7. Q20-1
    L.append('## 7. Q20-1 산출값–기준값 차이의 원인(서술, 탐구 수행 산출물)')
    L.append('')
    n_ans = sum(1 for it in R['free']['20-1'] if not it['empty'])
    L.append(f'응답 {n_ans}/{N}건. 범주 부호화(자료 품질 / 분석 조건 / 모델 가정 / 귀속 불가)는 연구자가 별도 문서에서 한다.')
    L.append('')
    for it in R['free']['20-1']:
        L.append(f"- {it['pid']}: " + ('(내용 없음)' if it['empty'] else it['text'].replace('\n', ' / ')))
    L.append('')

    # 8. Q21
    L.append('## 8. Q21 보완 요소(복수선택) · Q21-1 활용 의향')
    L.append('')
    L.append('| 보완 요소 | 인원 |')
    L.append('|---|---|')
    for o, c in R['checkbox']['21']['counts']:
        L.append(f'| {o} | {c} |')
    if R['checkbox']['21']['others']:
        L.append('| 기타 | ' + '; '.join(f'{p}: {t}' for p, t in R['checkbox']['21']['others']) + ' |')
    st = R['likert']['21-1']
    L.append('')
    L.append(f"Q21-1 향후 학생 대상 활동 활용 의향: 분포(1→5) {dist_str(st['dist'])} · 평균 {fmt(st.get('mean'))} · 유효 {st['n']} · 무응답 {st['missing']}")
    L.append('')

    # 9. Q22·Q23
    for qid, title in (('22', 'Q22 가장 걱정되는 점과 이유'), ('23', 'Q23 가장 잘 된 점 · 보완이 시급한 점 · 기타')):
        L.append(f'## {9 if qid == "22" else 10}. {title} (원문)')
        L.append('')
        for it in R['free'][qid]:
            L.append(f"- {it['pid']}: " + ('(내용 없음)' if it['empty'] else it['text'].replace('\n', ' / ')))
        L.append('')

    # 회차별
    if per_session and len(per_session) > 1:
        L.append('## 11. 회차별 반응 척도 평균(참고)')
        L.append('')
        L.append('| 문항 | ' + ' | '.join(f'{k} (n={v["N"]})' for k, v in per_session.items()) + ' |')
        L.append('|---|' + '---|' * len(per_session))
        for qid in LIKERT_IDS:
            L.append(f'| {qid} | ' + ' | '.join(fmt(v['likert'][qid].get('mean')) for v in per_session.values()) + ' |')
        L.append('')
    return '\n'.join(L) + '\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('tsv', nargs='+')
    ap.add_argument('--label', default='예비교사 재평가')
    ap.add_argument('--out', required=True)
    ap.add_argument('--json', default=None)
    a = ap.parse_args()

    choices, grid = load_spec()
    records, seen = [], set()
    for path in a.tsv:
        header, body = read_tsv(path)
        cols = map_columns(header)
        for cells in body:
            ts = parse_ts(cells[cols['ts']]) if 'ts' in cols else None
            key = (ts.isoformat() if ts else None, cells[cols['ts']] if 'ts' in cols else tuple(cells))
            if key in seen:
                continue
            seen.add(key)
            consent = cells[cols['consent']].strip() if 'consent' in cols else ''
            if consent and not consent.startswith('동의합니다'):
                print(f'[제외] 동의하지 않음: {cells[cols["ts"]]}', file=sys.stderr)
                continue
            session = cells[cols['session']].strip() if 'session' in cols and cols['session'] < len(cells) else ''
            records.append({'ts': ts, 'session': session, 'cells': cells, 'cols': cols})
    records.sort(key=lambda r: (r['ts'] or dt.datetime.min))
    for i, r in enumerate(records, 1):
        r['pid'] = f'P{i}'

    R = analyze(records, choices, grid)
    per_session = {}
    for s in R['sessions']:
        sub = [r for r in records if (r['session'] or '(미기재)') == s]
        per_session[s] = analyze(sub, choices, grid)

    md = render_md(R, a.label, a.tsv, per_session)
    with io.open(a.out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(md)
    if a.json:
        dump = {'label': a.label, 'generated': dt.datetime.now().isoformat(timespec='seconds'), 'sources': a.tsv,
                'all': R, 'per_session': per_session, 'round1_reference': {'N': ROUND1_N, 'items': ROUND1}}
        with io.open(a.json, 'w', encoding='utf-8') as f:
            json.dump(dump, f, ensure_ascii=False, indent=1, default=str)
    print(f'N={R["N"]} · 회차 {dict(R["sessions"])} → {a.out}')


if __name__ == '__main__':
    main()
