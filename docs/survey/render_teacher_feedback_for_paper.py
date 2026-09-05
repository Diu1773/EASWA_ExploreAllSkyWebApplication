"""Put the response judgments in a manuscript appendix and a readable review view.

The manuscript remains the user's working draft. Existing user-comment cells in
the generated appendix are preserved by stable meaning-unit ID when regenerated.
"""
import argparse
import datetime
import html
import json
import re
from pathlib import Path

START = '<!-- EASWA_RESPONSE_REVIEW_START -->'
END = '<!-- EASWA_RESPONSE_REVIEW_END -->'


def cell(value):
    return str(value).replace('|', '\\|').replace('\n', '<br>')


def existing_notes(text):
    notes = {}
    for line in text.splitlines():
        if not re.match(r'^\| Q(?:\d+(?:-\d+)?|21_OTHER)/R\d+\.\d+ ',line):
            continue
        cells = re.split(r'(?<!\\)\|',line)[1:-1]
        if len(cells)==5 and cells[-1].strip() not in ('','—','검토 예정'):
            key = cells[0].strip().split(' ')[0]
            notes[key] = cells[-1].strip().replace('\\|','|')
    return notes


def appendix_rows(reviews, notes):
    lines=[]
    for r in reviews:
        for n,u in enumerate(r['units'],1):
            uid=f"{r['id']}.{n}"
            raw=r['source_text'] if n==1 else '(같은 응답의 다음 의미 단위)'
            judgment=f"{u['meaning']}<br>**{u['decision']}** — {u['rationale']}"
            lines.append('| '+' | '.join(cell(x) for x in (uid+' / '+r['cell'],raw,judgment,'·'.join(u['actions']) or '해당 없음',notes.get(uid,'—')))+' |')
    return lines


def appendix(reviews,notes,action_number='A-1',category_number='4-14',data=None):
    lines=[START,'','# 부록 A. 현직교사 서술형 응답별 판정표 — 연구자 검토용','',
        f'본문의 범주 요약(표 {category_number})에 대응하는 응답별 판정 기록이다. 한 답에 여러 요구가 있으면 의미 단위로 나누었다. ID의 Q는 문항, R은 원본 응답 순서, 마지막 숫자는 해당 답의 의미 단위를 뜻한다. 예: Q23/R09.1 = 문항 23, 응답자 9, 첫 번째 내용. 원본 셀 주소도 함께 적었다. 응답 순서는 개인 식별자가 아니다.','',
        f'**연구자의 응답별 검토 의견을 반영하여 판정을 보정하였다.** 마지막 열은 연구자 의견의 요약이며 응답자의 원문과 구분한다. 최초 AI 판정과 연구자 검토 전문은 별도 분석 기록에 보존하였다. 개선 번호는 개별 해석 뒤 필요한 조치를 묶은 것으로 표 {action_number}과 연결된다. 시연 전 보완 범위의 선정 근거는 본문 4.6.1에, 실제 반영 내역은 4.6.2에 제시한다. 개선1·3은 용어·정보 이해와 단계 수행 지원에 관한 우선 항목이며, 개선2는 실제 확인한 어색한 문장의 교정을 병행하는 항목이다. 전면 문체 정비와 개선4~9는 향후 과제이다. 번호가 없는 응답도 장점·맥락·한계·논의·수행 자료로 분석에 포함되며 구현 완료와 구분한다.','',
        '## A.1. 기존 12명 — 내용 있는 응답 42개','',
        '의견 문항 35개 + 차이 원인 설명 6개 + Q21 기타 직접 입력 1개다. 문항별 인원 합을 서로 다른 사람 수로 해석하지 않는다.','']
    for question in ('Q6','Q20','Q20-1','Q22','Q23','Q21 기타'):
        group=[r for r in reviews if r['question']==question and r['respondent']<=12 and r['content_status']=='substantive']
        lines += [f"### {question} · {len(group)}개 응답",'',group[0]['question_text'],'',
            '| 판정 ID / 원본 셀 | 응답 원문 | 보정 판정과 이유 | 개선 번호 | 연구자 의견 요약·추가 메모 |',
            '|---|---|---|---|---|']
        lines += appendix_rows(group,notes)+['']
    late=[r for r in reviews if r['respondent']>12 and r['content_status']=='substantive']
    lines += ['## A.2. 추가 응답자 — 판정은 포함, 기존 12명 집계에는 미포함','',
        '7월 24일 21:45 제출분이다. 시연 참가 여부 확인 전이며, 응답 내용은 누락하지 않고 판정한다.','',
        '| 판정 ID / 원본 셀 | 응답 원문 | 보정 판정과 이유 | 개선 번호 | 연구자 의견 요약·추가 메모 |','|---|---|---|---|---|']
    lines += appendix_rows(late,notes)
    lines += ['','## A.3. 내용 없는 응답도 기록','',
        '빈칸과 문장부호만 적은 응답을 어려움 없음이나 긍정으로 바꾸지 않는다. 아래에는 원본 13개 응답을 모두 포함했다.','',
        '| 유형 | 응답 ID와 셀 | 처리 |','|---|---|---|']
    for status,label in [('blank','빈칸 17개'),('punctuation_only','마침표만 5개')]:
        ids=' · '.join(f"{r['id']} ({r['cell']})" for r in reviews if r['content_status']==status)
        lines.append(f'| {label} | {ids} | 분석 가능한 내용 없음 |')
    if data is not None:
        lines += ['','## A.4. 응답별 검토에서 도출한 전체 보완 계획','',
            '전체 조치와 응답의 연결을 보존하기 위한 목록이다. 응답 빈도로 정렬한 시급성 순위가 아니며, 구체적인 반영 범위와 확인 상태는 본문 4.6에서 구분한다.','',
            f'**표 {action_number}. 현직교사 응답에서 도출한 개선사항과 반영 계획**','',action_table(data),'']
    lines += ['',END,'']
    return '\n'.join(lines)


def action_table(data):
    rows=['| 번호 / 개선사항 | 근거 응답 | 구체적인 개선 내용 | 판정·반영 시점 |','|---|---|---|---|']
    for aid,values in data['action_definitions'].items():
        if aid=='KEEP':continue
        title,principle,action,check=values
        refs=[]
        for r in data['individual_reviews']:
            if r['respondent']<=12 and any(aid in u['actions'] for u in r['units']):
                scope='（기존 서비스 참고）' if r['domain']=='기존 서비스' else '（EASWA 보충）' if r['domain']=='EASWA 보충' else ''
                refs.append(r['id']+scope)
        timing=data['action_timing'].get(aid,'개선 필요성 검토. 실제 반영 내역은 본문 4.6.2에 기록')
        rows.append('| '+' | '.join(cell(x) for x in (aid+' '+title,' · '.join(refs),action,timing))+' |')
    return '\n'.join(rows)


def review_html(data,notes,out):
    e=html.escape
    parts=['<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>EASWA 서술형 응답별 판정 — v14 검토용</title>',
    '''<style>
    *{box-sizing:border-box}body{margin:0;background:#f4f5f7;color:#20252b;font:16px/1.8 "Malgun Gothic","Apple SD Gothic Neo",sans-serif}
    main{max-width:1180px;margin:36px auto;padding:0 28px}h1{font-size:28px;margin:0 0 8px}h2{font-size:22px;margin:42px 0 14px}h3{font-size:17px;margin:0 0 12px}
    .lead,.notice{background:white;padding:22px 26px;border:1px solid #d7dbe1;border-radius:8px}.notice{border-left:4px solid #356285;margin:18px 0}
    nav{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}nav a{background:white;padding:6px 14px;border:1px solid #cbd1d9;border-radius:4px;color:#28577b;text-decoration:none}
    article{background:white;border:1px solid #d7dbe1;border-radius:8px;padding:24px;margin:20px 0;break-inside:avoid}.meta{color:#5a626e;font-size:13px}.source{border-left:3px solid #b4bcc7;background:#f7f8fa;padding:16px 18px;white-space:pre-wrap;margin:16px 0 22px}
    table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:14px}th,td{border:1px solid #d7dbe1;padding:12px;vertical-align:top;overflow-wrap:anywhere}th{background:#edf1f5;text-align:left}.units th:nth-child(1){width:23%}.units th:nth-child(2){width:42%}.units th:nth-child(3){width:12%}.units th:nth-child(4){width:23%}
    .decision{display:block;font-weight:700;color:#28577b;margin-bottom:6px}.comment{min-height:64px;color:#303943}.actions{background:white}.actions th:nth-child(1){width:22%}.actions th:nth-child(2){width:54%}.actions th:nth-child(3){width:24%}details{font-size:12px;color:#68717a;margin-top:14px}summary{cursor:pointer}.now{background:#edf7f1}.question{font-size:14px;color:#58626b;margin-top:10px}
    @media(max-width:700px){main{padding:0 14px}article{padding:16px}.table-scroll{overflow-x:auto}.units{min-width:760px}.actions{min-width:760px}}
    @media print{body{background:white;font-size:11pt}main{max-width:none;margin:0;padding:0}nav{display:none}article{break-inside:auto;border-radius:0}thead{display:table-header-group}tr{break-inside:avoid}}
    </style><main>''',
    '<header class="lead"><h1>응답별 검토 의견을 반영했습니다</h1><p>원문 → 연구자 의견 요약 → 보정 판정 → 필요한 개선만 연결</p>',
    '<p>기존 12명의 의견 35개·수행 설명 6개·Q21 기타 1개, 추가 응답자의 의견 2개를 모두 확인했습니다. 내용 있는 응답 44개를 66개 의미 단위로 나눴습니다. 추가 응답은 12명 집계에 더하지 않았습니다.</p></header>',
    '<aside class="notice"><b>시연 전 우선 후보 3개 · 향후 과제 6개</b><br>① 용어·영어·그래프 기본 표기 ② 눈에 띄는 어색한 문장 ③ 단계 안내·도움 질문·이해 점검. 난이도·차시 우려를 전부 긴급 수정으로 바꾸지 않았습니다. 문체 전체 검수는 지속 과제이며 퀴즈 팝업은 미확정 아이디어입니다. 연구자 의견은 요약이며 보정 판정은 그 의견을 반영한 분석안입니다. 각 행에서 최초 AI 판정도 펼쳐 볼 수 있습니다.</aside>',
    '<nav><a href="#actions">개선 목록</a>'+''.join(f'<a href="#group-{q}">{dict(other="기타 직접 입력",late="추가 응답").get(q,q)}</a>' for q in ['Q6','Q20','Q20-1','Q22','Q23','other','late'])+'</nav>',
    '<h2 id="actions">개선사항 전체 목록</h2><div class="table-scroll"><table class="actions"><thead><tr><th>번호 / 개선사항</th><th>할 일</th><th>반영 시점</th></tr></thead><tbody>']
    for aid,values in data['action_definitions'].items():
        if aid=='KEEP':continue
        timing=data['action_timing'].get(aid,'개선 필요성 채택 · 구체 반영 순서는 응답별 검토 후 결정')
        klass=' class="now"' if aid in ('개선1','개선2','개선3') else ''
        parts.append(f'<tr{klass}><td><b>{aid} {e(values[0])}</b></td><td>{e(values[2])}</td><td>{e(timing)}</td></tr>')
    parts.append('</tbody></table></div>')
    groups=[(q,q,[r for r in data['individual_reviews'] if r['question']==q and r['respondent']<=12]) for q in ['Q6','Q20','Q20-1','Q22','Q23']]
    groups += [('other','Q21 기타',[r for r in data['individual_reviews'] if r['question']=='Q21 기타']),('late','추가 응답 · 집계 보류',[r for r in data['individual_reviews'] if r['respondent']>12])]
    for gid,title,group in groups:
        parts.append(f'<h2 id="group-{gid}">{e(title)}</h2>')
        for r in group:
            if r['content_status']!='substantive':continue
            parts += [f'<article><h3>{e(r["id"])} · 원본 {r["cell"]}</h3>',f'<div class="meta">{e(r["domain"])} / {e(r["cohort_status"])}</div>',f'<div class="question">질문: {e(r["question_text"])}</div>',f'<div class="source">{e(r["source_text"])}</div>',
                '<div class="table-scroll"><table class="units"><thead><tr><th>의미 단위</th><th>보정 판정과 이유</th><th>개선 번호</th><th>연구자 의견 요약</th></tr></thead><tbody>']
            for n,u in enumerate(r['units'],1):
                uid=f'{r["id"]}.{n}'
                note=notes.get(uid,'검토 예정')
                initial=u.get('initial_judgment',{})
                history=f'<details><summary>최초 AI 판정 · 수정 전</summary>{e(initial.get("decision",""))}<br>{e(initial.get("rationale",""))}<br>종전 연결: {e(" · ".join(initial.get("actions",[])))}</details>'
                parts.append(f'<tr><td><span class="meta">{e(uid)}</span><br>{e(u["meaning"])}</td><td><span class="decision">{e(u["decision"])}</span>{e(u["rationale"])}{history}</td><td>{e(" · ".join(u["actions"]) or "해당 없음")}</td><td class="comment">{e(note)}</td></tr>')
            parts.append('</tbody></table></div></article>')
    parts.append('<p>빈칸 17개와 마침표만 있는 5개는 논문 부록 A.3에 별도 기록했습니다. 44개 응답·66개 의미 단위 모두에 연구자 의견을 연결했습니다. 최초 판정 보존과 누락 검사는 해석의 타당성·독립 부호화 신뢰도·구현 완료의 인증과 구분됩니다.</p></main></html>')
    out.write_text('\n'.join(parts),encoding='utf-8')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--paper',type=Path,required=True)
    args=parser.parse_args()
    data=json.loads((Path(__file__).parent/'teacher_feedback_audit_2026-07-24.json').read_text(encoding='utf-8'))
    original=args.paper.read_bytes();text=original.decode('utf-8').replace('\r\n','\n')
    notes=existing_notes(text)
    for r in data['individual_reviews']:
        for n,u in enumerate(r['units'],1):
            if u.get('user_note'):
                uid=f"{r['id']}.{n}"
                if not notes.get(uid) or notes[uid]==u.get('previous_user_note'):
                    notes[uid]=u['user_note']
                elif u['user_note'] not in notes[uid]:
                    notes[uid]+=' / '+u['user_note']
    suffix=''
    if START in text:
        before,generated=text.split(START,1)
        assert END in generated,'Incomplete generated appendix; preserve manuscript and inspect'
        _,suffix=generated.split(END,1)
        text=before.rstrip()+'\n'
        text=re.sub(r'\n---\s*$','\n',text)
    before_refs=text.split('# 참고문헌',1)[1]
    category=re.search(r'\*\*표 (4-\d+)\. EASWA 관련 자유응답 범주화 결과',text)
    assert category,'Category summary caption not found'
    assert '## 4.7. 보완본에 대한 예비교사 재평가 결과' in text,'Apply results-structure migration before regenerating'
    action_number='A-1'
    ref='개별 자유응답의 원문, 의미 단위별 판정, 개선 번호와 연구자 추가 의견란은 부록 A에 제시하였다.'
    if ref not in text:
        anchor=f'**표 {category[1]}. EASWA 관련 자유응답 범주화 결과 (현직 코호트, N=12)**'
        assert anchor in text;text=text.replace(anchor,ref+'\n\n'+anchor,1)
    assert text.split('# 참고문헌',1)[1]==before_refs,'References changed'
    text=text.rstrip()+'\n\n---\n\n'+appendix(data['individual_reviews'],notes,action_number,category[1],data).rstrip('\n')+(suffix or '\n')
    assert args.paper.read_bytes()==original,'Concurrent manuscript change; retry'
    backup=args.paper.parent/'원고_백업'/f'{args.paper.stem}_응답별부록삽입전_{datetime.datetime.now():%Y%m%d_%H%M%S}.md'
    backup.write_bytes(original)
    args.paper.write_text(text,encoding='utf-8')
    preview=args.paper.with_name('EASWA_서술형_응답별검토_v14.html')
    review_html(data,notes,preview)
    print(json.dumps(dict(paper=str(args.paper),preview=str(preview),source_responses=44,meaning_units=66,preserved_user_notes=len(notes),backup=str(backup)),ensure_ascii=False))


if __name__=='__main__':
    main()
