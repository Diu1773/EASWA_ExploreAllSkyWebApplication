/*
 * EASWA 프로토타입 반응 및 보완 요구 조사 — 【예비교사 코호트 · 직접수행형】
 * 현직 시행본(easwa_teacher_survey.gs, 2026-07-24)을 복제하고 예비 코호트 조정만 반영.
 * 시연 형식 = 직접수행형(진행자 안내 + 각자 노트북 직접 수행), 1차 현직과 동일 조건 → 대조 성립.
 *
 * === 현직 대비 조정 (2026-08-31, survey-pilot-test 근거) ===
 *  [수정] Q1  역할 선택지를 예비 중심으로 교체(현직 지구과학교사 항목 제거).
 *  [수정] Q17 "…학교 수업 또는 예비교사 교육에서" → "…내가 장차 교육 현장에서 활용하기에 적절하다".
 *  [수정] Q19 격자(본인/학생 2열) → 체크박스(본인이 어려웠던 단계만). 예비는 학생 예상 근거 없음.
 *  [수정] Q20 "어려운 이유" → "어렵거나 막혔던 이유 + 특히 막힌 지점"(신설 B1 흡수).
 *  [삭제] Q21-2 적절한 수업 차시 — 예비는 차시 운영 경험 없어 판단 근거 없음(원고 표에서 예비 열 비움).
 *  [수정] Q22 "본인 입장(현직/예비)" → "예비 교사 입장" 문구로 고정.
 *  [유지] 신설(B1·B2) 없음 — 직접수행형에선 Q19+Q20이 이미 받으므로 중복. 파일럿 결론.
 *
 * 반응척도(문항 8~18) ↔ 표 3-5 11개. 역문항 12·15는 위치 비공개, 집계 시 (6 − 점수)로 역채점.
 * 번호·순서는 현직과 동일하게 보존(역채점 매핑·표 정합).
 *
 * 실행법: (로그인된 크롬에서) script.google.com → 새 프로젝트 → 이 코드 붙여넣기 →
 *         createEASWAPreserviceForm 실행 → 권한 승인 → 실행 로그의 편집/응답 URL 확인.
 */
function createEASWAPreserviceForm() {
  const form = FormApp.create('EASWA 프로토타입 반응 및 보완 요구 조사 (예비교사)');

  form.setDescription(
    '본 조사는 공공 천문자료 기반 천문탐구를 지원하기 위해 개발 중인 교육용 웹 플랫폼 EASWA의 프로토타입에 대한 반응과 보완 요구를 파악하기 위한 것입니다.\n\n' +
    'EASWA는 공공 천문자료를 학교 천문탐구로 재구성한 웹 기반 탐구 플랫폼으로, 여러 탐구 주제를 공통의 단계 흐름으로 다루도록 설계되었습니다. 본 조사는 그중 분석·시각화·기준값 비교가 가장 완결적으로 구현된 외계행성 식현상 탐구 모듈을 대상으로 하며, 이 모듈은 MAST 기반 TESS 공개 관측자료로 광도곡선을 분석하고 산출값을 NASA Exoplanet Archive 기준값과 비교·해석하도록 구성되어 있습니다.\n\n' +
    'EASWA 프로토타입 웹 링크: https://easwa-webapp.onrender.com/\n\n' +
    '본 조사는 사용 효과나 학습 성취도 변화를 검증하기 위한 실험이 아니라, 프로토타입의 활용 가능성과 개선 방향을 파악하기 위한 형성적 반응 조사입니다. 응답은 연구 및 프로토타입 개선 목적으로만 활용되며, 개인을 식별할 수 있는 정보는 수집하지 않습니다.' +
    '\n\n본 조사는 진행자의 안내에 따라 EASWA 주요 단계를 직접 수행해 보신 뒤 응답하는 현장 조사입니다(약 20분). 참여는 자발적이며 언제든 중단할 수 있습니다.'
  );

  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('응답해 주셔서 감사합니다.');

  function addPage(t){ form.addPageBreakItem().setTitle(t); }
  function addInfo(t, x){ form.addSectionHeaderItem().setTitle(t).setHelpText(x); }
  function addScale(t, help){
    const it = form.addScaleItem().setTitle(t).setBounds(1,5)
      .setLabels('전혀 그렇지 않다','매우 그렇다').setRequired(true);
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

  // ===== 1. 응답자 배경 =====
  addPage('1. 응답자 배경');

  // [수정] 예비 코호트 선택지 (현직 지구과학교사 제거)
  form.addMultipleChoiceItem()
    .setTitle('1. 현재 본인에게 가장 가까운 항목을 선택해 주세요.')
    .setChoiceValues([
      '예비 지구과학교사 (사범대·교대 지구과학교육 전공)',
      '과학교육 전공 (지구과학교육 외)',
      '천문학 또는 우주과학 관련 전공'
    ])
    .showOtherOption(true)
    .setRequired(true);

  addScale('2. 천문 관련 교육 또는 자료 활용 경험은 어느 정도입니까?');
  // 주: Q2는 배경 통제변수. 분석 시 배경 분포를 먼저 보고한 뒤 반응을 해석(예비는 낮은 쪽 쏠림 예상).

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
    'SIMBAD, VizieR 같은 자료 검색 서비스와 WorldWide Telescope 같은 시각화 도구 등 기존 공공 천문자료 서비스는 신뢰성 있는 천문자료를 제공하지만, 학교 수업에서 바로 활용하기에는 자료 검색, 메타데이터 이해, 분석 절차 구성 등의 부담이 있을 수 있습니다.\n\n행사 참여 시 진행자의 안내가 있기 전에는 다음 영역으로 넘어가지 마십시오.');
  addImg('기존 공공 천문자료 서비스 4종 — 실제 화면',
    '각 서비스에서 별의 자료를 검색·분석하려 한 실제 화면입니다. (a) SIMBAD — 천체 정보 검색, (b) VizieR — 카탈로그·표 자료, (c) WorldWide Telescope — 시각화, (d) ESASky — 통합. 각 서비스는 각자의 기능을 신뢰성 있게 수행하지만, 어느 하나도 학교 탐구 흐름 전체(정보 확인 → 표 확보 → 환산·분석 → 시각화 → 해석)를 하나로 연결하지 않아, 도구 전환·질의 문법·전문 표기 해독·외부 계산이 필요합니다.',
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

  // ===== 4. EASWA 프로토타입 반응 (11개 문항, 역문항 12·15 — 위치 비공개) =====
  addPage('4. EASWA 프로토타입 반응');
  addInfo('응답 안내',
    '다음 문항에 대해 동의 정도를 선택해 주세요. 1점은 전혀 그렇지 않다, 5점은 매우 그렇다를 의미합니다. 각 문항의 내용을 그대로 읽고 응답해 주세요.');

  addScale('8. EASWA는 천체명이나 자료 검색보다 탐구 주제와 탐구 질문에서 출발하도록 구성되어 있다.');
  addScale('9. EASWA는 별도의 코딩 환경 없이 공공 천문자료 분석 과정을 따라갈 수 있도록 돕는다.');
  addScale('10. EASWA는 분석에 사용한 자료의 출처와 관측 정보를 확인할 수 있도록 제시한다.', '자료 확인 단계에서 본 자료 출처·관측 정보를 참고해 주세요.');
  addScale('11. EASWA는 학습자가 분석 조건(측정·분석 설정)을 직접 조정해 볼 수 있는 기능을 제공한다.',
    '예: 이 외계행성 모듈에서는 분석 준비·분석 단계의 구경·배경 설정. 문항은 다른 탐구 모듈에도 적용되도록 일반적으로 서술하였습니다.');
  addScale('12. EASWA의 화면 구성은 복잡하여 각 단계의 탐구 흐름을 파악하기 어렵다.');
  addScale('13. EASWA의 STEP별 질문과 생각해보기 문항은 각 단계에서 무엇을 확인해야 하는지 이해하는 데 도움이 된다.', '생각해보기(O/X·선택형 자가점검) 상자는 자료 확인·분석 준비 단계에 제공됩니다. 해당 단계를 기준으로 응답해 주세요.');
  addScale('14. EASWA는 광도곡선과 식현상 모델 적합 결과를 해석할 수 있도록 제시한다.',
    '광도곡선: 시간에 따른 별의 밝기 변화 그래프 / 식현상 모델 적합: 밝기 감소 구간에 모델 곡선을 맞추는 과정.');
  addScale('15. EASWA의 기준값 비교 화면은 무엇을 해석해야 하는지 파악하기 어렵다.');
  addScale('16. EASWA는 산출값과 NASA Exoplanet Archive 기준값의 차이를 학습자가 스스로 해석하도록 돕는다.',
    '예: 행성-별 반지름비(Rp/R*) 등 산출값을 공개 데이터베이스 값과 비교합니다.');
  // [수정] Q17 예비 입장 문구
  addScale('17. EASWA의 단계별 안내와 질문은 내가 장차 교육 현장에서 활용하기에 적절하다.');
  addScale('18. EASWA는 공공 천문자료 기반 천문탐구를 지원하는 교육용 웹 플랫폼으로 적절하다.');

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
  addPage('6. 보완 요구');
  form.addCheckboxItem()
    .setTitle('21. EASWA를 보완하기 위해 중요하다고 생각하는 요소를 모두 선택해 주세요.')
    .setChoiceValues([
      '자료 출처와 분석 조건을 더 명확히 제시하는 것',
      '분석 과정과 품질 점검 정보를 더 자세히 제공하는 것',
      '그래프와 분석 결과를 해석할 수 있는 도움말을 제공하는 것',
      'STEP별 질문과 생각해보기를 보완하는 것',
      '기준값 비교, 차이 원인 설명, 결과 기록 활동을 강화하는 것',
      '수업 적용을 위한 활동지와 교사용 안내 자료를 제공하는 것',
      '추가 탐구 주제를 제공하는 것'
    ])
    .showOtherOption(true)
    .setRequired(true);

  addScale('21-1. EASWA를 지금 제공되는 형태 그대로 실제 수업 또는 예비교사 교육에 활용할 의향이 있다.');

  // [삭제] Q21-2 적절한 수업 차시 — 예비는 차시 운영 경험 없어 판단 근거 없음.

  // [수정] Q22 예비 입장으로 고정
  addPara('22. 예비 교사 입장에서, EASWA를 배우거나 장차 수업에 활용하는 과정에서 가장 걱정되는 점 한 가지와 그 이유를 적어 주세요.', null, true);

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
