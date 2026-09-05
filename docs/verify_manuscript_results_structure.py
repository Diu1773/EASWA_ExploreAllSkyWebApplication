"""Check the results reorganization against its source manuscript and workbook."""
import argparse
import difflib
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from openpyxl import load_workbook
from restructure_manuscript_results import tables_by_title
from survey.render_teacher_feedback_for_paper import START, END, existing_notes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--paper', type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).parent
    record_path = root / 'MANUSCRIPT_RESULTS_STRUCTURE_20260906.json'
    record = json.loads(record_path.read_text(encoding='utf-8'))
    original = args.paper.read_bytes()
    assert b'\r\r\n' not in original, 'Duplicated Windows line terminator'
    text = original.decode('utf-8').replace('\r\n', '\n')
    before = Path(record['backup']).read_text(encoding='utf-8')
    body = text.split(START, 1)[0]
    old_tables, new_tables = tables_by_title(before), tables_by_title(text)
    checked = []
    for title, table in old_tables.items():
        if title in ('연구 절차', '설계 요구와 현재 구현 기능의 대응'):
            continue
        expected = re.sub(r'표\s+(4-\d+)(?!\d)',
                          lambda m: '표 ' + record['table_map'].get(m[1], m[1]), table)
        if title == '사용자 검토 조사 도구의 구성':
            expected = expected.replace('개선 요구 우선순위, 수업 적용 가능성',
                                        '보완 요구의 분포와 구체 의견, 수업 적용 가능성')
        assert expected == new_tables[title], title
        checked.append(title)
    assert '| 6단계. 개발 산출값–기준값 점검 |' in text
    assert next(l for l in text.splitlines() if l.startswith('| 6단계.')).endswith('| 3 |')
    assert record['rq4_after'] in text and record['rq4_before'] not in text
    assert before.split('# 참고문헌', 1)[1].split(START, 1)[0].strip() == body.split('# 참고문헌', 1)[1].strip()
    assert existing_notes(before) == existing_notes(text)
    assert len(existing_notes(text)) == 66
    assert re.findall(r'^\*\*표 (4-\d+)\.', body, re.M) == [f'4-{i}' for i in range(1, 17)]
    assert not re.search(r'4\.7\.[1-4]', body)
    assert '설계 요구와 현재 구현 기능의 대응' not in body
    s444 = body.split('### 4.4.4.', 1)[1].split('### 4.4.5.', 1)[0]
    assert '표 4-7. 산출값과 기준값 비교 결과' in s444
    s45 = body.split('## 4.5.', 1)[1].split('## 4.6.', 1)[0]
    s46 = body.split('## 4.6.', 1)[1].split('## 4.7.', 1)[0]
    s47 = body.split('## 4.7.', 1)[1].split('# Ⅴ.', 1)[0]
    assert '### 4.6.1.' in s46 and '### 4.6.2.' in s46
    assert '표 4-15.' in s46 and '표 4-16은' in s46 and '표 4-16.' in s46
    assert len(s47) < 700 and '산출값–기준값' not in s47 and 'Q23/' not in s47
    assert '표 A-1. 현직교사 응답에서 도출한 개선사항과 반영 계획' in text.split(START, 1)[1]
    assert 'EASWA 프로토타입 반응 척도 결과는 표 4-10과 같다' in s45
    assert '어려움 단계 응답은 표 4-11과' in s45
    assert '보완 요구·활용 의향 응답은 표 4-12와 같다' in s45
    assert '설계 원리와 현장 검토 결과의 연결은 표 4-13과 같다' in s45
    assert '개발 과정에서는 산출값–기준값 비교로 분석 기능을 점검' in text
    assert 'a revision reflecting that review is complete' not in text
    assert '두 차례의 조사는 같은 방식으로 운영한다' not in text
    assert '두 차례의 조사는 모두 로그인 없이 진행하였으므로' not in text
    assert '활용 장벽을 실제로 해소하는지를' not in text
    assert '2차 조사의 자가점검 응답은 정답률로 해석할 수 있으나' not in text
    assert '1차 현장 전문가 검토는 2026년 7월 24일에 실시하였고' in text
    assert '두 시연 사이의 약 6주 동안에는' in text
    assert '전체 정보구조와 시각 디자인의 재설계' in text
    assert '| 10단계. 최종 구현 및 검토 결과 정리 [예정] |' in text
    assert '표 3-4는 1차 현장 전문가 검토에 사용한 조사 도구의 기본 구성' in text
    assert '조사에 사용할 배포본과 실제 저장 결과에서 첫 선택이 유지되는지 확인한 뒤 분석하며' in text
    conclusion = body.split('## 6.1.', 1)[1].split('## 6.2.', 1)[0]
    third, fourth = conclusion.split('셋째,', 1)[1].split('넷째,', 1)
    assert '4.4.4' in third and '산출값–기준값 비교에서는' not in fourth
    # Verify the distinct-person basis and checkbox counts from the original cells.
    audit = json.loads((root / 'survey/teacher_feedback_audit_2026-07-24.json').read_text(encoding='utf-8'))
    book = load_workbook(audit['original_workbook']['path'], read_only=True, data_only=True)
    sheet = book.worksheets[0]
    term_cells = {'AJ3': 2, 'AJ7': 6, 'AJ11': 10, 'AE11': 10}
    assert all(any(w in str(sheet[c].value) for w in ('용어', '기호')) for c in term_cells)
    assert len(set(term_cells.values())) == 3
    assert '자연스럽게 읽히지 않는 설명' in sheet['AK10'].value
    assert '학습자 스스로 진단' in sheet['AK13'].value
    assert 'BTJD, BJD, Rp/R*' in sheet['I12'].value
    checkbox = {}
    for key, expected in [('해석', 7), ('STEP', 4), ('활동지', 6)]:
        ids = [i-1 for i in range(2, 14) if key in str(sheet[f'AG{i}'].value)]
        assert len(ids) == expected, (key, ids)
        checkbox[key] = ids
    book.close()
    # Running the actual generator must preserve the rewritten main text and notes.
    with tempfile.TemporaryDirectory(prefix='easwa-paper-structure-') as directory:
        folder = Path(directory)
        (folder / '원고_백업').mkdir()
        target = folder / args.paper.name
        target.write_bytes(original)
        subprocess.run([sys.executable, '-X', 'utf8', str(root / 'survey/render_teacher_feedback_for_paper.py'),
                        '--paper', str(target)], check=True, capture_output=True)
        regenerated = target.read_text(encoding='utf-8')
        assert regenerated == text, 'Generator must be idempotent for the complete manuscript\n' + ''.join(
            list(difflib.unified_diff(text.splitlines(keepends=True), regenerated.splitlines(keepends=True)))[:35])
    assert args.paper.read_bytes() == original, 'Concurrent manuscript edit during verification'
    diff = ''.join(difflib.unified_diff(before.splitlines(keepends=True), text.splitlines(keepends=True),
                    fromfile='v14-before-results-structure', tofile='v14-after-results-structure', n=0))
    (root / 'MANUSCRIPT_RESULTS_STRUCTURE_20260906.diff').write_text(diff, encoding='utf-8')
    record.pop('unchanged_tables_including_relocated_plan', None)
    record.update(status='PASS', sha256=hashlib.sha256(original).hexdigest(),
                  source_tables_checked=len(checked),
                  intentional_method_table_updates=['연구 절차', '사용자 검토 조사 도구의 구성'],
                  korean_particle_crossreferences_verified=True,
                  original_checkbox_respondents=checkbox,
                  direct_term_comment_respondents=sorted(set(term_cells.values())),
                  generator_full_manuscript_idempotence=True,
                  verification_script='docs/verify_manuscript_results_structure.py')
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(record, ensure_ascii=False))


if __name__ == '__main__':
    main()
