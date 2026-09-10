# -*- coding: utf-8 -*-
"""팝업을 지운 뒤 화면을 찍는다.

Chrome 의 `--screenshot` 은 클릭을 못 한다. Planet Hunters 는 첫 방문마다 튜토리얼
팝업이 뜨고 그 상태가 localStorage 에 남지 않아, 헤드리스로는 늘 팝업이 덮인다.
그래서 DevTools 프로토콜로 붙어 팝업을 DOM 에서 걷어낸 뒤 찍는다.

  python shoot.py <url> <out.png> [width] [height] [지울 선택자 ...]
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

import websocket

CHROME = r"C:/Program Files/Google/Chrome/Application/chrome.exe"
PORT = 9333


def targets():
    with urllib.request.urlopen("http://127.0.0.1:%d/json" % PORT, timeout=5) as r:
        return json.load(r)


def main():
    url, out = sys.argv[1], sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1440
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 900
    kill = sys.argv[5:]

    prof = os.path.join(os.path.dirname(os.path.abspath(out)), "_cdp_prof")
    p = subprocess.Popen([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--remote-debugging-port=%d" % PORT, "--remote-allow-origins=*", "--user-data-dir=" + prof,
        "--window-size=%d,%d" % (w, h), "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    ws = None
    try:
        for _ in range(40):                     # 디버깅 포트가 열릴 때까지
            try:
                t = [x for x in targets() if x["type"] == "page"]
                if t:
                    break
            except Exception:
                pass
            time.sleep(0.4)
        else:
            raise SystemExit("Chrome 디버깅 포트가 안 열렸다")

        ws = websocket.create_connection(t[0]["webSocketDebuggerUrl"], timeout=60)
        n = [0]

        def send(method, **params):
            n[0] += 1
            ws.send(json.dumps({"id": n[0], "method": method, "params": params}))
            while True:
                m = json.loads(ws.recv())
                if m.get("id") == n[0]:
                    return m.get("result", {})

        send("Page.enable")
        send("Page.navigate", url=url)
        time.sleep(14)                          # 광도곡선이 그려질 때까지 넉넉히
        for sel in kill:
            send("Runtime.evaluate", expression=
                 "document.querySelectorAll(%r).forEach(function(e){e.remove()});"
                 % sel, awaitPromise=False)
        time.sleep(1.5)
        r = send("Page.captureScreenshot", format="png")
        open(out, "wb").write(base64.b64decode(r["data"]))
        print("찍힘 — %s (%d바이트)" % (out, os.path.getsize(out)))
    finally:
        if ws:
            ws.close()
        p.terminate()


if __name__ == "__main__":
    main()
