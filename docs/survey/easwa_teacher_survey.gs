/*
 * EASWA 프로토타입 제시 기반 반응 및 보완 요구 조사 (교사·예비교사용)
 * 논문 2026_Cosmos_ERP 3.6(표 3-4·3-5) / 4.5(표 4-8·4-10) 설계와 1:1 정합.
 * 대상 모듈: 외계행성 식현상(transit) — 분석·시각화·기준값 비교가 가장 완결적으로 구현된 모듈.
 * 최신 앱(공통 탐구블럭 Step 0~6 + STEP별 self-check 퀴즈) 기준으로 화면 라벨 작성.
 *
 * 실행법: script.google.com → 새 프로젝트 → 이 코드 붙여넣기 →
 *         createEASWAForm 실행 → 권한 승인 → 실행 로그의 편집/응답 URL 확인.
 *
 * 반응척도(문항 8~14) ↔ 표 3-5 7개 영역 (문항 제목엔 영역명 미포함 — 응답 편향 방지):
 *   8  탐구 주제 중심 접근
 *   9  기술 실행 부담 완화
 *   10 분석 과정의 가시화
 *   11 STEP별 스캐폴딩
 *   12 결과 해석의 학습자 수행
 *   13 수업 적용 가능성 지원
 *   14 종합 적절성
 */
function createEASWAForm() {
  const form = FormApp.create('EASWA 프로토타입 반응 및 보완 요구 조사');

  form.setDescription(
    '본 조사는 공공 천문자료 기반 천문탐구를 지원하기 위해 개발 중인 교육용 웹 플랫폼 EASWA의 프로토타입에 대한 현장 반응과 보완 요구를 파악하기 위한 것입니다.\n\n' +
    'EASWA는 MAST 기반 TESS 공개 관측자료로 외계행성 식현상 광도곡선을 분석하고, 산출값을 NASA Exoplanet Archive의 기준값과 비교하여 해석하도록 구성한 웹 기반 탐구 플랫폼입니다.\n\n' +
    'EASWA 프로토타입 웹 링크: https://easwa-webapp.onrender.com/\n\n' +
    '본 조사는 사용 효과나 학습 성취도 변화를 검증하기 위한 실험이 아니라, 프로토타입의 수업 적용 가능성과 개선 방향을 파악하기 위한 형성적 반응 조사입니다. 응답은 연구 및 프로토타입 개선 목적으로만 활용되며, 개인을 식별할 수 있는 정보는 수집하지 않습니다. 참여는 자발적이며 언제든 중단할 수 있습니다.'
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
  function addPara(t){ form.addParagraphTextItem().setTitle(t).setRequired(false); }

  // ===== 연구 참여 동의 =====
  form.addMultipleChoiceItem()
    .setTitle('본 조사의 목적과 익명 처리 안내를 확인하였으며, 연구 목적의 응답 활용에 동의합니다.')
    .setChoiceValues(['동의합니다'])
    .setRequired(true);

  // ===== 1. 응답자 배경 (표 3-4 · 표 4-7) =====
  addPage('1. 응답자 배경');

  form.addMultipleChoiceItem()
    .setTitle('1. 현재 본인에게 가장 가까운 항목을 선택해 주세요.')
    .setChoiceValues([
      '현직 지구과학교사',
      '예비 지구과학교사 또는 지구과학교육 전공자',
      '과학교육 전공자',
      '천문학 또는 우주과학 관련 전공자'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addScaleItem()
    .setTitle('2. 천문 수업, 천문 활동, 천문자료 활용 경험은 어느 정도입니까?')
    .setBounds(1,5).setLabels('거의 없음','매우 많음').setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('3. 공공 천문자료 또는 실제 관측자료를 활용해 본 경험이 있습니까?')
    .setChoiceValues(['없음','있음']).setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('4. 웹 기반 자료 분석 도구 또는 데이터 분석 플랫폼을 사용해 본 경험이 있습니까?')
    .setChoiceValues(['없음','있음']).setRequired(true);

  // ===== 2. 기존 공공 천문자료 서비스 활용 장벽 (표 4-8) =====
  addPage('2. 기존 공공 천문자료 서비스 활용 장벽');
  addInfo('기존 공공 천문자료 서비스 예시',
    'SIMBAD, VizieR, WorldWide Telescope와 같은 기존 공공 천문자료 서비스는 신뢰성 있는 천문자료를 제공하지만, 학교 수업에서 바로 활용하기에는 자료 검색, 메타데이터 이해, 분석 절차 구성 등의 부담이 있을 수 있습니다.');

  form.addCheckboxItem()
    .setTitle('5. 기존 공공 천문자료 서비스를 학교 수업에서 활용할 때 가장 크게 예상되는 어려움을 최대 3개까지 선택해 주세요.')
    .setChoiceValues([
      '자료 검색 절차가 복잡할 것 같음',
      '영어 인터페이스와 전문 용어가 부담될 것 같음',
      '좌표와 메타데이터 이해가 어려울 것 같음',
      '파일 형식과 다운로드 과정이 부담될 것 같음',
      '코딩 또는 별도 분석 프로그램 사용이 필요할 것 같음',
      '그래프 또는 분석 결과를 해석하기 어려울 것 같음',
      '학생 수준에 맞게 자료를 재구성하기 어려울 것 같음',
      '수업 시간 안에서 활용하기 어려울 것 같음'
    ])
    .showOtherOption(true)
    .setRequired(true)
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(3).build());

  addPara('6. 위에서 선택한 어려움 중 가장 크게 느껴지는 것은 무엇이며, 그 이유는 무엇입니까?');

  // ===== 3. EASWA 프로토타입 화면 확인 (최신 식현상 모듈 Step 0~6) =====
  addPage('3. EASWA 프로토타입 화면 확인');
  addInfo('EASWA 프로토타입 확인 안내',
    '아래 웹 링크와 화면 이미지를 참고하여 EASWA 외계행성 식현상 탐구모듈의 구성과 주요 기능을 확인해 주세요.\n\n' +
    'EASWA 프로토타입 웹 링크: https://easwa-webapp.onrender.com/\n\n' +
    '서버가 처음 활성화되는 데 시간이 걸릴 수 있습니다. 화면이 바로 열리지 않을 경우 잠시 후 새로고침해 주세요.');

  // 화면 이미지 자동 삽입 — 실행 시 GitHub raw에서 스크린샷을 끌어와 폼에 넣음(수동 업로드 불필요).
  // (이미지는 docs/survey/screens/*.png 를 저장소에 커밋해 둔 것. 라벨은 최신 앱 공통 탐구블럭 Step 0~6.)
  var IMG_BASE = 'https://raw.githubusercontent.com/Diu1773/EASWA_ExploreAllSkyWebApplication/block-ux-overhaul/docs/survey/screens/';
  function addImg(title, help, file) {
    var item = form.addImageItem().setTitle(title).setImage(UrlFetchApp.fetch(IMG_BASE + file).getBlob());
    if (help) item.setHelpText(help);
  }
  addImg('화면 1. 주제 소개 (Step 0)', '탐구 질문과 학습 목표를 먼저 확인합니다.', 'step0_intro.png');
  addImg('화면 1. 대상 선택 (Step 1)', '전천 지도에서 분석 대상(외계행성)을 선택합니다.', 'step1_select.png');
  addImg('화면 2. 메타데이터 (Step 2)', '자료 출처(MAST 기반 TESS)·관측 정보·기준값 출처(NASA Exoplanet Archive)를 확인합니다. STEP별 self-check 퀴즈 포함.', 'step2_metadata.png');
  addImg('화면 3. 분석 조건 (Step 3)', 'aperture·비교성·분석 구간(ROI)·모델 가정 등 분석 조건을 확인·조절합니다.', 'step3_conditions.png');
  addImg('화면 4. 분석 · 시각화 (Step 4)', 'TESS 차등 광도곡선과 transit 모델 적합 결과, 품질 지표를 확인합니다.', 'step4_analysis.png');
  addImg('화면 5. 기준값 비교 (Step 5)', '측정 산출값을 NASA Exoplanet Archive 기준값과 비교합니다. 기준값은 비교 기준이며 절대 정답이 아닙니다.', 'step5_reference.png');
  addImg('화면 6. 해석 · 기록 (Step 6)', '기준값과의 차이 원인을 자료 품질·분석 조건·모델 가정을 근거로 기록·설명합니다.', 'step6_record.png');

  form.addMultipleChoiceItem()
    .setTitle('7. EASWA 프로토타입을 어떤 방식으로 확인하였습니까?')
    .setChoiceValues([
      '웹 링크를 직접 열어 주요 기능을 확인함',
      '제시된 화면 이미지를 중심으로 확인함',
      '웹 링크와 화면 이미지를 모두 확인함'
    ])
    .setRequired(true);

  // ===== 4. EASWA 프로토타입 반응 (표 3-5 · 7개 영역) =====
  addPage('4. EASWA 프로토타입 반응');
  addInfo('응답 안내',
    '다음 문항에 대해 동의 정도를 선택해 주세요. 1점은 전혀 그렇지 않다, 5점은 매우 그렇다를 의미합니다.');

  addScale('8. EASWA는 천체명이나 자료 검색보다 탐구 주제에서 출발하도록 구성되어 있다.');
  addScale('9. EASWA는 별도의 코딩 환경 없이 공공 천문자료 분석 과정을 따라갈 수 있도록 돕는다.');
  addScale('10. EASWA는 자료 출처, 분석 조건, 품질 점검 정보, 시각화 결과 등 분석 과정에 필요한 정보를 확인할 수 있도록 제시한다.');
  addScale('11. EASWA의 STEP별 질문과 퀴즈는 각 단계에서 무엇을 확인해야 하는지 이해하는 데 도움이 된다.');
  addScale('12. EASWA는 산출값과 기준값의 차이를 학습자가 스스로 해석하도록 돕는다.',
    '예: 행성-별 반지름비(Rp/R*) 등 산출값을 NASA Exoplanet Archive 기준값과 비교하고 차이의 원인을 설명하도록 합니다.');
  addScale('13. EASWA의 단계별 안내와 질문은 학교 천문탐구 수업 또는 예비교사 교육에서 활용하기 적절하다.');
  addScale('14. EASWA는 공공 천문자료 기반 천문탐구를 지원하는 교육용 웹 플랫폼으로 적절하다.');

  // ===== 5. 어려울 것으로 예상되는 단계 (표 4-10 · 6개) =====
  addPage('5. 어려울 것으로 예상되는 단계');
  form.addCheckboxItem()
    .setTitle('15. 학생 또는 예비교사가 EASWA를 사용할 때 가장 어려워할 것으로 예상되는 단계를 최대 3개까지 선택해 주세요.')
    .setChoiceValues([
      '탐구 대상 또는 분석 대상 선택',
      '공공 천문자료 접근 및 분석 실행',
      '품질 점검 정보 확인',
      '시각화 결과(광도곡선) 해석',
      '모델 결과 또는 산출값(Rp/R* 등) 해석',
      '기준값 비교와 결과 기록'
    ])
    .showOtherOption(true)
    .setRequired(true)
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(3).build());

  addPara('16. 위에서 선택한 단계가 어렵다고 생각한 이유를 적어 주세요.');

  // ===== 6. 보완 요구 (표 4-10 · 7개) =====
  addPage('6. 보완 요구');
  form.addCheckboxItem()
    .setTitle('17. EASWA를 보완하기 위해 가장 중요하다고 생각하는 요소를 최대 3개까지 선택해 주세요.')
    .setChoiceValues([
      '자료 출처와 분석 조건을 더 명확히 제시하는 것',
      '분석 과정과 품질 점검 정보를 더 자세히 제공하는 것',
      '그래프와 분석 결과를 해석할 수 있는 도움말을 제공하는 것',
      'STEP별 질문과 퀴즈를 보완하는 것',
      '기준값 비교, 차이 원인 설명, 결과 기록 활동을 강화하는 것',
      '수업 적용을 위한 활동지와 교사용 안내 자료를 제공하는 것',
      '추가 탐구 주제를 제공하는 것'
    ])
    .showOtherOption(true)
    .setRequired(true)
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(3).build());

  addPara('18. EASWA의 가장 큰 장점은 무엇이라고 생각합니까?');
  addPara('19. EASWA에서 가장 우선적으로 보완해야 할 점은 무엇이라고 생각합니까?');
  addPara('20. EASWA를 학교 수업 또는 예비교사 교육에서 활용한다면 어떤 방식이 적절하다고 생각합니까? 기타 의견이 있다면 함께 적어 주세요.');

  Logger.log('편집 URL: ' + form.getEditUrl());
  Logger.log('응답 URL: ' + form.getPublishedUrl());
}

/*
 * 화면 이미지는 createEASWAForm 실행 시 GitHub raw(IMG_BASE)에서 자동으로 삽입됩니다.
 * 별도 업로드·첨부 불필요. 실행 한 번이면 문항 + 화면 1~6 이미지까지 완성.
 * 이미지 원본: docs/survey/screens/*.png (저장소 커밋됨).
 * 최초 실행 시 UrlFetchApp·외부 이미지 접근 권한 승인이 필요할 수 있습니다.
 */
