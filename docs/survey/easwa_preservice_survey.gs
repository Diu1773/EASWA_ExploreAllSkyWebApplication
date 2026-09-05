/*
 * 예비교사 폼 보관본 — 2026-09-06 브라우저 반영 내용과 동기화.
 * 기존 폼 URL 유지. 이 파일은 기존 폼 업데이트용이 아니다.
 * 의도적 복제 시에만 함수 인수로 CREATE_NEW_COPY를 전달한다.
 * 실제 반영·검증: 예비교사_폼반영기록_2026-09-06.md
 * 설계 원리·역문항·결측·비교 범위: 예비교사_문항확정표_2026-09.md
 */
function createEASWAPreserviceForm(confirmation) {
  if (confirmation !== 'CREATE_NEW_COPY') throw new Error('기존 폼은 이미 반영됨. 새 폼 생성은 명시적 복제에만 허용.');
  const form = FormApp.create('EASWA 프로토타입 반응 및 보완 요구 조사 (예비교사)');

  form.setDescription("본 조사는 공공 천문자료 기반 탐구 플랫폼 EASWA를 직접 사용한 경험과 보완 요구를 파악하기 위한 조사입니다. 이번 활동에서는 TESS 공개 관측자료를 이용하는 외계행성 식현상 모듈을 사용합니다.\n\nEASWA: https://easwa-webapp.onrender.com/\n\n설문에서는 탐구 흐름, 분석 절차와 정보, 결과 해석, 수업 활용 가능성에 관한 의견을 묻습니다. 좋았던 점과 어려웠던 점을 모두 본인의 경험대로 응답해 주세요. 학습 성취도나 개인의 능력을 평가하는 시험이 아닙니다.\n\n설문 응답과 EASWA에 입력한 단계별 기록·생각해보기 응답·분석 결과는 연구 및 플랫폼 개선에 활용됩니다. EASWA의 입력 내용은 개인을 식별하지 않는 형태로 자동 저장됩니다. 이름·연락처 등 개인정보는 답변에 적지 말아 주세요. 참여는 자발적이며 언제든 중단할 수 있습니다.\n\n진행자의 안내에 따라 활동을 수행하고 설문에 응답해 주세요. 이 안내는 EASWA 활동을 시작하기 전에 확인해 주세요.");

  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('응답해 주셔서 감사합니다.');

  function addPage(t){ form.addPageBreakItem().setTitle(t); }
  function addInfo(t, x){ form.addSectionHeaderItem().setTitle(t).setHelpText(x); }
  function addScale(t, help){
    const it = form.addScaleItem().setTitle(t).setBounds(1,5)
      .setLabels('전혀 그렇지 않다','매우 그렇다').setRequired(false);
    if (help) it.setHelpText(help);
  }
  function addPara(t, help, required){
    const it = form.addParagraphTextItem().setTitle(t).setRequired(!!required);
    if (help) it.setHelpText(help);
  }
  var IMG_BASE = 'https://raw.githubusercontent.com/Diu1773/EASWA_ExploreAllSkyWebApplication/main/docs/survey/screens/';
  function addImg(title, help, file) {
    var item = form.addImageItem().setTitle(title).setImage(UrlFetchApp.fetch(IMG_BASE + file).getBlob());
    if (help) item.setHelpText(help);
  }

  // ===== 연구 참여 동의 (비동의 시 제출 종료 분기) =====
  const consentItem = form.addMultipleChoiceItem()
    .setTitle('본 조사의 목적과 익명 처리 안내를 확인하였으며, 연구 목적의 응답 활용에 동의합니다.')
    .setRequired(true);
  consentItem.setChoices([
    consentItem.createChoice('동의합니다', FormApp.PageNavigationType.CONTINUE),
    consentItem.createChoice('동의하지 않습니다', FormApp.PageNavigationType.SUBMIT)
  ]);

  form.addMultipleChoiceItem().setTitle('오늘 참여한 회차를 선택해 주세요.')
    .setChoiceValues(['9월 6일(일) 18시', '9월 7일(월) 20시', '그 밖의 회차']).setRequired(true);

  // ===== 1. 응답자 배경 =====
  addPage('1. 응답자 배경');

  // [수정] 예비 코호트 선택지 (현직 지구과학교사 제거)
  form.addMultipleChoiceItem()
    .setTitle('1. 현재 본인에게 가장 가까운 항목을 선택해 주세요.')
    .setChoiceValues([
      '예비 지구과학교사 (사범대·교대 지구과학교육 전공)',
      '과학교육 전공 (지구과학교육 외)',
      '천문학 또는 우주과학 관련 전공',
      '과학 외 전공 (인문·사회·예체능 등)'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addScaleItem().setTitle('2. 천문 관련 교육 또는 자료 활용 경험은 어느 정도입니까?')
    .setBounds(1,5).setLabels('전혀 없음','매우 많음').setRequired(true);
  form.addCheckboxItem()
    .setTitle('2-1. 고등학교에서 이수한 과학 선택과목을 모두 선택해 주세요. (Ⅰ·Ⅱ 구분 없이)')
    .setChoiceValues(['물리학 (물리)', '화학', '생명과학 (생물)', '지구과학', '위 과목 이수 없음', '기억나지 않음'])
    .setHelpText('공통과목인 과학·통합과학만 이수했다면 ‘위 과목 이수 없음’을 선택해 주세요. ‘위 과목 이수 없음’ 또는 ‘기억나지 않음’은 다른 항목과 함께 선택하지 마세요.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('3. 공공 천문자료 또는 실제 관측자료를 활용해 본 경험이 있습니까?')
    .setChoiceValues(['없음','있음']).setRequired(true);

  form.addCheckboxItem()
    .setTitle('3-1. 실제 관측자료(공공 천문자료)를 수업에 활용하고 싶은 이유는 무엇입니까? (해당하는 것을 모두 선택)')
    .setChoiceValues([
      '학생에게 진짜 데이터를 다루는 경험을 주고 싶어서',
      '교과서나 시뮬레이션보다 탐구의 실제성이 높아서',
      '학생의 흥미와 동기를 높일 수 있어서',
      '자료 해석과 분석 역량을 기를 수 있어서',
      '최신 천문 연구와 학교 수업을 연결할 수 있어서'
    ])
    .setHelpText('아직 활용해 본 적이 없어도, 활용하고 싶은 이유(기대)를 기준으로 응답해 주세요. 활용 의향이 없거나 해당 없으면 비워 두셔도 됩니다.')
    .showOtherOption(true)
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('4. 웹 기반 자료 분석 도구 또는 데이터 분석 플랫폼을 사용해 본 경험이 있습니까?')
    .setChoiceValues(['없음','있음']).setRequired(true);

  // ===== 2. 기존 공공 천문자료 서비스 활용 장벽 =====
  addPage('2. 기존 공공 천문자료 서비스 활용 장벽');
  addInfo('기존 공공 천문자료 서비스 예시',
    '아래는 SIMBAD, VizieR, WorldWide Telescope, ESASky의 화면 예시입니다. 사용한 경험이나 이번에 살펴본 화면을 바탕으로, 기존 서비스를 학교 수업에서 활용할 때의 어려움을 응답해 주세요. 직접 사용한 경험과 화면만 보고 예상한 점을 구분해 주시면 좋습니다.');
  addImg('기존 공공 천문자료 서비스 4종 — 실제 화면',
    '(a) SIMBAD 천체 검색 (b) VizieR 자료 테이블 (c) WorldWide Telescope 전천 탐색 (d) ESASky 관측자료 탐색',
    'existing_services_2x2.png');

  form.addCheckboxItem()
    .setTitle('5. 기존 공공 천문자료 서비스를 학교 수업에서 활용할 때 경험했거나 예상되는 어려움을 모두 선택해 주세요.')
    .setChoiceValues([
      '자료 검색 절차가 복잡할 것 같음',
      '영어 인터페이스와 전문 용어가 부담될 것 같음',
      '좌표와 메타데이터 이해가 어려울 것 같음',
      '파일 형식과 다운로드 과정이 부담될 것 같음',
      '코딩 또는 별도 분석 프로그램 사용이 필요할 것 같음',
      '그래프 또는 분석 결과를 해석하기 어려울 것 같음',
      '학생 수준에 맞게 자료를 재구성하기 어려울 것 같음',
      '수업 시간 안에서 활용하기 어려울 것 같음',
      '특별히 어려운 점 없음'
    ])
    .setHelpText('기존 서비스를 사용해 본 경우 실제 경험 기준으로, 없는 경우 예상 기준으로 응답해 주십시오. ("특별히 어려운 점 없음"을 선택한 경우 다른 항목은 함께 선택하지 마세요.)')
    .showOtherOption(true)
    .setRequired(true);

  addPara('6. 위에서 선택한 어려움 중 가장 크게 느껴지는 것은 무엇이며, 그 이유는 무엇입니까?');

  // ===== 3. EASWA 직접 수행 =====
  addPage('3. EASWA 직접 수행');
  addInfo('EASWA 직접 수행 안내',
    '진행자의 안내에 따라 EASWA 외계행성 식현상 탐구모듈을 직접 수행해 주세요.\n' +
    '주제 소개 → 대상 선택 → 자료 확인 → 분석 준비 → 분석·시각화 → 기준값 비교 → 해석·기록 순으로 진행됩니다.\n\n' +
    'EASWA 프로토타입 웹 링크: https://easwa-webapp.onrender.com/\n\n' +
    '서버가 처음 활성화되는 데 시간이 걸릴 수 있습니다. 화면이 바로 열리지 않을 경우 잠시 후 새로고침해 주세요.');

  form.addMultipleChoiceItem()
    .setTitle('7. EASWA의 어느 단계까지 직접 수행하였습니까?')
    .setChoiceValues([
      'Step 0~6 전체 완료 (해석·기록까지)',
      '분석 실행·시각화(광도곡선·모델 적합)까지 완료',
      '자료 확인·분석 준비까지 완료',
      '일부 단계만 수행함',
      '오류·접속 문제로 완료하지 못함',
      '직접 수행하지 않음'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('7-1. 직접 수행에 걸린 시간은 어느 정도입니까?')
    .setChoiceValues([
      '10분 미만',
      '10~20분',
      '20~30분',
      '30분 이상',
      '완료하지 못함',
      '직접 수행하지 않음'
    ])
    .setRequired(true);

  // ===== 4. EASWA 프로토타입 반응 (기존 11개 중 Q17 조정 + 예비 신설 18-1, 역문항 12·15) =====
  addPage('4. EASWA 프로토타입 반응');
  addInfo('응답 안내',
    '이번에 직접 보거나 수행한 경험을 기준으로 각 문장에 동의하는 정도를 선택해 주세요.\n1 = 전혀 그렇지 않다 / 2 = 그렇지 않다 / 3 = 보통이다 / 4 = 그렇다 / 5 = 매우 그렇다\n직접 확인하지 못했거나 판단하기 어려운 문항은 비워 두셔도 됩니다. 각 문장을 끝까지 읽고 응답해 주세요.');

  addScale('8. EASWA는 천체명이나 자료 검색보다 탐구 주제와 탐구 질문에서 출발하도록 구성되어 있다.');
  addScale('9. EASWA는 별도의 코딩 환경 없이 공공 천문자료 분석 과정을 따라갈 수 있도록 돕는다.');
  addScale('10. EASWA는 분석에 사용한 자료의 출처와 관측 정보를 확인할 수 있도록 제시한다.', '자료 확인 단계에서 본 자료 출처·관측 정보를 참고해 주세요.');
  addScale('11. EASWA는 학습자가 분석 조건(측정·분석 설정)을 직접 조정해 볼 수 있는 기능을 제공한다.',
    '예: 이번 식현상 활동에서 사용한 별빛 측정 구경과 배경 밝기 설정을 떠올려 주세요.');
  addScale('12. EASWA의 화면 구성은 복잡하여 각 단계의 탐구 흐름을 파악하기 어렵다.');
  addScale('13. EASWA의 STEP별 질문과 생각해보기 문항은 각 단계에서 무엇을 확인해야 하는지 이해하는 데 도움이 된다.', '이번에 직접 확인한 STEP별 질문과 생각해보기 문항을 기준으로 응답해 주세요. 확인하지 못했다면 비워 두셔도 됩니다.');
  addScale('14. EASWA는 광도곡선과 식현상 모델 적합 결과를 해석할 수 있도록 제시한다.',
    '광도곡선: 시간에 따른 별의 밝기 변화 그래프 / 식현상 모델 적합: 밝기 감소 구간에 모델 곡선을 맞추는 과정.');
  addScale('15. EASWA의 기준값 비교 화면은 무엇을 해석해야 하는지 파악하기 어렵다.');
  addScale('16. EASWA는 산출값과 NASA Exoplanet Archive 기준값의 차이를 학습자가 스스로 해석하도록 돕는다.',
    '예: 행성-별 반지름비(Rp/R*) 등 산출값을 공개 데이터베이스 값과 비교합니다.');
  // [수정] Q17 예비 입장 문구
  addScale('17. EASWA의 단계별 안내와 질문은 학교에서 천문탐구 활동을 진행하는 데 활용하기 적절하다.');
  addScale('18. EASWA는 공공 천문자료 기반 천문탐구를 지원하는 교육용 웹 플랫폼으로 적절하다.');

  // Q15와 관련된 긍정 진술. 불일치만으로 무성의 응답 또는 문구 효과를 확정하지 않는다.
  // 역채점 Q12/Q15 = 6 - 원점수. 원점수·유효 n·결측을 별도 보존한다.
  addScale('18-1. EASWA의 기준값 비교 화면은 무엇을 해석해야 하는지 분명하게 보여준다.');

  // 2차 보충 문항. 기존 공통척도와 합산하거나 1차 점수와 직접 비교하지 않는다.
  // 구체 보완 요소의 이용과 도움 필요 여부를 확인하며, 자기보고 수행과 실제 능력을 구분한다.
  form.addGridItem()
    .setTitle('18-2. 이번 활동에서 다음 내용을 이해하거나 수행할 때 어떤 도움이 필요했습니까?')
    .setHelpText('각 행에서 본인의 경험에 가장 가까운 것을 하나 선택해 주세요. 사람의 도움에는 진행자나 다른 참여자의 설명이 포함됩니다. 보거나 수행하지 않은 내용은 마지막 선택지를 골라 주세요.')
    .setRows([
      '용어·기호·단위의 뜻 이해',
      '그래프의 축·점·빈 구간 읽기',
      '안내 문장의 뜻 이해',
      '각 단계의 할 일과 생각해보기 문항 찾기'
    ])
    .setColumns([
      '화면만 보고 할 수 있었다',
      '사람의 도움을 받아 할 수 있었다',
      '도움을 받아도 어려웠다',
      '어려웠지만 도움을 받지 못했다',
      '보거나 수행하지 않았다'
    ])
    .setRequired(false);

  // ===== 5. 어려움을 경험한 단계 =====
  addPage('5. 어려움을 경험한 단계');
  // [수정] 격자(본인/학생 2열) → 체크박스(본인이 어려웠던 단계). 예비는 학생 예상 근거 없어 학생 열 삭제.
  form.addCheckboxItem()
    .setTitle('19. 직접 수행하며 어려웠거나 막혔던 단계를 모두 선택해 주세요.')
    .setHelpText('직접 사용해 본 경험을 기준으로, 해당하는 단계를 모두 선택해 주세요. 어려운 단계가 없으면 "특별히 어려운 단계 없음"을 선택해 주세요.')
    .setChoiceValues([
      '접속·서버 활성화',
      '주제 소개',
      '대상 선택',
      '자료 확인 (출처·관측 정보)',
      '분석 준비 (설정·모델 가정)',
      '분석 실행·시각화 (광도곡선·모델 적합)',
      '기준값 비교',
      '해석·기록',
      '특별히 어려운 단계 없음'
    ])
    .setRequired(false);

  // [수정] Q20 확장 — 어려운 이유 + 특히 막힌 지점(신설 B1 흡수)
  addPara('20. 위에서 선택한 단계가 어렵거나 막혔던 이유는 무엇입니까? 직접 해보면서 특히 막혔던 지점이 있었다면 함께 적어 주세요.');

  addPara(
    '20-1. (기준값 비교 단계까지 수행하신 경우) EASWA에서 확인한 산출값(식 깊이, Rp/R* 등)과 NASA Exoplanet Archive 기준값 사이에 차이가 생길 수 있는 원인을 한 가지 이상 적어 주세요.',
    '해당 단계까지 수행하지 않았다면 비워 두셔도 됩니다.',
    false
  );

  // ===== 6. 보완 요구 =====
  form.addPageBreakItem().setTitle('6. 보완 요구').setHelpText('직접 경험한 내용을 바탕으로 응답해 주세요. 문항 21에서 ‘특별히 보완할 점 없음’ 또는 ‘판단하기 어려움’은 다른 항목과 함께 선택하지 마세요. 걱정되는 점이나 보완 요구가 없다면 서술란에 ‘없음’이라고 적어도 됩니다. 판단하기 어려운 척도 문항은 비워 두셔도 됩니다.');
  form.addCheckboxItem()
    .setTitle('21. EASWA를 보완하기 위해 중요하다고 생각하는 요소를 모두 선택해 주세요.')
    .setChoiceValues([
      '자료 출처와 분석 조건을 더 명확히 제시하는 것',
      '분석 과정과 품질 점검 정보를 더 자세히 제공하는 것',
      '그래프와 분석 결과를 해석할 수 있는 도움말을 제공하는 것',
      'STEP별 질문과 생각해보기를 보완하는 것',
      '기준값 비교, 차이 원인 설명, 결과 기록 활동을 강화하는 것',
      '수업 적용을 위한 활동지와 교사용 안내 자료를 제공하는 것',
      '추가 탐구 주제를 제공하는 것',
      '특별히 보완할 점 없음',
      '판단하기 어려움'
    ])
    .showOtherOption(true)
    .setRequired(true);

  addScale('21-1. 나는 현재 제공되는 기능을 기준으로, 향후 학생 대상 천문탐구 활동에 EASWA를 활용할 의향이 있다.');

  // [삭제] Q21-2 적절한 수업 차시 — 예비는 차시 운영 경험 없어 판단 근거 없음.

  // [수정] Q22 예비 입장으로 고정
  addPara('22. EASWA를 직접 배우거나 향후 학생 대상 천문탐구 활동에 활용할 때 가장 걱정되는 점 한 가지와 그 이유를 적어 주세요.', null, false);

  addPara('23. EASWA에서 가장 잘 되어 있다고 생각하는 점 한 가지와, 보완이 가장 시급하다고 생각하는 점 한 가지를 각각 적어 주세요. 기타 의견이 있다면 함께 적어 주세요.');

  Logger.log('편집 URL: ' + form.getEditUrl());
  Logger.log('응답 URL: ' + form.getPublishedUrl());
}

/*
 * 이미지는 createEASWAPreserviceForm 실행 시 GitHub raw(IMG_BASE, main 브랜치)에서 자동 삽입됩니다(수동 업로드 불필요).
 * §2 '기존 서비스 4종 실제 화면' 1장(existing_services_2x2.png)만 사용.
 * 이미지 원본: docs/survey/screens/*.png (저장소 main 커밋됨 — raw HTTP 200 확인).
 * 최초 실행 시 UrlFetchApp·외부 이미지 접근 권한 승인이 필요할 수 있습니다.
 */
