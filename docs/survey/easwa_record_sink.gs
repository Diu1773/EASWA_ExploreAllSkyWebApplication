/**
 * EASWA 익명 결과 수신부 — Google Sheets sink (Apps Script Web App)
 *
 * 왜 Google Sheets인가: Render 무료 플랜의 파일시스템은 휘발성(재배포·재시작 시 초기화)이라
 * 서버측 파일 저장이 불가능. 비로그인 익명 제출은 이 시트가 유일한 영속 저장소.
 *
 * 배포 방법 (약 3분):
 * 1) 새 Google 스프레드시트 생성 (예: "EASWA 익명 제출 기록")
 * 2) 확장 프로그램 → Apps Script → 기본 Code.gs 내용을 지우고 이 파일 전체를 붙여넣기 → 저장
 * 3) 배포 → 새 배포 → 유형: 웹 앱 / 실행 계정: 나 / 액세스 권한: **모든 사용자** → 배포
 *    (첫 배포 시 권한 승인 필요)
 * 4) 발급된 웹 앱 URL(https://script.google.com/macros/s/…/exec)을
 *    프런트 환경변수 VITE_RECORD_SINK_URL에 설정:
 *    - 로컬: frontend/.env 에 VITE_RECORD_SINK_URL=<URL> 추가 후 npm run build
 *    - 프로덕션: Render 대시보드 → Environment → VITE_RECORD_SINK_URL 추가 → 재배포
 *    (Vite 환경변수는 빌드 시점에 번들에 박히므로, 값 변경 후 반드시 재빌드/재배포)
 *
 * 수신 형식: POST body = JSON 문자열 (프런트는 preflight 회피를 위해
 * Content-Type: text/plain;charset=utf-8 로 보냄 — e.postData.contents로 동일하게 수신됨)
 *
 * 동작: (anon_id, target_id) 기준 upsert. 앱이 학습자의 입력이 멎을 때마다
 * 같은 키로 계속 보내므로, 한 학습자·한 대상은 시트에서 항상 한 행이고 그
 * 행이 갱신된다. 그래서 제출 버튼을 누르지 않아도 기록이 시트에 남는다
 * (status=draft). 버튼을 누르면 같은 행이 status=submitted로 바뀐다.
 *
 * ⚠️ 이 파일을 고친 뒤에는 "배포 관리 → 편집(연필) → 버전: 새 버전 → 배포"로
 * 재배포해야 반영된다. "새 배포"를 누르면 URL이 바뀌어 앱과 끊어진다.
 * ⚠️ HEADERS는 시트가 비어 있을 때만 기록된다. 열 구성이 바뀌었으므로 기존
 * 시트를 계속 쓰려면 1행을 지우거나 새 시트로 시작할 것.
 */

var HEADERS = [
  'created_at', // 이 학습자·대상 조합이 처음 도착한 시각 (갱신돼도 유지)
  'updated_at', // 마지막 자동저장 수신 시각 — 클라이언트 시계는 신뢰하지 않음
  'status', // draft = 자동저장 진행 중 / submitted = 학습자가 제출 버튼을 누름
  'anon_id', // 브라우저 localStorage에 1회 생성·저장되는 익명 UUID
  'target_id', // 예: wasp_6_b
  'rp_rs', // 적합된 행성/항성 반지름비
  'rp_rs_err', // rp_rs 1σ 오차
  'depth_pct', // 식깊이 % = (rp_rs)^2 × 100
  'period_days', // 적합에 사용된 공전 주기 [일]
  'chi2_red', // 환산 카이제곱 (reduced chi-squared)
  'steps_note_json', // Step 6 탐구 기록 textarea 묶음 (JSON 문자열)
  'selfcheck_json', // 탐구 단계(블럭) 생각해보기 [{step,id,answer,correct}, …] (JSON)
  'selfcheck_answered', // 응답한 문항 수
  'selfcheck_total', // 모듈이 제공하는 생각해보기 문항 총수
  'selfcheck_correct', // 정답 문항 수
  'lab_guide_json', // 정밀 분석(Lab) 자체 생각해보기 {문항id: 답} (JSON)
  'lab_guide_answered', // Lab 생각해보기 응답 수
  'app_version',
  'user_agent', // 축약된 UA (환경 파악용)
];

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({ ok: false, error: 'invalid JSON' });
  }

  if (!data.anon_id || !data.target_id) {
    return jsonResponse_({ ok: false, error: 'anon_id and target_id are required' });
  }

  // 자동저장이 계속 들어오므로 upsert가 필수: append로 두면 학습자 한 명이
  // 수십 행을 만든다. 같은 시각에 두 요청이 같은 행을 찾으면 둘 다 append로
  // 빠질 수 있어 락으로 직렬화한다.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return jsonResponse_({ ok: false, error: 'busy, retry' });
  }

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }

    var row = buildRow_(data);
    var existing = findRow_(sheet, data.anon_id, data.target_id);
    var rowNumber;

    if (existing > 0) {
      // 기존 행 갱신 — created_at(첫 열)은 최초 값 유지, updated_at만 갱신
      var created = sheet.getRange(existing, 1).getValue();
      row[0] = created || new Date();
      sheet.getRange(existing, 1, 1, row.length).setValues([row]);
      rowNumber = existing;
    } else {
      sheet.appendRow(row);
      rowNumber = sheet.getLastRow();
    }

    SpreadsheetApp.flush();
    return jsonResponse_({ ok: true, row: rowNumber, updated: existing > 0 });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** (anon_id, target_id)로 기존 행 번호를 찾는다. 없으면 -1.
 *  두 열만 읽어 학급 규모에서 충분히 빠르다. */
function findRow_(sheet, anonId, targetId) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var anonCol = HEADERS.indexOf('anon_id') + 1;
  var targetCol = HEADERS.indexOf('target_id') + 1;
  var anons = sheet.getRange(2, anonCol, last - 1, 1).getValues();
  var targets = sheet.getRange(2, targetCol, last - 1, 1).getValues();
  for (var i = 0; i < anons.length; i++) {
    if (String(anons[i][0]) === String(anonId) && String(targets[i][0]) === String(targetId)) {
      return i + 2; // 헤더 1행 + 0-index 보정
    }
  }
  return -1;
}

function buildRow_(data) {
  return [
    new Date(), // created_at — 갱신 시 doPost가 최초값으로 되돌린다
    new Date(), // updated_at — 서버 수신 시각
    truncate_(data.status, 16) || 'draft',
    truncate_(data.anon_id, 64),
    truncate_(data.target_id, 64),
    toNumberOrBlank_(data.rp_rs),
    toNumberOrBlank_(data.rp_rs_err),
    toNumberOrBlank_(data.depth_pct),
    toNumberOrBlank_(data.period_days),
    toNumberOrBlank_(data.chi2_red),
    truncate_(data.steps_note_json, 20000),
    truncate_(data.selfcheck_json, 8000),
    toNumberOrBlank_(data.selfcheck_answered),
    toNumberOrBlank_(data.selfcheck_total),
    toNumberOrBlank_(data.selfcheck_correct),
    truncate_(data.lab_guide_json, 8000),
    toNumberOrBlank_(data.lab_guide_answered),
    truncate_(data.app_version, 40),
    truncate_(data.user_agent, 160),
  ];
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function toNumberOrBlank_(value) {
  var n = Number(value);
  return value === null || value === undefined || value === '' || isNaN(n) ? '' : n;
}

function truncate_(value, maxLen) {
  return String(value === null || value === undefined ? '' : value).slice(0, maxLen);
}
