/**
 * EASWA QA 스윕 캡처 — 전 탐구 화면을 두 폭(1440/1900)으로 전체 높이 캡처.
 * 사용: node capture_all.js [출력폴더]
 * 전제: 백엔드가 http://localhost:5895 에 떠 있을 것 (빌드된 dist 서빙).
 *
 * 주의 1: networkidle 계열 대기 금지(지속 연결로 영원히 idle 안 됨) — domcontentloaded + 폴링.
 * 주의 2: 학습자가 실제로 밟는 경로는 블럭(`/modules/<id>?blockStep=`)이다.
 *         옛 단독 Lab 경로(`/lab/:targetId`)를 훑던 시절엔 학습자가 안 보는 화면을 찍고 있었다.
 * 주의 3: Step 5·6은 '모델 적합'을 마쳐야 열린다. 그냥 '다음 단계'만 누르면 잠긴 채로
 *         Step 4가 세 번 찍힌다(2026-07-18 스윕에서 step4/5/6 캡처가 바이트까지 동일했다).
 *         그래서 이 스크립트는 캡처 전에 실제 분석을 끝까지 돌린다.
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const os = require('os');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'easwa_qa_sweep');
const PROFILE = path.join(os.tmpdir(), 'easwa_qa_profile');
const BASE = 'http://localhost:5895';
const TARGET = 'wasp_6_b';
const BLOCK = `${BASE}/modules/exoplanet-transit?target=${TARGET}`;
const STEP_IDS = [
  'step0_intro', 'step1_select', 'step2_metadata', 'step3_analysis_conditions',
  'step4_run_visualize', 'step5_compare', 'step6_reflect',
];

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 보이고 활성인 버튼을 텍스트로 찾아 클릭. 없으면 null. */
async function clickText(page, texts, maxLen = 48) {
  return await page.evaluate((texts, maxLen) => {
    const els = [...document.querySelectorAll('button,a,[role="button"]')];
    for (const t of texts) {
      const b = els.find((e) => {
        const s = (e.textContent || '').replace(/\s+/g, ' ').trim();
        return s.includes(t) && s.length <= maxLen && e.offsetParent !== null && !e.disabled;
      });
      if (b) { b.scrollIntoView({ block: 'center' }); b.click(); return t; }
    }
    return null;
  }, texts, maxLen);
}

/** 버튼이 '활성'이 될 때까지 기다렸다가 클릭. 스트리밍 작업(측광·적합) 완료 신호로 쓴다. */
async function clickWhenEnabled(page, texts, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = await clickText(page, texts);
    if (hit) { console.log('  click', label || hit); return true; }
    await sleep(2500);
  }
  console.log('  TIMEOUT waiting for', label || texts[0]);
  return false;
}

async function waitBody(page, min = 400, tries = 15) {
  for (let i = 0; i < tries; i++) {
    await sleep(2000);
    if (await page.evaluate((m) => document.body.innerText.length > m, min)) return true;
  }
  return false;
}

async function snap(page, file) {
  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' }).catch(() => {});
  // 내부 스크롤 컨테이너 해제 → 전체 높이 캡처
  await page.addStyleTag({ content: '#root,.app-shell,body,html{height:auto!important;max-height:none!important;overflow:visible!important}' }).catch(() => {});
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('*').forEach((el) => { try { if (el.scrollTop > 0) el.scrollTop = 0; } catch (e) {} });
  });
  await sleep(900);
  await page.screenshot({ path: path.join(OUT, file + '.png'), fullPage: true });
  console.log('cap', file);
}

/**
 * Step 4 안의 Lab을 끝까지 돌려 fit을 만든다 — 이게 있어야 Step 5·6이 열린다.
 * 서브스텝마다 캡처도 남긴다(선택→측광→품질점검→광도곡선→적합은 각각 다른 화면이다).
 * 반환: fit까지 도달했으면 true.
 */
async function runAnalysis(page, tag) {
  await page.goto(`${BLOCK}&blockStep=step4_run_visualize`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitBody(page); await sleep(2500);

  // 1) 번들 cutout 불러오기 (즉시 로드)
  if (!(await clickWhenEnabled(page, ['불러오기'], 40000, '불러오기'))) return false;
  // 미리보기 이미지가 실제로 뜰 때까지
  for (let i = 0; i < 20; i++) {
    const ok = await page.evaluate(() => document.querySelectorAll('img').length > 0);
    if (ok) break;
    await sleep(2000);
  }
  await sleep(1500);
  await snap(page, 'lab1_select' + tag);

  // 2) 비교성 자동 선택 → 측광 실행
  await clickText(page, ['추천 비교성 자동 선택']);
  await sleep(1500);
  if (!(await clickWhenEnabled(page, ['다음: 차등측광 실행'], 30000, '→ 측광 스텝'))) return false;
  await sleep(1500);
  await snap(page, 'lab2_run' + tag);
  if (!(await clickWhenEnabled(page, ['측광 실행'], 30000, '측광 실행'))) return false;

  // 3) 측광 완료 = '다음: 비교성 품질 점검'이 활성화됨 (스트리밍이라 오래 걸린다)
  if (!(await clickWhenEnabled(page, ['다음: 비교성 품질 점검'], 240000, '→ 품질 점검'))) return false;
  await sleep(2000);
  await snap(page, 'lab3_qc' + tag);

  // 4) 광도곡선
  if (!(await clickWhenEnabled(page, ['다음: 광도곡선'], 60000, '→ 광도곡선'))) return false;
  await sleep(2000);
  await snap(page, 'lab4_lightcurve' + tag);

  // 5) 적합 스텝으로 이동 후 적합 실행 (MCMC까지 가면 분 단위)
  if (!(await clickWhenEnabled(page, ['다음: 식현상 모델 적합'], 60000, '→ 적합'))) return false;
  await sleep(2000);
  if (!(await clickWhenEnabled(page, ['식현상 모델 적합 실행'], 60000, '적합 실행'))) return false;

  // 적합 완료 판정: 블럭 스테퍼의 5번이 잠금 해제되면 fit이 브릿지된 것이다.
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    const unlocked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.inquiry-stepper button')];
      const five = btns.find((b) => (b.textContent || '').trim() === '5');
      return five ? !five.disabled : false;
    });
    if (unlocked) { console.log('  fit 완료 — Step 5 잠금 해제'); break; }
    await sleep(4000);
  }
  await sleep(2000);
  await snap(page, 'lab5_fit' + tag);
  return true;
}

/** 분석이 끝난 탭의 sessionStorage를 걷어, 다음 폭 패스에 심어 재사용한다.
 *  Lab 상태는 sessionStorage 전용이라 userDataDir로는 안 넘어간다 — 안 심으면
 *  두 번째 폭에서 fit이 없어 Step 5·6이 또 잠긴다. */
async function harvestSession(page) {
  return await page.evaluate(() => {
    const o = {};
    Object.keys(sessionStorage).forEach((k) => { o[k] = sessionStorage.getItem(k); });
    return o;
  });
}

async function sweepAtWidth(browser, width, seed) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 1150, deviceScaleFactor: 1.5 });
  const tag = `_${width}`;
  if (seed) {
    await page.evaluateOnNewDocument((d) => {
      try { Object.keys(d).forEach((k) => sessionStorage.setItem(k, d[k])); } catch (e) {}
    }, seed);
  }

  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitBody(page); await sleep(1500); await snap(page, 'home' + tag);
  } catch (e) { console.log('SKIP home:', e.message); }

  for (const [name, url] of [['cmd', '/modules/cluster-cmd'], ['kmtnet', '/modules/kmtnet']]) {
    try {
      await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitBody(page); await sleep(2500); await snap(page, name + tag);
    } catch (e) { console.log('SKIP ' + name + ':', e.message); }
  }

  // fit이 없으면 Step 5·6이 잠긴다 → 캡처 전에 분석을 끝까지 돌린다.
  let fitted = Boolean(seed);
  if (!fitted) {
    try { fitted = await runAnalysis(page, tag); }
    catch (e) { console.log('SKIP analysis:', e.message); }
  }
  if (!fitted) console.log('  ⚠ fit 미완료 — Step 5·6은 잠긴 화면이 찍힌다');

  for (const id of STEP_IDS) {
    try {
      await page.goto(`${BLOCK}&blockStep=${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitBody(page);
      // Step2는 DSS 이미지 로드 대기
      if (id === 'step2_metadata') {
        for (let k = 0; k < 15; k++) {
          const ok = await page.evaluate(() => {
            const img = document.querySelector('.inquiry-skydata-stage img');
            return img && img.complete && img.naturalWidth > 0;
          });
          if (ok) break;
          await sleep(2000);
        }
      }
      await sleep(2000);
      await snap(page, id + tag);
    } catch (e) { console.log('SKIP ' + id + ':', e.message); }
  }

  const session = await harvestSession(page).catch(() => null);
  await page.close();
  return session;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', userDataDir: PROFILE,
    args: ['--no-sandbox', '--no-first-run', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1960,1400', '--hide-scrollbars'],
  });
  // 1440에서 분석을 한 번 돌리고, 그 세션(=fit)을 1900 패스에 물려준다.
  const session = await sweepAtWidth(browser, 1440, null);
  await sweepAtWidth(browser, 1900, session);
  await browser.close();
  console.log('DONE ->', OUT);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
