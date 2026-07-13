/*
 * EASWA 전문가 내용타당도(CVI) 검토 구글폼
 * 출처: "EASWA paper revision (fork)" 세션에서 복원 (2026-07-05).
 * 대상: 천문학/천문교육/지구과학교육/과학교육/교육공학 전문가.
 * 4점 척도 (I-CVI 호환): 1 전혀 타당하지 않다 ~ 4 매우 타당하다.
 * 실행법: script.google.com → 이 코드 붙여넣기 → createEASWAExpertReviewForm 실행 → 권한 승인 → 로그의 URL 확인.
 * 산출: I-CVI = (3·4점 부여 전문가 수)/전체, S-CVI/Ave = 영역·전체 평균 (논문 3.7).
 */
function createEASWAExpertReviewForm() {
  const form = FormApp.create('EASWA 전문가 내용타당도 검토');

  form.setDescription(
    '본 검토는 공공 천문자료 기반 천문탐구 교육용 웹 플랫폼 EASWA의 천문학적 타당성, 교육적 활용 가능성, 사용 편의성에 대한 전문가 내용타당도 검토를 위한 것입니다.\n\n' +
    'EASWA는 MAST 기반 TESS 공개 관측자료로 외계행성 식현상 광도곡선을 차등측광·모델 적합하고, 산출값(Rp/R*, a/R*, 궤도 경사각 등)을 NASA Exoplanet Archive 기준값과 비교하여 해석하도록 구성한 웹 기반 탐구 플랫폼입니다.\n\n' +
    'EASWA 웹 링크: https://easwa-webapp.onrender.com/\n(서버 활성화에 시간이 걸릴 수 있습니다. 화면이 바로 열리지 않으면 잠시 후 새로고침해 주세요.)\n\n' +
    '각 문항은 4점 척도로 평가합니다 — 1: 전혀 타당하지 않다, 2: 타당하지 않은 편이다, 3: 타당한 편이다, 4: 매우 타당하다.\n응답은 연구 목적으로만 활용되며 개인을 식별할 수 있는 정보는 수집하지 않습니다.'
  );

  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('검토에 참여해 주셔서 감사합니다.');

  function addPage(title) { form.addPageBreakItem().setTitle(title); }
  function addInfo(title, text) { form.addSectionHeaderItem().setTitle(title).setHelpText(text); }
  function addCVI(title) {
    form.addScaleItem()
      .setTitle(title)
      .setBounds(1, 4)
      .setLabels('전혀 타당하지 않다', '매우 타당하다')
      .setRequired(true);
  }
  function addParagraph(title) {
    form.addParagraphTextItem().setTitle(title).setRequired(false);
  }

  // === 1. 전문가 배경 ===
  addPage('1. 전문가 배경');

  form.addCheckboxItem()
    .setTitle('1. 본인의 전문 분야를 모두 선택해 주세요.')
    .setChoiceValues([
      '천문학 / 천문자료 분석', '천문교육', '지구과학교육', '과학교육', '교육공학'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('2. 해당 분야 경력은 어느 정도입니까?')
    .setChoiceValues(['5년 미만', '5~10년', '10~20년', '20년 이상'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('3. 천문 관측자료 분석 또는 천문탐구 수업 경험이 있습니까?')
    .setChoiceValues(['거의 없음', '있음', '많음'])
    .setRequired(true);

  // === 2. 천문학적 타당성 ===
  addPage('2. 천문학적 타당성');
  addInfo('안내', 'EASWA에 접속하여 자료 처리 흐름과 산출값을 확인하신 뒤, 각 항목의 타당성을 평가해 주세요.');

  addCVI('4. 공개 관측자료(MAST 기반 TESS)의 호출과 차등측광 처리 흐름이 천문학적으로 타당하다.');
  addCVI('5. 산출값(Rp/R*, a/R*, 궤도 경사각, 주연감광 등)의 도출 방식이 타당하다.');
  addCVI('6. 분석 조건(비교성 선택, 분석 구간, 모델 가정 등)의 제시가 적절하다.');
  addCVI('7. 적합도 지표(χ²_red, 잔차 등)와 그 해석 안내가 적절하다.');
  addCVI('8. 산출값을 NASA Exoplanet Archive 기준값과 비교하도록 한 구성이 타당하다.');
  addParagraph('9. 천문학적 타당성 측면에서 보완이 필요한 점이 있다면 적어 주세요.');

  // === 3. 교육적 활용 가능성 ===
  addPage('3. 교육적 활용 가능성');
  addCVI('10. 탐구 주제(외계행성 식현상)가 2022 개정 교육과정 성취기준과 적절히 연계된다.');
  addCVI('11. STEP별 탐구 흐름(주제 소개 → 대상 선택 → 자료 확인 → 분석 준비 → 분석 실행·시각화 → 기준값 비교 → 해석·기록)이 교육적으로 적절하다.');
  addCVI('12. STEP별 질문·생각해보기 문항이 학습자의 탐구를 지원하는 스캐폴딩으로 적절하다.');
  addCVI('13. 결과 해석(차이 원인 설명·기록)을 학습자가 직접 수행하도록 한 설계가 적절하다.');
  addCVI('14. EASWA는 학교 천문탐구 수업 또는 예비교사 교육에서 활용 가능성이 있다.');
  addParagraph('15. 교육적 활용 가능성 측면에서 보완이 필요한 점이 있다면 적어 주세요.');

  // === 4. 사용 편의성 ===
  addPage('4. 사용 편의성');
  addCVI('16. 화면 구성과 단계 흐름이 명료하여 사용자가 따라가기 쉽다.');
  addCVI('17. 용어, 버튼명, 안내 문구가 학습자 수준에서 이해하기 적절하다.');
  addCVI('18. 분석 과정에 필요한 정보(자료 출처·분석 조건·품질·시각화 결과)가 확인 가능하도록 제시된다.');
  addParagraph('19. 사용 편의성 측면에서 보완이 필요한 점이 있다면 적어 주세요.');

  // === 5. 종합 의견 ===
  addPage('5. 종합 의견');
  addCVI('20. 종합적으로, EASWA는 공공 천문자료 기반 천문탐구를 지원하는 교육용 웹 플랫폼으로 타당하다.');
  addParagraph('21. EASWA의 강점과, 가장 우선적으로 개선이 필요한 점을 적어 주세요.');
  addParagraph('22. 그 밖의 의견이 있다면 자유롭게 적어 주세요.');

  Logger.log('편집 URL: ' + form.getEditUrl());
  Logger.log('응답 URL: ' + form.getPublishedUrl());
}
