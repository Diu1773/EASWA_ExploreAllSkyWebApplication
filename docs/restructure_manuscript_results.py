"""Separate development checks, teacher findings, revisions and re-evaluation.

One-time migration. Author notes, raw responses and source tables are preserved.
The appendix generator thereafter owns only the appendix, never the main prose.
"""
import argparse
import datetime
import difflib
import hashlib
import json
import re
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'survey'))
from render_teacher_feedback_for_paper import START,END,appendix,existing_notes

RATIONALE = '''## 4.6. 현장 전문가 검토에 따른 보완
1차 현장 전문가 검토에서 나타난 반응과 요구(4.5)를 바탕으로 시연 전 보완 범위를 정하고, 선정 근거와 실제 반영 내역을 구분하였다. 전체 응답의 개별 판정과 향후 과제를 포함한 보완 목록은 부록 A에 제시하였다.

### 4.6.1. 보완 항목의 선정 근거
우선 보완 항목은 교사 응답의 구체성, 기존 설계 원리와의 관련성, 현재 탐구 흐름에서 수정할 수 있는 범위를 함께 고려하여 선정하였다. 용어와 기본 표기의 이해, 단계 안내와 도움 질문의 발견성은 자료·분석 조건의 확인과 해석 활동에 직접 연결되므로 우선 보완 대상으로 삼았다. 어색한 안내 문장은 실제 화면에서 수정할 표현을 확인하여 함께 교정하는 항목으로 정하였다.

**표 4-18. 시연 전 보완 항목의 선정 근거와 범위**

| 보완 항목 | 교사 응답의 근거 | 설계 원리와 우선 보완 이유 | 이번 보완의 범위 |
|---|---|---|---|
| 개선1. 용어·기호·단위·그래프 기본 표기 | EASWA 문항에서 R02·R06·R10의 3명이 용어·기호 설명을 언급하였다(Q22/R02·R06·R10, Q20/R10). Q6/R11은 축과 BTJD·BJD·Rp/R*·χ²_red·ROI를 지목한 별도 보충 근거다. | 분석 과정 가시화·수업 적용 지원: 정보가 표시되어 있어도 뜻을 이해하기 어렵다면 자료와 분석 조건을 확인하는 활동에 제약이 남는다. | 현재 표시 지점의 짧은 뜻풀이와 축 설명을 점검한다. 기존 번역 기능의 지원 범위와 전문 개념 설명을 구분하며, 상세 이론 전체를 즉시 추가하지 않는다. |
| 개선2. 어색한 안내 문장 교정 | Q23/R09의 1명이 자연스럽게 읽히지 않는 설명의 검토·수정을 명시하였다. | 기술 실행 부담 완화·수업 적용 지원: 안내의 뜻과 다음 행동을 명확히 전달하기 위한 문장 정비다. 다수의 시급한 요구나 학습 저하가 입증된 항목으로 해석하지 않는다. | 실제 화면에서 확인한 모호한 지시·어색한 호응의 교정을 병행한다. 전체 문체 검수는 지속 과제로 두며 AI 작성 여부 판정으로 바꾸지 않는다. |
| 개선3. 단계 안내·도움 질문·이해 점검의 발견성 | Q23/R12는 과정·방법의 이해를 스스로 진단할 질문을 더 눈에 띄게 해 달라고 요구하였다. Q6/R11은 단계별 할 일의 보충 근거이며, Q21의 STEP별 질문·생각해보기 보완은 4명이 선택하였다. | 결과 해석의 학습자 수행·수업 적용 지원: 무엇을 해야 하는지와 질문의 위치를 알아야 기존의 판단·설명 활동에 참여할 수 있다. | 기존 단계 안내와 질문의 위치·목적을 명확히 한다. 새 팝업이나 문항 수 확대를 설문이 직접 요구한 것으로 간주하지 않는다. |

Q21에서는 그래프·분석 결과 해석 도움말을 7명, 활동지·교사용 안내 자료를 6명이 선택하여 해석 지원과 수업 준비에 대한 요구가 함께 나타났다. 이 가운데 현재 화면의 설명·문장·질문을 정비하는 범위를 이번 보완에 포함하였다. 대상 수준에 따른 활동 재구성, 차시 조정, 교사용 자료 개발은 수업 적용 범위와 함께 검토할 후속 과제로 정리하였다. 이 구분은 응답 빈도에 따른 요구의 서열이 아니라, 교사 검토를 바탕으로 연구자가 정한 이번 보완 주기의 범위이다.

### 4.6.2. 실제 반영 내역
표 4-14는 현재 반영 기록이 있는 조치를 정리한 것이다. 우선 보완 대상으로 선정했다는 사실과 구현·배포를 완료했다는 사실은 구분하였다. 자가점검 응답의 저장 조건을 바로잡은 조치는 교사 자유응답에서 도출한 요구와 구별하여 표시하였다.

'''

AFTER_REVISIONS = '''

보완은 학습자가 자료와 분석 조건을 이해하도록 돕는 범위에서 이루어졌다. 실제 사용한 조건과 품질 정보를 확인하게 하되, 차이의 원인과 결론을 대신 작성하지 않는 방향을 유지하였다. 문장 교정과 단계·도움 질문의 발견성은 현재 화면의 반영 상태를 확인하여 기록하고, 선정된 세 항목 전체가 완료되었다고 일괄 처리하지 않는다. 예비교사 재평가에서는 실제 사용한 보완본과 제공 자료를 기준으로 남은 어려움과 보완 요구를 확인한다(4.7).

---

'''

PRESERVICE = '''## 4.7. 보완본에 대한 예비교사 재평가 결과 [예정]
예비교사 조사는 현장 전문가 검토에 따른 보완본(4.6)을 대상으로 실시한다. 조사 방법과 도구 조정은 3.6에 제시하였으며, 현재 결과는 [예정]이다.

조사 후에는 실제 참여자 배경과 수행 범위, 반응 척도, 본인이 어려움을 경험한 단계, 보완 요구와 자유응답을 보고한다. 보완한 용어·안내·질문을 실제로 보거나 사용했는지와 남은 어려움을 함께 확인한다. 1차와 문구 및 응답 관점이 공통인 항목을 중심으로 기술적으로 대조하되, 참여 집단과 산출물이 달라 그 차이만으로 보완의 인과적 효과를 판정하지 않는다.

---

'''

METHOD = '''## 3.7. 개발 산출물의 기술적 점검 방법
개발 과정에서는 식현상 모듈의 산출값과 기준값을 대조하여 자료 처리와 모델 적합 결과의 정합성을 점검하였다. 이 점검은 구현 결과의 기술적 근거이며, 교사 검토에서 얻는 적절성·보완 요구·활용 가능성에 대한 응답과 구분하였다. 산출값 점검 결과는 4.4.4에, 현직교사 검토와 보완 및 예비교사 재평가는 4.5~4.7에 제시한다.

비교에서는 분석 대상, 관측자료와 구간, 분석 조건, 모델 가정, 산출값과 기준값의 출처를 함께 확인하였다. 차이가 발생한 경우 자료 품질과 분석 방법의 영향을 검토하였다. NASA Exoplanet Archive의 공전 주기는 모델의 고정 입력값이므로 적합 결과의 정확도를 평가하는 항목에서 제외하였다. 식 깊이·반지름비의 기준값이 동일한 관측자료에 기반할 수 있다는 점도 고려하여, 기준값과의 일치를 완전히 독립된 정확도 검증으로 해석하지 않았다.

실행 성능은 개발 당시 배포 환경에서 번들 예제 자료의 측광·모델 적합을 호출한 API 부하 기록으로 점검하였다. 동시 요청 수, 요청 간격, 대기·완료 시간, 실패 여부와 자료 다운로드의 포함 여부를 구분하였다. 이 기록은 계산 요청의 처리 범위를 나타내며 브라우저 조작의 편의성, 학교 네트워크 환경, 실제 수업 소요 시간의 검증을 대신하지 않는다(4.4.5).

---

'''

RUNTIME = '''### 4.4.5. 분석 실행과 동시 요청 처리 점검
개발 당시 배포 환경의 실행 성능은 2026년 7월 16일 부하 기록으로 확인하였다. WASP-6 b의 TESS 섹터 2 번들 컷아웃(50×50픽셀, 1,245프레임)을 사용하고, 새 자료 다운로드 없이 측광과 모델 적합을 요청하였다. 실행 상한과 대기 안내를 적용하고 MCMC를 기본 실행에서 제외한 조건에서, 단일 요청의 측광·적합 전체 완료 시간은 3.3초였다. 15개 요청을 3초 간격으로 시작한 조건에서는 15건이 모두 완료되기까지 48.4초가 걸렸고, 15개 적합 요청을 동시에 시작한 조건에서는 15건 모두 45.2초 안에 완료되었다.

이는 단일 노트북에서 독립 연결로 요청을 발생시킨 API 부하 점검이다. 실제 교사 15명의 브라우저 수행 시간이나 모든 대상·관측 구간의 성능을 뜻하지 않는다. 브라우저 자원 로딩과 학교 Wi-Fi, 기기 차이는 포함하지 않았고, 번들 밖 자료의 다운로드 조건도 이 측정 범위에서 제외하였다. 따라서 계산 요청의 처리 가능 범위와 교사의 사용 편의성 응답(4.5)을 구분하였다. 수업 전 서버를 활성화하는 운영 준비는 3.5에 제시하였다.

'''

def clean_section(s):return re.sub(r'\n---\s*$','',s).rstrip()+'\n\n'
def tables_by_title(text):
    result={}
    for m in re.finditer(r'^\*\*표 ([\dA]-\d+)\. ([^\n]+?)\*\*\s*\n\n((?:\|[^\n]*\n)+)',text,re.M):
        result[m[2]]=m[3]
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--paper',type=Path,required=True);args=parser.parse_args()
    original=args.paper.read_bytes();before=original.decode('utf-8').replace('\r\n','\n');text=before
    old_refs=before.split('# 참고문헌',1)[1].split(START,1)[0].strip()
    notes=existing_notes(before);old_tables=tables_by_title(before)
    data=json.loads((Path(__file__).parent/'survey/teacher_feedback_audit_2026-07-24.json').read_text(encoding='utf-8'))
    s44=before.split('## 4.4.',1)[1].split('## 4.5.',1)[0]
    s45=before.split('## 4.5.',1)[1].split('## 4.6.',1)[0]
    s46=before.split('## 4.6.',1)[1].split('## 4.7.',1)[0]
    s471=before.split('### 4.7.1.',1)[1].split('### 4.7.2.',1)[0]
    s37=before.split('## 3.7.',1)[1].split('# Ⅳ.',1)[0]
    # Keep the existing source-backed numerical comparison table and discussion.
    technical='### 4.4.4. 개발 과정의 산출값–기준값 점검\n'+s471.split('\n',1)[1]
    technical=technical.replace('EASWA의 천문학적 타당성을 검토하기 위해 플랫폼 산출값과 기준값을 비교하였다.','개발 과정에서 식현상 분석 기능을 점검하기 위해 플랫폼 산출값과 기준값을 비교하였다.',1)
    technical=technical.replace('이러한 비교는 플랫폼의 과학적 타당성을 확인하는 동시에, 학습자가 실제 자료 분석에서 발생하는 차이를 과학적으로 해석하는 활동의 근거가 된다.','이 비교는 특정 자료와 모델 조건에서 산출값의 차이를 설명할 수 있는지를 점검한 개발 근거다. 교사의 활용 가능성 평가나 학습자의 해석 능력이 입증되었다는 결과로 확대하지 않는다.',1)
    s44='## 4.4.'+s44
    s44=s44.replace('핵심 탐구모듈인 외계행성 식현상 탐구의 구현은 다음과 같다.','### 4.4.1. 외계행성 식현상 모듈\n\n핵심 탐구모듈인 외계행성 식현상 탐구의 구현은 다음과 같다.',1)
    s44=s44.replace('### 공용 워크플로의 두 번째 인스턴스: 미시중력렌즈(KMTNet) 모듈','### 4.4.2. KMTNet 미시중력렌즈 모듈',1)
    s44=s44.replace('### 공용 워크플로의 세 번째 인스턴스: 성단 색등급도(CMD) 모듈','### 4.4.3. 성단 색등급도 모듈',1)
    s44=clean_section(s44)+clean_section(technical)+RUNTIME+'---\n\n'
    # Findings remain in 4.5; remove the repeated research-design explanation.
    s45='## 4.5.'+s45
    s45=re.sub(r'^1차 현장 전문가 검토는[^\n]*','1차 현장 전문가 검토는 2026년 7월 24일 현직 교사연수에서 진행자의 안내에 따른 식현상 모듈 직접 수행으로 실시하였다. 이 절은 연구 참여에 동의한 현직 교사 12명의 배경, 수행과 반응, 보완 요구를 보고한다. 응답은 일반화된 학습 효과의 검증이 아닌 형성적 검토 자료로 해석하며, 이에 따른 보완은 4.6에 제시한다.',s45,count=1,flags=re.M)
    actual=re.search(r'\*\*표 (4-\d+)\. 현장 전문가 검토 결과를 반영한 보완 내역\*\*\s*\n\n(?:\|[^\n]*\n)+',s46)
    assert actual and actual[1]=='4-14'
    start=text.index('## 4.4.');end=text.index('# Ⅴ.',start)
    text=text[:start]+s44+clean_section(s45)+'---\n\n'+RATIONALE+actual[0].rstrip()+AFTER_REVISIONS+PRESERVICE+text[end:]
    # Move the unique non-CVI description to the user-study method; remove its duplicates.
    cvi=next(p for p in s37.split('\n\n') if p.startswith('본 연구는 내용타당도 지수'))
    start=text.index('## 3.7.');end=text.index('# Ⅳ.',start)
    prefix=re.sub(r'\n---\s*$','',text[:start]).rstrip()+'\n\n'+cvi+'\n\n---\n\n'
    text=prefix+METHOD+text[end:]
    old_rq='4. 산출값–기준값 비교, 현장 전문가 검토, 보완 후 예비교사 조사를 통해 나타난 타당성과 보완 요구, 활용 가능성은 무엇인가?'
    new_rq='4. 현직 교사 검토에서 나타난 EASWA의 적절성과 보완 요구는 무엇이며, 이를 반영한 보완본에 대한 예비교사의 반응과 활용 가능성은 어떠한가?'
    assert old_rq in text;text=text.replace(old_rq,new_rq,1)
    text=text.replace('이후 산출값–기준값 비교와 현직 교사 대상 현장 전문가 검토로 타당성과 보완 요구를 확인하고, 보완을 거쳐 예비교사를 대상으로 활용 가능성을 조사한다.','개발 과정에서 산출값–기준값 비교로 분석 기능을 점검하고, 현직 교사 대상 현장 전문가 검토로 적절성과 보완 요구를 확인한 뒤, 보완본에 대한 예비교사의 반응과 활용 가능성을 조사한다.',1)
    old_fourth='넷째, 현재까지 산출값–기준값 비교와 현직 교사 대상 1차 현장 전문가 검토를 수행하였고, 그 결과에 따른 보완을 진행하고 있다. 예비교사 대상 2차 재평가는 [예정]이다. 산출값–기준값 비교에서는 간략화된 학습용 분석이 문헌값과의 차이를 자료 특성과 분석 방법으로 분해해 설명할 수 있음을 확인하였다(4.7.1).'
    assert old_fourth in text
    text=text.replace(old_fourth,'넷째, 현직 교사 대상 1차 현장 전문가 검토에서 적절성과 보완 요구를 확인하였으며, 보완본에 대한 예비교사 재평가는 [예정]이다.',1)
    old_third='다만 형성적 검토와 산출값 비교는 외계행성 식현상 모듈을 중심으로 수행하였다.'
    assert old_third in text
    text=text.replace(old_third,'개발 과정의 산출값–기준값 점검은 식현상 모듈을 대상으로 수행하였으며, 분석 결과의 차이와 이를 해석할 때 고려할 자료·모델 조건을 확인하였다(4.7.1). 교사 대상 형성적 검토도 식현상 모듈을 중심으로 수행하였다.',1)
    text=text.replace('그 가운데 6명이 10~30분 안에 마쳤으며, 같은 세션의 익명 결과 제출 로그에서 모델 적합 완료 14건의 반지름비 중앙값이 기준값과 0.0003 차이였다.','그 가운데 6명이 10~30분 안에 마쳤다.',1)
    text=text.replace('개발 절차와 산출값 검토는 각각 3.5와 4.7에서 제시한다.','개발 절차는 3.5에, 개발 산출물의 점검 방법과 결과는 각각 3.7과 4.4에 제시한다.',1)
    # Relocate all references to old subsections in one non-cascading pass.
    section_map={'4.7.1':'4.4.4','4.7.2':'4.4.5','4.7.3':'4.7','4.7.4':'4.6'}
    text=re.sub(r'4\.7\.[1-4](?!\d)',lambda m:section_map[m[0]],text)
    text=re.sub(r'^본 장은 연구문제에 대응하여 결과를 제시한다\.[^\n]*',
        '본 장은 연구문제에 따라 결과를 제시한다. 4.1은 기존 서비스의 활용 장벽과 설계 시사점(연구문제 1), 4.2와 4.3은 설계 원리와 탐구 주제·공공 천문자료의 선정(연구문제 2), 4.4는 세 모듈의 구현과 개발 과정의 기술적 점검(연구문제 3)을 다룬다. 연구문제 4에 대해서는 현직교사 검토 결과(4.5), 그에 따른 보완(4.6), 보완본에 대한 예비교사 재평가(4.7)의 순서로 제시한다.',text,count=1,flags=re.M)
    text=text.replace('교사연수 규모의 처리 결과(4.4.5)','15개 요청에 대한 개발 부하 점검 결과(4.4.5)')
    text=text.replace('천문학적 타당성에 대한 판단은 산출값–기준값 비교(4.4.4)에','분석 기능의 기술적 정합성 점검은 산출값–기준값 비교(4.4.4)에')
    # Research-procedure table now distinguishes the implementation check from RQ4.
    text=text.replace('| 6단계. 산출값–기준값 비교 |','| 6단계. 개발 산출값–기준값 점검 |')
    lines=text.splitlines()
    for i,line in enumerate(lines):
        if line.startswith('| 6단계. 개발 산출값–기준값 점검 |'):
            cells=line.split('|');cells[-2]=' 3 ';lines[i]='|'.join(cells)
    text='\n'.join(lines)+'\n'
    # Abstracts distinguish the two evidence types and preserve study status.
    text=text.replace('타당성과 활용 가능성은 산출값–기준값 비교와 현직 교사 대상 현장 전문가 검토로 우선 확인하였고, 그 결과에 따른 보완을 진행하고 있다.','개발 과정에서는 산출값–기준값 비교로 분석 기능을 점검하였고, 현직 교사 대상 현장 전문가 검토로 적절성과 보완 요구를 확인하여 보완을 진행하고 있다.',1)
    old="The platform's validity and applicability were examined on a preliminary basis—centered on the transit module—through output–reference comparison and a field-expert review by in-service teachers; a revision reflecting that review is complete, and a follow-up applicability survey with pre-service teachers is [예정]."
    new="Output–reference comparisons provided a technical check of the transit module during development. An in-service teacher review examined perceived appropriateness and revision needs; revisions are in progress, and a follow-up survey of pre-service teachers is [예정]."
    assert old in text;text=text.replace(old,new,1)
    text=text.replace('12 participants—mainly in-service earth-science teachers—performing the full workflow hands-on','12 participants, mainly in-service earth-science teachers, with varying levels of workflow completion',1)
    # Renumber chapter-4 tables in appearance order; full plans now live in appendix A.
    text=text.replace('표 4-17','표 A-1')
    text=text.replace('표 4-15','4.4의 구현 결과')
    captions=re.findall(r'^\*\*표 (4-\d+)\.',text,re.M)
    assert len(captions)==16 and len(set(captions))==16,captions
    table_map={old:f'4-{i}' for i,old in enumerate(captions,1)}
    text=re.sub(r'표\s+(4-\d+)(?!\d)',lambda m:'표 '+table_map[m[1]],text)
    for old,new in [('표 4-10와','표 4-10과'),('표 4-12과','표 4-12와'),
                    ('표 4-13와','표 4-13과'),('표 4-16는','표 4-16은')]:
        text=text.replace(old,new)
    # Replace only the generated appendix and retain any user suffix after it.
    body,generated=text.split(START,1);_,suffix=generated.split(END,1)
    body=re.sub(r'\n---\s*$','',body).rstrip()
    category=re.search(r'\*\*표 (4-\d+)\. EASWA 관련 자유응답 범주화 결과',body)[1]
    text=body+'\n\n---\n\n'+appendix(data['individual_reviews'],notes,'A-1',category,data).rstrip('\n')+(suffix or '\n')
    # Oracles: exact source tables (apart from numeric references), notes and references.
    new_tables=tables_by_title(text)
    for title,table in old_tables.items():
        if title in ['설계 요구와 현재 구현 기능의 대응','현직교사 응답에서 도출한 개선사항과 반영 계획']:
            continue
        assert title in new_tables,title
        expected=re.sub(r'표\s+(4-\d+)(?!\d)',lambda m:'표 '+table_map.get(m[1],m[1]),table)
        if title=='연구 절차':
            expected=expected.replace('| 6단계. 산출값–기준값 비교 |','| 6단계. 개발 산출값–기준값 점검 |')
            expected=re.sub(r'^(\| 6단계\. 개발 산출값–기준값 점검 \|[^\n]*)\| 4 \|$',r'\1| 3 |',expected,flags=re.M)
        assert expected==new_tables[title],title
    assert old_refs==text.split('# 참고문헌',1)[1].split(START,1)[0].strip()
    assert notes==existing_notes(text) and len(notes)==66
    assert not re.search(r'4\.7\.[1-4](?!\d)',text)
    assert re.findall(r'^\*\*표 (4-\d+)\.',text,re.M)==[f'4-{i}' for i in range(1,17)]
    assert '현장 전문가 검토 결과의 종합과 사용 편의성 실측' not in text
    assert '설계 요구와 현재 구현 기능의 대응' not in text
    assert '표 A-1. 현직교사 응답에서 도출한 개선사항과 반영 계획' in text
    assert args.paper.read_bytes()==original,'Concurrent manuscript edit: retry on current text'
    stamp=datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup=args.paper.parent/'원고_백업'/f'{args.paper.stem}_결과절구조수정전_{stamp}.md';backup.write_bytes(original)
    args.paper.write_text(text,encoding='utf-8')
    diff=''.join(difflib.unified_diff([s.rstrip()+'\n' for s in before.splitlines()],[s.rstrip()+'\n' for s in text.splitlines()],fromfile='v14-before-results-structure',tofile='v14-after-results-structure',n=0))
    (Path(__file__).parent/'MANUSCRIPT_RESULTS_STRUCTURE_20260906.diff').write_text(diff,encoding='utf-8')
    result=dict(status='PASS',paper=str(args.paper),backup=str(backup),table_map=table_map,
        rq4_before=old_rq,rq4_after=new_rq,chapter4_tables=16,appendix_action_table='A-1',
        unchanged_source_tables=len(old_tables)-3,research_procedure_table='Development check linked to RQ3 instead of RQ4',all_66_author_notes_preserved=True,references_unchanged=True,
        runtime_source='docs/LOAD_TEST_2026-07.md, 2026-07-16 API load results',
        technical_numerical_comparison='Existing source table retained; placement and interpretation scope revised, scientific analysis not rerun',
        sha256=hashlib.sha256(args.paper.read_bytes()).hexdigest())
    (Path(__file__).parent/'MANUSCRIPT_RESULTS_STRUCTURE_20260906.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
