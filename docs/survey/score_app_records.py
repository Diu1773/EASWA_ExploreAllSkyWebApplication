# -*- coding: utf-8 -*-
"""앱 익명 기록(시트 CSV) 소급 채점 + 서술 응답률 집계.

사용법:
    python -X utf8 docs/survey/score_app_records.py docs/survey/data/익명제출EASWA.csv 2026-07-24
    python -X utf8 docs/survey/score_app_records.py docs/survey/data/익명제출EASWA.csv 2026-09-06 2026-09-07

- 시트는 「파일 → 다운로드 → CSV」로 내보낸 것(첫 행 = 헤더). gviz CSV도 같은 형식이다.
- 필터(RESULTS_2026-07-24 와 동일): app_version == render · UA 에 HeadlessChrome/Claude 없음 ·
  anon_id 에 DELETE-ME 없음 · target_id 가 '__' 로 시작하지 않음 · 지정한 날짜.
- 정답 키는 빌드에 따라 다르다. 2026-08-11 이전 기록은 7/24 빌드(2956d24) 키를 쓴다:
  Lab 채점 가능 12문항(OX 6 + 선택 6, rec_q2 가 선택형이었음). 이후는 11문항(rec_q2 서술형).
- 수치는 만들지 않는다. 시트에 없는 것은 「없음」으로 찍힌다.
"""
import csv
import json
import sys
import io
import collections
import datetime as dt

KEY_0724 = {
    'select_q1': 'X', 'select_q2': '목표 별과 비슷한 밝기',
    'run_q1': 'X',    'run_q2': '두 별이 똑같이 겪은 변화 (망원경 흔들림·온도 변화 등)',
    'qc_q1': 'X',     'qc_q2': '여러 안정된 별을 함께 써서 개별 오차를 평균한다',
    'lc_q1': 'O',     'lc_q2': '행성이 별에 비해 크다',
    'fit_q1': 'X',    'fit_q2': '행성 반지름이 별 반지름의 10%',
    'rec_q1': 'X',    'rec_q2': '데이터 품질(TESS 노이즈)',
}
OPEN_0724 = ['select_q3', 'run_q3', 'qc_q3', 'lc_q3', 'fit_q3', 'rec_q3']
KEY_NOW = {k: v for k, v in KEY_0724.items() if k != 'rec_q2'}
OPEN_NOW = OPEN_0724 + ['rec_q2']
SELFCHECK_0724 = {'tr_meta_sc1': 'O', 'tr_meta_sc2': 'O', 'tr_cond_sc1': 'X'}
SELFCHECK_NOW = dict(SELFCHECK_0724, tr_cmp_sc1='O', tr_cmp_sc2='0')  # tr_cmp_sc2: correctIndex 0
CUTOVER = dt.date(2026, 8, 11)


def load(path):
    with io.open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def day(s):
    s = (s or '').strip()
    for fmt in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d',
                '%Y. %m. %d %H:%M:%S', '%m/%d/%Y %H:%M:%S'):
        try:
            return dt.datetime.strptime(s[:19], fmt).date()
        except ValueError:
            pass
    return None


def keep(r, dates):
    ua = r.get('user_agent', '') or ''
    if (r.get('app_version') or '').strip() != 'render':
        return False
    if 'HeadlessChrome' in ua or 'Claude' in ua:
        return False
    if 'DELETE-ME' in (r.get('anon_id') or ''):
        return False
    if (r.get('target_id') or '').startswith('__'):
        return False
    d = day(r.get('created_at')) or day(r.get('updated_at'))
    return d in dates


def pick(d, field):
    """steps_note_json 의 키는 'step6_reflect:transit_visible' 처럼 스텝 접두어가 붙는다.
    접두어 유무를 모두 받는다."""
    if field in d:
        return d[field]
    for k, v in d.items():
        if k.rsplit(':', 1)[-1] == field:
            return v
    return None


def jload(s, default):
    try:
        return json.loads(s) if s and s.strip() else default
    except Exception:
        return default


def main(path, *dates):
    dates = {dt.date.fromisoformat(d) for d in dates}
    rows = [r for r in load(path) if keep(r, dates)]
    first = min(dates)
    if first < CUTOVER:
        key, opens, sckey, keyname = KEY_0724, OPEN_0724, SELFCHECK_0724, '7/24 빌드(2956d24) · Lab 채점 12문항'
    else:
        key, opens, sckey, keyname = KEY_NOW, OPEN_NOW, SELFCHECK_NOW, '현재 빌드 · Lab 채점 11문항'
    out = []
    P = out.append
    uniq = len({r['anon_id'] for r in rows})
    P(f"# 앱 기록 소급 채점 — {', '.join(sorted(map(str, dates)))}  (행 {len(rows)} · 고유 anon {uniq})")
    P(f"정답 키: {keyname}\n")

    # 1. Lab 채점
    per_item = collections.OrderedDict((k, {'n': 0, 'ok': 0, 'raw': collections.Counter()}) for k in key)
    per_person = []
    for r in rows:
        g = jload(r.get('lab_guide_json'), {})
        if not isinstance(g, dict):
            continue
        n = ok = 0
        for k, ans in key.items():
            a = g.get(k)
            if a in (None, ''):
                continue
            per_item[k]['n'] += 1
            per_item[k]['raw'][str(a)] += 1
            n += 1
            if str(a).strip() == ans:
                per_item[k]['ok'] += 1
                ok += 1
        if n:
            per_person.append((r['anon_id'][:8], ok, n))
    tot_n = sum(v['n'] for v in per_item.values())
    tot_ok = sum(v['ok'] for v in per_item.values())
    P("## 1. 정밀 분석(Lab) 채점 가능 문항")
    P(f"- 응답 있는 기록: **{len(per_person)}건** / 전체 {len(rows)}건")
    if tot_n:
        P(f"- 전체 정답률: **{tot_ok}/{tot_n} = {100 * tot_ok / tot_n:.0f}%**")
    else:
        P("- 전체 정답률: **응답 없음**")
    P("\n| 문항 | 응답 | 정답 | 정답률 | 응답 분포 |\n|---|---|---|---|---|")
    for k, v in per_item.items():
        rate = f"{100 * v['ok'] / v['n']:.0f}%" if v['n'] else '—'
        dist = ', '.join(f"{a[:18]}×{c}" for a, c in v['raw'].most_common())
        P(f"| {k} | {v['n']} | {v['ok']} | {rate} | {dist} |")
    P("\n개인별(anon 8자리, 정답/응답): " + ', '.join(f"{a} {o}/{n}" for a, o, n in per_person))

    # 2. Lab 서술 응답률
    P("\n## 2. 정밀 분석(Lab) 서술 문항 응답률")
    P("| 문항 | 응답 수 | 평균 글자수 |\n|---|---|---|")
    texts = collections.defaultdict(list)
    for r in rows:
        g = jload(r.get('lab_guide_json'), {})
        if not isinstance(g, dict):
            continue
        for k in opens:
            a = g.get(k)
            a = a.strip() if isinstance(a, str) else a
            if a:
                texts[k].append((r['anon_id'][:8], str(a)))
    for k in opens:
        t = texts.get(k, [])
        avg = f"{sum(len(x) for _, x in t) / len(t):.0f}" if t else '—'
        P(f"| {k} | {len(t)} | {avg} |")

    # 3. 블럭 자가점검
    P("\n## 3. 블럭 생각해보기(자가점검)")
    sc_item = collections.OrderedDict((k, [0, 0]) for k in sckey)
    for r in rows:
        for e in jload(r.get('selfcheck_json'), []) or []:
            if not isinstance(e, dict):
                continue
            k = e.get('id')
            if k in sc_item:
                sc_item[k][0] += 1
                c = e.get('correct')
                if c is True or str(c).lower() == 'true':
                    sc_item[k][1] += 1
    P("| 문항 | 응답 | 정답 |\n|---|---|---|")
    for k, (n, ok) in sc_item.items():
        P(f"| {k} | {n} | {ok} |")
    P(f"- 합계 {sum(o for _, o in sc_item.values())}/{sum(n for n, _ in sc_item.values())}")

    # 4. Step 6 기록
    P("\n## 4. Step 6 기록")
    vis = collections.Counter()
    iss = collections.Counter()
    refc, nxt = [], []
    for r in rows:
        s = jload(r.get('steps_note_json'), {})
        if not isinstance(s, dict):
            continue
        v = pick(s, 'transit_visible')
        if v:
            vis[v] += 1
        i = pick(s, 'issues_observed')
        if isinstance(i, str):
            i = jload(i, i)          # 값이 JSON 문자열로 저장된 행이 있다
        for x in (i if isinstance(i, list) else ([i] if i else [])):
            iss[x] += 1
        for fld, bucket in (('reference_comparison', refc), ('next_step', nxt)):
            t = pick(s, fld)
            if isinstance(t, str) and t.strip():
                bucket.append((r['anon_id'][:8], t.strip()))
    P(f"- transit_visible: {dict(vis)}")
    P(f"- issues_observed: {dict(iss)}")
    P(f"- reference_comparison 서술: **{len(refc)}건** · next_step 서술: **{len(nxt)}건**")

    # 5. 원문 덤프
    P("\n## 5. 서술 원문 (부호화용 — 사전 범주: 자료 품질 / 분석 조건 / 모델 가정 / 미귀속)")
    P("> 도움말에 있던 낱말(비교성 품질·별빛 오염·구경·ROI·잡음·모델 가정)만 되읊은 응답과 그 밖의 근거를 댄 응답을 갈라서 센다.")
    HELPER = ['비교성', '별빛', '오염', '구경', 'ROI', '잡음', '모델', '가정',
              '품질', '크기', '시야', 'Sector', '섹터', '변경', '확대', '분석']
    for title, bucket in (('reference_comparison', refc), ('next_step', nxt)):
        P(f"\n### {title}")
        for a, t in bucket:
            stripped = t
            for w in HELPER:
                stripped = stripped.replace(w, '')
            own = len([c for c in stripped if c.isalnum()])
            tag = '  ← **도움말 낱말 외 내용 거의 없음**' if own <= 3 else ''
            P(f"- [{a}] {t}{tag}")
    for k in opens:
        P(f"\n### Lab {k}")
        for a, t in texts.get(k, []):
            P(f"- [{a}] {t}")

    md = '\n'.join(out)
    dst = f"docs/survey/앱기록_소급채점_{'_'.join(sorted(map(str, dates)))}.md"
    io.open(dst, 'w', encoding='utf-8').write(md + '\n')
    print(md)
    print(f"\n[saved] {dst}")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], *sys.argv[2:])
