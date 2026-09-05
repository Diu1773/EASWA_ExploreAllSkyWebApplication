"""Verify source coverage, review history, manuscript links and preserved notes."""
import argparse
import hashlib
import html
import json
import re
import subprocess
from collections import Counter
from pathlib import Path
from openpyxl import load_workbook
from teacher_feedback_decisions import DECISIONS
from render_teacher_feedback_for_paper import existing_notes, appendix, cell

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--paper',type=Path,required=True)
    parser.add_argument('--before',type=Path,required=True);args=parser.parse_args()
    root=Path(__file__).parent
    data=json.loads((root/'teacher_feedback_audit_2026-07-24.json').read_text(encoding='utf-8'))
    paper=args.paper.read_text(encoding='utf-8');preview=args.paper.with_name('EASWA_서술형_응답별검토_v14.html').read_text(encoding='utf-8')
    book=load_workbook(data['original_workbook']['path'],read_only=True,data_only=True);sheet=book.worksheets[0]
    substantive=[r for r in data['individual_reviews'] if r['content_status']=='substantive']
    notes=existing_notes(paper);ids=[];no_action=0;action_links=Counter()
    for r in data['individual_reviews']:
        value=sheet[r['cell']].value;value='' if value is None else str(value)
        if r['id']=='Q21_OTHER/R10':assert r['source_text'] in value and r['source_cell_text']==value
        else:assert value==r['source_text'],r['id']
        if r['content_status']!='substantive':continue
        assert cell(r['source_text']) in paper,r['id']
        assert f'<div class="source">{html.escape(r["source_text"])}</div>' in preview,r['id']
        for n,u in enumerate(r['units'],1):
            uid=f'{r["id"]}.{n}';ids.append(uid)
            assert u['initial_judgment']==DECISIONS[r['id']][n-1],uid
            assert u['user_note'] in notes[uid],uid
            assert len(re.findall(r'^\| '+re.escape(uid)+r' / ',paper,re.M))==1,uid
            assert set(u['actions'])<=set(data['action_definitions']),uid
            no_action+=not u['actions'];action_links.update(u['actions'])
    assert len(substantive)==44 and len(ids)==len(set(ids))==66 and len(notes)==66
    assert preview.count('<article>')==44 and preview.count('<details>')==66
    assert all(not u['actions'] for r in substantive if r['question']=='Q20-1' for u in r['units'])
    assert not re.search(r'\bA(?:0[1-9]|1[0-3])\b',paper),'Obsolete action ID in current paper'
    assert set(re.findall(r'Q(?:\d+(?:-\d+)?|21_OTHER)/R\d+',paper))<={r['id'] for r in data['individual_reviews']}
    # Round-trip all actual notes, then check a manual note containing a literal pipe.
    assert existing_notes(appendix(substantive,notes,'4-17'))==notes
    manual=dict(notes);manual[ids[0]]+=' / 수동 메모 | 유지'
    assert existing_notes(appendix(substantive,manual,'4-17'))==manual
    def refs(t):return t.split('# 참고문헌',1)[1].split('<!-- EASWA_RESPONSE_REVIEW_START -->',1)[0].strip()
    assert refs(paper)==refs(args.before.read_text(encoding='utf-8')),'Bibliography changed'
    baseline=json.loads(subprocess.check_output(['git','show','72b8264:docs/survey/teacher_feedback_audit_2026-07-24.json'],encoding='utf-8'))
    assert data['quantitative']==baseline['quantitative'] and data['counts']==baseline['counts']
    assert data['original_workbook']['sha256']==baseline['original_workbook']['sha256']
    # Current action table references cannot quietly mix Q6 into direct EASWA evidence.
    plan=paper.split('현직교사 응답에서 도출한 개선사항과 반영 계획**',1)[1].split('\n\n',2)[1]
    assert 'Q6/R06（기존 서비스 참고）' in plan and 'Q6/R11（EASWA 보충）' in plan
    book.close()
    result=dict(status='PASS',source_positions=66,substantive_responses=44,meaning_units=66,
        source_texts_exact=True,initial_judgments_preserved=66,researcher_notes_preserved=66,
        units_without_forced_action=no_action,action_unit_links=dict(action_links),
        original_quantitative_and_category_counts_unchanged=True,bibliography_unchanged=True,
        manual_note_roundtrip=True,html_cards=44,html_history_controls=66,
        manuscript_sha256=hashlib.sha256(args.paper.read_bytes()).hexdigest(),
        limits='Checks source preservation and links; does not certify interpretation validity, independent coder agreement, or web implementation.')
    (root/'researcher_review_verification_2026-09-06.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
