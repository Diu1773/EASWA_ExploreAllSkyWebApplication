# -*- coding: utf-8 -*-
"""식현상 모듈 4단계(분석 실행·시각화) 화면을 논문 해상도로 찍는다.

원고 그림 3 은 2단계·3단계·5단계·6단계 화면만 담고 있었다. **플랫폼의 핵심인
4단계 — 컷아웃 측광과 광도곡선 적합 — 이 빠져 있었다**(2026-09-10 소유자 지적).
`원고_그림/` 에도 step4 파일이 없다.

브라우저 창 캡처로는 800px 밖에 안 나와 기존 그림(2880×2300)과 어울리지 않는다.
그래서 크롬을 headless 로 띄우고 CDP(Chrome DevTools Protocol)로 조작한다.
`--force-device-scale-factor=2` 로 1440 뷰포트를 2880 으로 받는다.

전제: 백엔드가 5895 에서 돌고 있어야 한다(`.claude/launch.json` 의 backend).
`frontend/.env` 의 `VITE_RECORD_SINK_URL` 이 비어 있어 익명 시트에는 아무것도
남지 않는다.

    python -X utf8 docs/capture_step4.py
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

import websocket

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9223
URL = "http://localhost:5895/modules/exoplanet-transit"
OUT_DIR = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos\원고_그림"
W, H = 1440, 1150          # 기존 그림과 같은 뷰포트. 2배 스케일로 2880×2300


class CDP:
    def __init__(self, ws_url):
        # origin 헤더를 보내면 크롬이 403 으로 막는다(2026-09-10)
        self.ws = websocket.create_connection(ws_url, timeout=180,
                                              suppress_origin=True)
        self.n = 0

    def send(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.n:
                if "error" in msg:
                    raise RuntimeError("%s → %s" % (method, msg["error"]))
                return msg.get("result", {})

    def js(self, expr, wait=True):
        r = self.send("Runtime.evaluate", expression="(async()=>{%s})()" % expr,
                      awaitPromise=wait, returnByValue=True)
        res = r.get("result", {})
        if r.get("exceptionDetails"):
            raise RuntimeError(str(r["exceptionDetails"])[:300])
        return res.get("value")

    def close(self):
        self.ws.close()


def launch():
    # 프로필을 재사용하면 지난 실행의 sessionStorage 가 남아 6단계에서 시작한다
    # (2026-09-10, 「Step 1 로 (못 함)」이 그 증거였다). 매번 새로 만든다.
    import shutil
    profile = os.path.join(os.environ["TEMP"], "easwa_shot_profile")
    shutil.rmtree(profile, ignore_errors=True)
    p = subprocess.Popen([
        CHROME, "--headless=new", "--remote-debugging-port=%d" % PORT,
        "--window-size=%d,%d" % (W, H), "--force-device-scale-factor=2",
        "--hide-scrollbars", "--user-data-dir=" + profile,
        "--remote-allow-origins=*",
        "--disable-gpu", "--no-first-run", URL,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        time.sleep(0.5)
        try:
            tabs = json.load(urllib.request.urlopen(
                "http://127.0.0.1:%d/json" % PORT, timeout=2))
            for t in tabs:
                if t.get("type") == "page" and "exoplanet" in t.get("url", ""):
                    return p, t["webSocketDebuggerUrl"]
        except Exception:
            pass
    p.kill()
    sys.exit("크롬을 띄우지 못했다")


# 화면이 준비될 때까지 기다렸다가 누른다. headless 는 전천 지도와 컷아웃 로딩이
# 느려서 고정 대기로는 놓친다(2026-09-10, Step 1 에서 멈췄다).
HELPER = """
window.__find = (t, exact) => Array.from(document.querySelectorAll('button'))
    .find(x => exact ? x.textContent.trim() === t : x.textContent.includes(t));
window.__wait = async (t, exact, sec) => {
  const end = Date.now() + (sec||20)*1000;
  while (Date.now() < end) {
    const b = window.__find(t, exact);
    if (b && !b.disabled) return b;
    await new Promise(r => setTimeout(r, 400));
  }
  return null;
};
window.__click = async (t, exact, sec) => {
  const b = await window.__wait(t, exact, sec);
  if (!b) return false;
  b.click();
  return true;
};
"""

STEPS = [
    ("Step 1 로", "return await window.__click('다음 단계', true, 20);", 1),
    ("대상 WASP-6 b", "return await window.__click('WASP-6 b', false, 30);", 2),
    ("Step 2 로", "return await window.__click('다음 단계', true, 20);", 2),
    ("Step 3 로", "return await window.__click('다음 단계', true, 20);", 2),
    ("생각해보기 기록", """
        const end = Date.now() + 20000;
        let ta = null;
        while (Date.now() < end) {
          ta = document.querySelector('textarea');
          if (ta) break;
          await new Promise(r => setTimeout(r, 400));
        }
        if (!ta) return false;
        const set = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value').set;
        set.call(ta, '구경 반지름을 키우면 목표별 빛은 더 담기지만 이웃별 오염도 함께 늘어 '
                   + '식의 깊이가 얕아질 수 있다.');
        ta.dispatchEvent(new Event('input', {bubbles: true}));
        return true;""", 2),
    ("Step 4 로", "return await window.__click('다음 단계', true, 20);", 3),
    ("컷아웃 불러오기", "return await window.__click('불러오기', false, 25);", 3),
    ("비교성 셋", """
        const end = Date.now() + 30000;
        let rs = [];
        while (Date.now() < end) {
          rs = Array.from(document.querySelectorAll('button'))
                .filter(x => /^RTIC/.test(x.textContent.trim()));
          if (rs.length >= 3) break;
          await new Promise(r => setTimeout(r, 500));
        }
        for (const b of rs.slice(0, 3)) {
          b.click();
          await new Promise(r => setTimeout(r, 600));
        }
        return rs.length;""", 2),
    ("차등측광 단계", "return await window.__click('차등측광 실행', false, 20);", 2),
    ("측광 실행", "return await window.__click('측광 실행', true, 20);", 5),
    ("품질·광도곡선·적합 단계", """
        for (let i = 0; i < 3; i++) {
          const end = Date.now() + 90000;
          let b = null;
          while (Date.now() < end) {
            b = Array.from(document.querySelectorAll('button'))
                 .find(x => /^다음:/.test(x.textContent.trim()) && !x.disabled);
            if (b) break;
            await new Promise(r => setTimeout(r, 800));
          }
          if (!b) return i;
          b.click();
          await new Promise(r => setTimeout(r, 3000));
        }
        return 3;""", 3),
    ("모델 적합 실행", "return await window.__click('식현상 모델 적합 실행', true, 30);", 5),
    ("적합 완료 대기", """
        const end = Date.now() + 90000;
        while (Date.now() < end) {
          if (/Rp\/R\*\s*=|반지름비\s*=/.test(document.body.innerText)) return true;
          await new Promise(r => setTimeout(r, 1000));
        }
        return false;""", 2),
]


def main():
    proc, ws_url = launch()
    c = CDP(ws_url)
    try:
        c.send("Page.enable")
        c.send("Runtime.enable")
        c.send("Emulation.setDeviceMetricsOverride",
               width=W, height=H, deviceScaleFactor=2, mobile=False)
        time.sleep(3)
        c.js("%s return 1;" % HELPER)
        for name, js, wait in STEPS:
            try:
                v = c.js(js)
            except Exception as e:
                print("  ! %s — %s" % (name, str(e)[:120]))
                v = None
            time.sleep(wait)
            print("  %-22s %s" % (name, "" if v else "(못 함)"))

        txt = c.js("return document.body.innerText.slice(0,4000);")
        if "Rp/R" not in (txt or ""):
            print("  ! 적합 결과를 찾지 못했다 — 화면만 찍는다")

        # 적합 실행 뒤 화면이 Step 6 까지 흘러갔다(2026-09-10). 이미 지나온 단계는
        # 위쪽 표시를 눌러 되돌아갈 수 있다. 4단계로 돌아가 그 화면을 찍는다.
        back = c.js("""
            const b = Array.from(document.querySelectorAll('button'))
                .find(x => x.textContent.includes('분석·시각화'));
            if (!b) return 'no-step4';
            b.click();
            await new Promise(r => setTimeout(r, 2500));
            return (document.body.innerText.match(/Step \d/)||[''])[0];
        """)
        print("  4단계로 —", back)

        # body 가 overflow:hidden 이고 안쪽 div 가 스크롤한다 — scrollHeight 로는
        # 전체를 못 받는다(2026-09-10). 적합 그래프로 스크롤한 뒤 뷰포트를 찍는다.
        moved = c.js("""
            const cards = Array.from(document.querySelectorAll('div,section,article'));
            const t = cards.reverse().find(e =>
                /Rp\/R|반지름비/.test(e.textContent) && e.querySelector('svg')
                && e.getBoundingClientRect().height > 200);
            if (!t) return 'no-target';
            t.scrollIntoView({block:'center'});
            await new Promise(r => setTimeout(r, 1200));
            return Math.round(t.getBoundingClientRect().top);
        """)
        print("  적합 그래프로 스크롤 —", moved)
        time.sleep(1.5)
        shot = c.send("Page.captureScreenshot", format="png")
        path = os.path.join(OUT_DIR, "step4_analysis.png")
        with open(path, "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        from PIL import Image
        with Image.open(path) as im:
            print("저장 — %s (%d×%d)" % (path, im.width, im.height))
    finally:
        c.close()
        proc.kill()


if __name__ == "__main__":
    main()
