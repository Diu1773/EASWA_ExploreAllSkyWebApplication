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
 */

var HEADERS = [
  'timestamp', // 서버(Apps Script) 수신 시각 — 클라이언트 시계 신뢰하지 않음
  'anon_id', // 브라우저 localStorage에 1회 생성·저장되는 익명 UUID
  'target_id', // 예: wasp_6_b
  'rp_rs', // 적합된 행성/항성 반지름비
  'rp_rs_err', // rp_rs 1σ 오차
  'depth_pct', // 식깊이 % = (rp_rs)^2 × 100
  'period_days', // 적합에 사용된 공전 주기 [일]
  'chi2_red', // 환산 카이제곱 (reduced chi-squared)
  'steps_note_json', // Step 6 탐구 기록 textarea 묶음 (JSON 문자열)
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

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(), // 서버 타임스탬프
    truncate_(data.anon_id, 64),
    truncate_(data.target_id, 64),
    toNumberOrBlank_(data.rp_rs),
    toNumberOrBlank_(data.rp_rs_err),
    toNumberOrBlank_(data.depth_pct),
    toNumberOrBlank_(data.period_days),
    toNumberOrBlank_(data.chi2_red),
    truncate_(data.steps_note_json, 20000),
    truncate_(data.app_version, 40),
    truncate_(data.user_agent, 160),
  ]);

  return jsonResponse_({ ok: true });
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
