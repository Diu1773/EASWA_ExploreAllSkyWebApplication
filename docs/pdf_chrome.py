# -*- coding: utf-8 -*-
"""미리보기 HTML 을 크롬으로 인쇄해 PDF 로 만든다.

한글 COM 이 뜨지 않을 때 쓰는 길이다(2026-09-10, `서버 실행이 실패했습니다`).
제출본은 한글이 뽑은 것이어야 하지만, 검토용으로 돌려 볼 판은 이것으로 충분하다.

용지는 210×285mm 이고 여백은 HTML 의 `@page` 가 갖고 있으므로
`preferCSSPageSize` 로 그대로 따르게 한다.

    python -X utf8 docs/typeset_hwp.py --preview
    python -X utf8 docs/pdf_chrome.py
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
PORT = 9224
BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
SRC = os.path.join(BASE, "EASWA_논문_v18_투고본_미리보기.html")
OUT = os.path.join(BASE, "EASWA_논문_v18_투고본_크롬.pdf")


def main():
    if not os.path.exists(SRC):
        sys.exit("미리보기 HTML 이 없다 — docs/typeset_hwp.py --preview 를 먼저 돌린다")

    url = "file:///" + SRC.replace("\\", "/").replace(" ", "%20")
    profile = os.path.join(os.environ["TEMP"], "easwa_pdf_%d" % int(time.time()))
    p = subprocess.Popen([
        CHROME, "--headless=new", "--remote-debugging-port=%d" % PORT,
        "--user-data-dir=" + profile, "--remote-allow-origins=*",
        "--disable-gpu", "--no-first-run", "--allow-file-access-from-files",
        url,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    ws_url = None
    for _ in range(60):
        time.sleep(0.5)
        try:
            for t in json.load(urllib.request.urlopen(
                    "http://127.0.0.1:%d/json" % PORT, timeout=2)):
                if t.get("type") == "page" and "미리보기" in urllib.parse.unquote(t.get("url", "")):
                    ws_url = t["webSocketDebuggerUrl"]
                    break
        except Exception:
            pass
        if ws_url:
            break
    if not ws_url:
        p.kill()
        sys.exit("크롬이 미리보기 HTML 을 열지 못했다")

    ws = websocket.create_connection(ws_url, timeout=300, suppress_origin=True)
    n = [0]

    def send(method, **params):
        n[0] += 1
        ws.send(json.dumps({"id": n[0], "method": method, "params": params}))
        while True:
            m = json.loads(ws.recv())
            if m.get("id") == n[0]:
                if "error" in m:
                    raise RuntimeError("%s → %s" % (method, m["error"]))
                return m.get("result", {})

    # 그림이 다 뜬 뒤에 인쇄한다. 안 기다리면 빈 자리로 찍힌다.
    send("Runtime.enable")
    send("Runtime.evaluate", expression="""
        (async () => {
          const imgs = Array.from(document.images);
          await Promise.all(imgs.map(im => im.complete ? 0 :
            new Promise(r => { im.onload = r; im.onerror = r; })));
          return imgs.length;
        })()""", awaitPromise=True)
    time.sleep(2)

    r = send("Page.printToPDF", printBackground=True, preferCSSPageSize=True,
             displayHeaderFooter=False)
    with open(OUT, "wb") as f:
        f.write(base64.b64decode(r["data"]))
    ws.close()
    p.kill()

    import fitz
    d = fitz.open(OUT)
    print("만들었다 — %s" % OUT)
    print("  %d쪽 · %.1f MB" % (d.page_count, os.path.getsize(OUT) / 1e6))


if __name__ == "__main__":
    import urllib.parse  # noqa: E402
    main()
