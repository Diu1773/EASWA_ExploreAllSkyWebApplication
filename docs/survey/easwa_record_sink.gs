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
 * 행이 갱신된다. 제출 버튼은 없다 — 기록은 쓰는 대로 올라온다.
 *
 * ⚠️ 이 파일을 고친 뒤에는 "배포 관리 → 편집(연필) → 버전: 새 버전 → 배포"로
 * 재배포해야 반영된다. "새 배포"를 누르면 URL이 바뀌어 앱과 끊어진다.
 * ⚠️ HEADERS는 시트가 비어 있을 때만 기록된다. 이미 데이터가 있는 시트에 열을
 * 추가했다면 헤더 셀은 손으로 채워야 한다 — 데이터를 지울 필요는 없다.
 * (2026-07-18 logged_in 추가분: T1 셀에 `logged_in` 입력. 새 열은 반드시 맨
 *  끝에만 붙일 것 — buildRow_가 위치 기반이라 중간 삽입은 기존 행을 밀어버린다.)
 */

var HEADERS = [
  'created_at', // 이 학습자·대상 조합이 처음 도착한 시각 (갱신돼도 유지)
  'updated_at', // 마지막 자동저장 수신 시각 — 클라이언트 시계는 신뢰하지 않음
  'status', // 현재는 항상 draft (제출 버튼 없이 전부 자동저장). 향후 '완료' 표시용 예약 열
  'anon_id', // 브라우저 sessionStorage에 1회 생성되는 익명 UUID (한 세션 = 한 학습자 = 한 행)
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
  // 아래는 나중에 추가된 열이라 항상 맨 끝에 붙는다 (중간 삽입 금지 — buildRow_가
  // 위치 기반이라 기존 행의 열이 통째로 밀린다).
  'logged_in', // 기록 시점에 구글 로그인 상태였는지 (TRUE/FALSE). 빈칸 = 이 열이
  //              생기기 전의 옛 행. ⚠️ 신원 정보는 절대 담기지 않는다 — 시트는
  //              익명 저장소이고, 이 열은 "로그인 학습자(별도로 /my에도 저장됨)"와
  //              "이 시트에만 존재하는 익명 세션"을 구분하기 위한 불리언일 뿐이다.
  // 아래 2열은 2026-07-20 추가 — 이 웹앱 자체에 대한 피드백(학습 데이터와 별개).
  // 공공 배포 시 온라인으로 개선점을 받는 채널. 반드시 맨 끝에.
  'site_rating', // 도구 만족도 1~5 (0 또는 빈칸 = 미응답)
  'site_feedback', // 도구 개선 자유 서술 (선택)
  // 아래 2열은 2026-09-06 추가 — 탐구블럭이 셋(식현상·성단·KMTNet)이 되면서 필요해졌다.
  // 그전에는 target_id 로만 갈렸는데, 그러면 어느 모듈의 행인지 사람이 이름을 보고
  // 짐작해야 하고 식현상이 아닌 모듈의 산출값은 넣을 자리가 없다.
  'module', // 'exoplanet-transit' | 'cluster-cmd' | 'kmtnet'. 빈칸 = 이 열이 생기기 전의
  //           옛 행이며, 전부 식현상이다(2026-07-24 조사 시점에 다른 모듈은 기록하지 않았다).
  'derived_json', // 모듈별 산출값 (JSON). 식현상은 위의 rp_rs~chi2_red 열을 그대로 쓰고,
  //                 성단은 거리계수·나이·소광·금속함량·구성원 수, KMTNet 은 t0·u0·tE 가
  //                 여기로 들어간다. 모듈마다 열을 새로 만들면 시트가 계속 넓어진다.
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
    // 20초였다. 2026-09-05 동시 30명 실측에서 최대 19.7초가 걸려 한도의 98.5%까지
    // 찼고, 그 측정은 1인 1회 쓰기였다. 실제 수업은 4초 디바운스로 1인 5~10회
    // 갱신하므로 경합이 더 심하다. 넘기면 화면은 정상인데 기록만 조용히 사라진다
    // (여기서 던지면 'busy, retry' 를 돌려주고 앱이 6초 뒤 한 번만 재시도한다).
    // 느려지는 것은 감수하고 유실을 막는다 — 45초.
    // 더 늘리지 않는 이유: Apps Script 는 사용자당 동시 실행 30개가 상한이라,
    // 대기를 길게 잡을수록 실행이 오래 열려 그 상한을 먼저 채운다.
    lock.waitLock(45000);
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
    toBoolOrBlank_(data.logged_in),
    toNumberOrBlank_(data.site_rating),
    truncate_(data.site_feedback, 2000),
    truncate_(data.module, 32),
    truncate_(data.derived_json, 4000),
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

/** 진짜 불리언으로 기록해야 시트에서 TRUE/FALSE 필터가 걸린다.
 *  값이 아예 없으면(이 열이 생기기 전의 구버전 클라이언트) FALSE 대신 빈칸 —
 *  "로그인 안 함"과 "알 수 없음"은 다르고, 섞이면 집계가 조용히 틀어진다. */
function toBoolOrBlank_(value) {
  return value === true || value === false ? value : '';
}

function truncate_(value, maxLen) {
  return String(value === null || value === undefined ? '' : value).slice(0, maxLen);
}
