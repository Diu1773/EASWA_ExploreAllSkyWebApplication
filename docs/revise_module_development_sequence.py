"""Correct legacy simultaneous-development framing in the external v14 draft."""
import argparse
import datetime
import difflib
import hashlib
import json
import re
from pathlib import Path

SELECTION = '''### 탐구모듈의 선정과 순차적 확장
EASWA의 탐구모듈은 **외계행성 식현상 → KMTNet 미시중력렌즈 → 성단 색등급도 분석**의 순서로 개발·확장하였다. 먼저 식현상 모듈에서 자료 접근–분석–기준값 비교–해석의 흐름을 구현하고, 이후 다른 자료 구조와 탐구 주제로 적용 범위를 넓혔다. 현재 프로토타입에는 이 세 모듈이 구현되어 있다.

첫 번째 모듈인 외계행성 식현상은 성취기준 [12행우01-05]의 외계 행성계 탐사 원리와 연결되며, 별 앞을 지나는 행성에 의한 밝기 감소를 실제 관측자료에서 확인할 수 있다는 점에서 초기 개발 대상으로 선정하였다. MAST 기반 TESS 공개 관측자료로 밝기 변화 분석과 광도곡선 시각화를 수행하고, NASA Exoplanet Archive의 기준값과 비교하는 탐구 흐름을 구성하였다. 본 연구의 산출값–기준값 비교와 현장 전문가 검토는 이 식현상 모듈을 중심으로 수행하였다.

두 번째로 KMTNet 미시중력렌즈 모듈을 개발하여, 식현상에서 구성한 탐구 흐름을 다지점 관측망의 광도곡선 자료로 확장하였다. KMTNet(외계행성 탐색시스템)은 한국천문연구원이 칠레·남아프리카공화국·호주에 운영하는 국내 주도 관측망으로, 외계 행성계 탐사 성취기준을 국내 실제 관측자료 기반 탐구로 확장할 수 있는 사례이다. 2022 개정 과학과 교육과정 시안 개발 연구에서도 행성우주과학 ‘우주탐사와 행성계’ 영역의 성취기준 적용 시 고려사항으로 “첨단 관측 기술의 원리는 다루지 않으며, 우리나라의 천리안 위성, KMTNet, GMT 등을 소개한다”고 제시하였다(신영준 외, 2022, p.243).

교육과정 개발 단계에서 KMTNet은 관측 원리를 정밀하게 다루기보다 국내 천문 관측 사례로 ‘소개’하는 방향으로 검토되었다. 다만 위 문구는 2022년 5월 시안 개발 연구 보고서에 제시된 것으로, 이후 시안(최종안) 개발 정책연구 보고서에서는 KMTNet·GMT가 직접 명시되기보다 우리나라의 우주개발 성과와 계획을 간략히 소개하는 방식으로 일반화되었다. 따라서 본 연구는 KMTNet을 교과서 직접 수록 사례가 아니라 교육과정 시안 개발 단계에서 제시된 국내 천문 관측 사례이자 성취기준 [12행우01-05]의 탐사 원리와 연계 가능한 확장 탐구 자료로 활용하였다.

세 번째로 성단 색등급도(C-M도) 분석 모듈을 개발하여 외계행성 탐사와 다른 주제로 확장하였다. 성단 색등급도는 성취기준 [12행우03-01] 및 교과서의 성단 나이·거리 탐구활동(표 3-3)과 연결된다. ESA Gaia DR3 측광 카탈로그(Gaia Collaboration et al., 2023)를 활용하여 다수 천체의 색지수와 등급을 분석하고 기준값과 비교하도록 구성하였다. 이를 통해 시계열과 다지점 광도곡선에 이어 표형 카탈로그 자료에도 공통 탐구 흐름을 적용하였다.

개발 순서와 평가 범위는 구분하였다. KMTNet과 성단 색등급도는 구현된 확장 모듈이며, 식현상 모듈과 같은 범위의 산출값 검증·현장 전문가 검토를 수행한 것은 아니다. 각 모듈의 현재 기능과 조사 시점 이후 보완한 내용은 3.5와 4.4에 제시하였다. 변광성 광도곡선, 연주시차, 태양활동 등 추가 주제는 후속 모듈 후보로 두었다(Ⅵ장 제언 참조).

'''

RESULTS = '''외계행성 식현상을 첫 모듈로 구현한 뒤, KMTNet 미시중력렌즈, 성단 색등급도 분석의 순서로 확장하였다. 식현상은 TESS 자료의 밝기 감소를 분석하고 기준값과 비교하는 흐름을 구성하기에 적절하였다. 이어 KMTNet에서는 관측소별 광도곡선을 병합·분석하는 다지점 자료 구조를 다루었고, 성단에서는 Gaia DR3의 다수 천체 카탈로그로 색등급도를 작성하여 외계행성 탐사와 다른 주제로 범위를 넓혔다. 이 순차적 확장을 통해 현재 세 모듈이 구현되어 있으며, 산출값–기준값 비교와 현장 전문가 검토는 식현상 모듈을 중심으로 수행하였다.

변광성 광도곡선, H-R도 작성, 쌍성의 질량, 은하 적색이동, 태양활동, 은하 회전속도곡선 등은 추가 주제 후보로 남겼다. 이들은 이미 구현된 KMTNet·성단 모듈과 구분되며, 후속 개발에서는 주제별 대상 선정 기준과 분석 절차를 구체화할 필요가 있다.

각 모듈의 개발에 필요한 공개 자료는 분석 대상과 자료 구조에 맞추어 선정하였다. 식현상 모듈에는 MAST 기반 TESS 공개 관측자료를 사용하고, 결과 비교에는 NASA Exoplanet Archive의 기준값을 활용하였다. 이어 개발한 KMTNet 모듈에는 공개 미시중력렌즈 이벤트의 관측소별(CTIO·SAAO·SSO) 광도곡선과 같은 데이터베이스의 공표 파라미터(t0, u0, tE)를 사용하였다. 성단 색등급도 모듈에는 ESA Gaia DR3 측광 카탈로그(Gaia Collaboration et al., 2023)를 선정하고, 성단의 나이·거리·소광에 관한 문헌값과 Gaia 시차 기반 거리를 비교 자료로 활용하였다(표 4-4).

NASA Exoplanet Archive는 기존 서비스 사례분석의 대표 사례가 아니라 식현상 탐구의 기준값 자료원이다. KMTNet의 분석 자료는 공개된 실제 이벤트 광도곡선이며, 차등영상분석 단계의 프레임 미리보기만 개념 이해를 위한 생성 이미지이다. 실제 분석 자료와 개념 시연 자료의 차이는 화면과 본문에서 구분하였다.

'''

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--paper',type=Path,required=True);args=parser.parse_args()
    original=args.paper.read_bytes();before=original.decode('utf-8').replace('\r\n','\n');text=before
    def para(prefix,new):
        nonlocal text
        pattern=r'^'+re.escape(prefix)+r'[^\n]*'
        text,n=re.subn(pattern,lambda _:new,text,count=1,flags=re.M)
        assert n==1,prefix
    text=text.replace('어떤 천문탐구 활동을 초기 모듈로 구현할 것인가','어떤 천문탐구 활동을 구현하고 확장할 것인가',1)
    text=text.replace('본 연구의 플랫폼 주제(외계행성 탐사)와 직접 연계되는','본 연구에서 다루는 외계행성 탐사·성단 색등급도 등의 주제와 연계되는',1)
    old='다수의 후보가 교육과정에 근거를 두고 있으나, 모든 주제를 동시에 초기 프로토타입으로 구현하면 분석 방법과 자료 형식이 이질적이어서 개발·평가의 초점이 분산될 수 있다. 따라서 (가) 교육과정 내 핵심성과 명료성, (나) 하나의 탐구 주제 안에서 서로 다른 자료 구조를 통해 플랫폼의 공통 탐구 흐름을 검증할 수 있는가, (다) 실제 공개 관측자료로 분석·시각화·기준값 비교가 가능한가를 종합하여 초기 구현 주제를 선정하였다.'
    assert old in text
    text=text.replace(old,'후보 주제는 교육과정 연계성, 현상의 명료성, 공개 자료로 분석·시각화·기준값 비교를 구성할 수 있는지, 기존 탐구 흐름을 다른 주제와 자료 구조로 확장할 수 있는지를 함께 고려하였다. 개발은 하나의 모듈에서 출발하여 적용 범위를 순차적으로 넓히는 방식으로 진행하였다.',1)
    start=text.index('### 초기 구현 주제: 외계행성 탐사(두 탐사 방법)')
    end=text.index('탐구활동 주제 선정 기준은',start);text=text[:start]+SELECTION+text[end:]
    text=text.replace('## 3.5. EASWA 초기 프로토타입 개발','## 3.5. EASWA 프로토타입 개발과 모듈 확장',1)
    para('EASWA 초기 프로토타입은 기존 서비스 사례분석,','EASWA 프로토타입은 기존 서비스 사례분석, 선행연구, 탐구활동 주제 및 공공 천문자료 선정 기준에서 도출한 설계 원리에 기반하여 개발하였다. 식현상 모듈을 먼저 구현한 뒤 KMTNet 미시중력렌즈와 성단 색등급도 모듈을 차례로 추가하였다. 이 절은 현재 세 모듈의 개발 구조와 분석 방법을 기술한다. 1차 현장 전문가 검토(3.6)는 식현상 모듈을 중심으로 실시하였으며, 조사 이후의 보완 내용은 4.6에서 구분하여 제시한다.')
    old='본 연구는 여러 천문탐구 주제를 동일한 설계 원리로 담아내기 위해, 개별 주제의 분석 기능에 앞서 주제 비의존적인 **공통 탐구 흐름(공용 워크플로)**을 먼저 정의하였다.'
    assert old in text
    text=text.replace(old,'여러 천문탐구 주제를 동일한 설계 원리로 담아내기 위해 **공통 탐구 흐름(공용 워크플로)**을 정의하고 각 모듈에 적용하였다.',1)
    text=text.replace('식현상 광도측정·모델 피팅, 미시중력렌즈 광도곡선 병합·피팅 등','식현상 광도측정·모델 피팅, 미시중력렌즈 광도곡선 병합·피팅, 성단 색등급도 작성·등시선 맞춤 등')
    text=text.replace('EASWA 초기 프로토타입에서 구현할 탐구활동 주제를 선정하기 위해,','EASWA에서 구현·확장할 탐구활동 주제를 선정하기 위해,',1)
    start=text.index('후보별 초기 모듈 적합성을 검토한 결과,')
    end=text.index('**표 4-4. 탐구모듈별 공공 천문자료 선정 결과**',start)
    text=text[:start]+RESULTS+text[end:]
    para('이와 같이 탐구활동 주제 선정과 공공 천문자료 선정은 순차적으로 이루어졌다.','주제와 자료의 선정 결과는 식현상–TESS, KMTNet 미시중력렌즈–관측소별 공개 광도곡선, 성단 색등급도–Gaia DR3 카탈로그로 정리된다. 이 세 모듈은 식현상부터 순차적으로 개발·확장하였으며, 각 자료 구조에 맞는 분석 기능을 공통 탐구 흐름에 연결하였다.')
    para('EASWA 초기 프로토타입은 앞서 도출한 설계 원리와 공용 워크플로 계약을 바탕으로,','EASWA 프로토타입은 앞서 도출한 설계 원리와 공용 워크플로 계약을 바탕으로 자료 접근, 분석, 시각화, 해석을 단계형 흐름으로 경험하도록 구현하였다. 이 절에서는 식현상, KMTNet 미시중력렌즈, 성단 색등급도의 개발 순서에 따라 현재 구현 결과를 제시한다. 1차 현장 전문가 검토는 식현상 모듈을 중심으로 진행하였으며, 조사 시점 이후 추가·보완한 기능은 해당 모듈 설명에서 구분한다.')
    text=text.replace('미시중력렌즈 모듈을 포함한 다른 천문탐구 주제에서 동일한 설계 원리가 학습 맥락에서 어떻게 작동하는지는 후속 모듈 개발과 적용 연구를 통해 추가로 검토될 필요가 있다.','이미 구현된 KMTNet 미시중력렌즈·성단 색등급도 모듈에서 동일한 설계 원리가 학습 맥락에서 어떻게 작동하는지는 후속 적용 연구로 검토할 필요가 있다.',1)
    old='이 흐름은 2022 개정 교육과정의 외계 행성계 탐사([12행우01-05])와 직접 연결되는 외계행성 식현상법(TESS 공개 관측자료)·미시중력렌즈법(KMTNet 공개 자료) 모듈, 그리고 성단 색등급도([12행우03-01], Gaia DR3 측광 카탈로그) 모듈에 적용하였다.'
    assert old in text
    text=text.replace(old,'이 흐름을 외계행성 식현상(TESS 공개 관측자료), KMTNet 미시중력렌즈, 성단 색등급도(Gaia DR3 측광 카탈로그)의 순서로 구현·확장하였다. 앞의 두 모듈은 외계 행성계 탐사([12행우01-05]), 성단 모듈은 성단 색등급도([12행우03-01])와 내용상 연결된다.',1)
    # No changes to references, survey numbers, or response-by-response user notes.
    assert text.split('# 참고문헌',1)[1]==before.split('# 참고문헌',1)[1]
    old_results=before.split('## 4.5.',1)[1].split('## 4.6.',1)[0]
    assert text.split('## 4.5.',1)[1].split('## 4.6.',1)[0]==old_results
    for phrase in ['초기 구현 주제: 외계행성 탐사(두 탐사 방법)','두 방법을 초기 탐구모듈로 구현','두 탐사 방법을 구현하기 위한','먼저 EASWA 초기 구현 주제로 외계행성 탐사(식현상법·미시중력렌즈법)']:
        assert phrase not in text,phrase
    assert text.count('외계행성 식현상 → KMTNet 미시중력렌즈 → 성단 색등급도 분석')==1
    assert args.paper.read_bytes()==original,'Concurrent manuscript edit; retry on current draft'
    stamp=datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup=args.paper.parent/'원고_백업'/f'{args.paper.stem}_모듈개발순서수정전_{stamp}.md';backup.write_bytes(original)
    args.paper.write_text(text,encoding='utf-8')
    # Readable content diff; exact original bytes remain in the timestamped backup.
    diff=''.join(difflib.unified_diff([s.rstrip()+'\n' for s in before.splitlines()],[s.rstrip()+'\n' for s in text.splitlines()],fromfile='v14-before-module-sequence',tofile='v14-after-module-sequence',n=0))
    (Path(__file__).parent/'MANUSCRIPT_MODULE_SEQUENCE_20260906.diff').write_text(diff,encoding='utf-8')
    result=dict(status='PASS',paper=str(args.paper),backup=str(backup),sections=['3.4','3.5','4.2','4.3','4.4','5.5','6.1'],
        scope='module selection, sequential development and implementation versus evaluation scope',
        references_and_appendix_unchanged=True,survey_results_unchanged=True,
        old_simultaneous_initial_framing_removed=True,sha256=hashlib.sha256(args.paper.read_bytes()).hexdigest())
    (Path(__file__).parent/'MANUSCRIPT_MODULE_SEQUENCE_20260906.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
