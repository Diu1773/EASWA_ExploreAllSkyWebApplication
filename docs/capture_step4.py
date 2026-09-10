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


def require_server():
    """백엔드가 살아 있는지 먼저 본다.

    죽은 채로 돌리면 모든 단계가 조용히 False 를 내고, 그 빈 화면으로 이미 잘 찍힌
    그림을 덮어쓴다(2026-09-10 두 번). 「찍혔다」는 로그는 파일이 생겼다는 뜻일 뿐
    내용이 옳다는 뜻이 아니다.
    """
    try:
        with urllib.request.urlopen(URL, timeout=10) as r:
            if r.status == 200:
                return
    except Exception as e:
        sys.exit("백엔드가 5895 에서 응답하지 않는다 (%s).\n"
                 "  preview_start 로 backend 를 올린 뒤 다시 돌린다." % str(e)[:60])
    sys.exit("백엔드가 5895 에서 200 을 주지 않는다")


def launch():
    # 프로필을 재사용하면 지난 실행의 sessionStorage 가 남아 6단계에서 시작한다
    # (2026-09-10, 「Step 1 로 (못 함)」이 그 증거였다). 매번 새로 만든다.
    # 같은 경로를 쓰면 앞 실행이 살아 있어 삭제가 조용히 실패하고, 진행 상태를
    # 그대로 이어받아 4단계에서 시작한다(2026-09-10, 세 화면이 같은 그림이 됐다).
    profile = os.path.join(os.environ["TEMP"], "easwa_shot_%d" % int(time.time()))
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
    # 진행 상태가 localStorage 에 남아 6단계에서 시작한다. 프로필을 지워도 그대로다
    # (2026-09-10, 로그의 step=6 이 첫 줄부터 찍혔다). 비우고 다시 읽는다.
    ("기록 지우고 새로 시작", """
        // localStorage 를 비우고 다시 읽어도 4단계로 돌아온다(2026-09-10). 화면의
        // 「기록 지우고 새로 시작」이 앱이 아는 방식으로 상태를 지운다.
        window.confirm = () => true;
        window.alert = () => {};
        return (document.body.innerText.match(/Step (\d)/)||[])[1] || '?';""",
     4, "step0_entry.png"),
    ("Step 1 로", "return await window.__click('다음 단계', true, 20);", 1),
    ("대상 WASP-6 b", "return await window.__click('WASP-6 b', false, 30);", 2),
    ("Step 2 로", """
        if (!await window.__click('다음 단계', true, 20)) return false;
        // DSS 원본 <img> 가 픽셀을 받을 때까지 기다린다. loading="lazy" 라 화면에
        // 붙자마자 끝나지 않고, 「TESS 픽셀 격자」 canvas 는 그 img 를 소스로 다시
        // 그린다. 기다리지 않고 찍으면 격자와 강조 칸만 남아, 「한 픽셀에 별이 몇
        // 개 들어가는지 보라」는 화면에서 별이 사라진다
        // (2026-09-10, 그림 4(b) 가 그 상태로 원고에 들어갔다).
        const end = Date.now() + 45000;
        while (Date.now() < end) {
          const im = document.querySelector('.inquiry-skydata-stage img');
          if (im && im.complete && im.naturalWidth > 0) {
            await new Promise(r => setTimeout(r, 1200));   // canvas 다시 그리기
            return 'dss ' + im.naturalWidth + 'px';
          }
          await new Promise(r => setTimeout(r, 500));
        }
        return 'dss-timeout';""", 3, "step2_metadata.png"),
    ("Step 3 로", "return await window.__click('다음 단계', true, 20);", 3,
     "step3_conditions.png"),
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
    ("품질·광도곡선까지", """
        const log = [];
        for (let i = 0; i < 2; i++) {
          const end = Date.now() + 90000;
          let b = null;
          while (Date.now() < end) {
            b = Array.from(document.querySelectorAll('button'))
                 .find(x => /^다음:/.test(x.textContent.trim()) && !x.disabled);
            if (b) break;
            await new Promise(r => setTimeout(r, 800));
          }
          if (!b) { log.push('no-btn'); break; }
          log.push(b.textContent.trim().slice(0, 14));
          b.click();
          await new Promise(r => setTimeout(r, 5000));
        }
        return log.join(' > ');""", 3),
    ("ROI 를 관측 전체로", """
        // ROI 가 좁으면 식현상이 한 번만 들어가 점이 스무 개 남짓이다. 관측 구간
        // 전체를 잡으면 주기마다의 식이 위상 접기에서 겹쳐 곡선이 또렷해진다.
        const end = Date.now() + 30000;
        let ins = [];
        while (Date.now() < end) {
          ins = Array.from(document.querySelectorAll('input[type=number]'))
                 .filter(x => x.min && x.max);
          if (ins.length >= 2) break;
          await new Promise(r => setTimeout(r, 600));
        }
        if (ins.length < 2) return 'no-input';
        const set = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value').set;
        for (const [el, v] of [[ins[0], ins[0].min], [ins[1], ins[1].max]]) {
          set.call(el, String(v));
          el.dispatchEvent(new Event('input', {bubbles: true}));
          el.dispatchEvent(new Event('change', {bubbles: true}));
          await new Promise(r => setTimeout(r, 900));
        }
        return ins[0].value + ' ~ ' + ins[1].value;""", 3),
    ("모델 적합 단계로", """
        return await window.__click('다음: 식현상 모델 적합', false, 30);""", 4),
    ("위상 접기", """
        const ok = await window.__click('위상 접기', true, 20);
        return ok ? 'on' : 'not-found';""", 3),
    ("모델 적합 실행", """
        const ok = await window.__click('식현상 모델 적합 실행', true, 30);
        return ok ? 'clicked' : 'not-found';""", 40),
    ("적합 완료 대기", """
        const end = Date.now() + 90000;
        while (Date.now() < end) {
          const t = document.body.innerText;
          if (/측정값|Rp\/R\*\s*=|적합 결과/.test(t)) break;
          await new Promise(r => setTimeout(r, 1000));
        }
        return (document.body.innerText.match(/Step (\d)/)||[])[1] || '?';""", 2),
]


def snap(c, fname):
    """지금 화면을 파일로. 본문이 안쪽 div 에서 스크롤하므로 위로 올린 뒤 찍는다."""
    c.js("""
        const sc = Array.from(document.querySelectorAll('*'))
            .find(e => e.scrollHeight > e.clientHeight + 200 && e.clientHeight > 400);
        if (sc) sc.scrollTop = 0;
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 900));
        return 1;""")
    if fname == "step2_metadata.png":
        # 보이는 쪽(img 또는 canvas)에 실제로 밝은 화소가 있는지 센다. 격자와
        # 축척막대만 남은 화면도 「찍힘」으로는 성공이라 눈으로 봐야 알았다.
        lit = c.js("""
            const cv = document.querySelector('canvas.inquiry-skydata-binned');
            const im = document.querySelector('.inquiry-skydata-stage img');
            const vis = (cv && !cv.hidden) ? cv : null;
            if (vis) {
              const d = vis.getContext('2d')
                  .getImageData(0, 0, vis.width, vis.height).data;
              let n = 0;
              for (let i = 0; i < d.length; i += 4) if (d[i] > 60) n++;
              return 'canvas ' + n + '/' + (d.length / 4);
            }
            return im ? ('img ' + im.naturalWidth) : 'none';""")
        print("    하늘 이미지 —", lit, flush=True)
    shot = c.send("Page.captureScreenshot", format="png")
    path = os.path.join(OUT_DIR, fname)
    with open(path, "wb") as f:
        f.write(base64.b64decode(shot["data"]))
    print("    찍음 %s" % fname, flush=True)


def main():
    require_server()
    proc, ws_url = launch()
    c = CDP(ws_url)
    try:
        c.send("Page.enable")
        c.send("Runtime.enable")
        c.send("Emulation.setDeviceMetricsOverride",
               width=W, height=H, deviceScaleFactor=2, mobile=False)
        # 진행 상태는 sessionStorage 에 있다 — localStorage 를 비우고 리로드해도
        # 같은 탭이라 남는다(2026-09-10, 여덟 번 4~6단계에서 시작했다).
        # CDP 로 오리진 저장소를 통째로 지우고 새로 연다.
        try:
            c.send("Storage.clearDataForOrigin",
                   origin="http://localhost:5895", storageTypes="all")
            c.send("Page.navigate", url=URL)
            print("  저장소 비우고 다시 열었다", flush=True)
        except Exception as e:
            print("  ! 저장소 비우기 실패 —", str(e)[:100], flush=True)
        time.sleep(6)
        c.js("%s return 1;" % HELPER)
        steps = STEPS
        if "--upto" in sys.argv:
            want = sys.argv[sys.argv.index("--upto") + 1]
            cut = [i for i, it in enumerate(steps)
                   if len(it) > 3 and it[3].startswith(want)]
            if cut:
                steps = steps[:cut[0] + 1]
                print("  %s 까지만 찍는다 (%d 단계)" % (want, len(steps)), flush=True)
        for item in steps:
            name, js, wait = item[0], item[1], item[2]
            shot_name = item[3] if len(item) > 3 else None
            try:
                v = c.js(HELPER + js)
            except Exception as e:
                print("  ! %s — %s" % (name, str(e)[:160]), flush=True)
                v = None
            time.sleep(wait)
            try:
                st = c.js("return (document.body.innerText.match(/Step (\d)/)||[])[1] || '?';")
            except Exception:
                st = "?"
            print("  %-22s %-14r step=%s" % (name, v, st), flush=True)
            if shot_name:
                snap(c, shot_name)

        txt = c.js("return document.body.innerText.slice(0,4000);")
        if "Rp/R" not in (txt or ""):
            print("  ! 적합 결과를 찾지 못했다 — 화면만 찍는다")

        # 4단계 화면은 적합 그래프가 가운데 오게
        moved = c.js("""
            const gd = document.querySelector('.js-plotly-plot');
            if (!gd) return 'no-plot';
            gd.scrollIntoView({block: 'center'});
            await new Promise(r => setTimeout(r, 1200));
            return Math.round(gd.getBoundingClientRect().top);
        """)
        print("  적합 그래프로 스크롤 —", moved, flush=True)
        time.sleep(1.5)
        shot = c.send("Page.captureScreenshot", format="png")
        with open(os.path.join(OUT_DIR, "step4_analysis.png"), "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("    찍음 step4_analysis.png", flush=True)

        if len(steps) < len(STEPS):
            # --upto 로 잘랐으면 여기서 끝낸다. 아래는 4단계 적합을 끝낸 상태를
            # 전제로 5·6단계를 이어 찍는 코드라, 중간에서 멈춘 화면으로
            # step4·5·6 을 덮어쓴다(2026-09-10, 위상접기 적합 그림을 날렸다).
            print("  --upto 이므로 여기서 멈춘다", flush=True)
            return
        # 5·6단계도 이어서
        for label, fname in (("기준값 비교", "step5_reference.png"),
                             ("해석·기록", "step6_record.png")):
            ok = c.js(HELPER + "return await window.__click('다음 단계', true, 30);")
            time.sleep(6)
            st = c.js("return (document.body.innerText.match(/Step (\d)/)||[])[1] || '?';")
            print("  %s 로 %r step=%s" % (label, ok, st), flush=True)
            snap(c, fname)
        path = os.path.join(OUT_DIR, "step4_analysis.png")
        from PIL import Image
        with Image.open(path) as im:
            print("저장 — %s (%d×%d)" % (path, im.width, im.height))
    finally:
        c.close()
        proc.kill()


if __name__ == "__main__":
    main()
