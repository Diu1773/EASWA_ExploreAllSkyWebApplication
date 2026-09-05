/**
 * 2026-09-06: 기존 폼은 브라우저에서 반영 완료.
 * 옛 대학 과목/지구과학 2문항 추가 코드를 읽기 전용 점검으로 교체.
 * 아래 함수는 응답을 읽거나 쓰지 않고, 문항 구조만 로그로 출력한다.
 * 로컬에서 구문 확인. Google Apps Script에서의 실행은 별도이며 미실행.
 */
function verifyPreserviceForm20260906() {
  const form = FormApp.openById('1n0UQUJ0xyFFYshjMXxYHkkK0HO1x5U2yfXVoJfg9as8');
  const snapshot = form.getItems().map(function(item) {
    const row = {id: item.getId(), index: item.getIndex(), title: item.getTitle(), type: String(item.getType()), help: item.getHelpText()};
    switch (item.getType()) {
      case FormApp.ItemType.MULTIPLE_CHOICE:
        const mc = item.asMultipleChoiceItem();
        row.required = mc.isRequired();
        row.choices = mc.getChoices().map(function(c) { return {value:c.getValue(), navigation:String(c.getPageNavigationType())}; });
        break;
      case FormApp.ItemType.CHECKBOX:
        const cb = item.asCheckboxItem();
        row.required = cb.isRequired();
        row.choices = cb.getChoices().map(function(c) { return c.getValue(); });
        break;
      case FormApp.ItemType.SCALE:
        const sc = item.asScaleItem();
        row.required = sc.isRequired();
        row.bounds = [sc.getLowerBound(), sc.getUpperBound()];
        row.labels = [sc.getLeftLabel(), sc.getRightLabel()];
        break;
      case FormApp.ItemType.GRID:
        const grid = item.asGridItem();
        row.required = grid.isRequired();
        row.rows = grid.getRows();
        row.columns = grid.getColumns();
        break;
      case FormApp.ItemType.PARAGRAPH_TEXT:
        row.required = item.asParagraphTextItem().isRequired();
        break;
    }
    return row;
  });
  Logger.log(JSON.stringify({editUrl:form.getEditUrl(), responseUrl:form.getPublishedUrl(), description:form.getDescription(), items:snapshot},null,2));
  return snapshot;
}
