# -*- coding: utf-8 -*-
"""코딩 에이전트 도구 로고 띠를 만든다 (2026-09-11).

사장님 지시 — *「바이브코딩이나 ai에이전트쪽엔 claude codex 로고 넣자」*.

로고는 상표다. **아무 데서나 긁어 오지 않고 `simple-icons` 의 CC0 아이콘을 쓴다.**
아이콘 자체는 CC0 1.0 이고 상표권은 각 소유자에게 있으며, 도구를 «가리키는» 용도로
쓰는 것은 통상적 범위다. 슬라이드에 출처를 적는다.

가로로 길고 낮게 뽑는다. 슬라이드 폭에 맞춰 늘릴 때 글자가 작아지지 않도록
캡처 자체를 1,280픽셀로 좁게 잡고 글자를 크게 쓴다 — 1,280px 를 12.09인치에 놓으면
19px 글자가 약 13pt 가 된다.

    python make_logos.py      →  deck/fig_tools.png
"""
import io
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), "logos")
CHROME = r"C:/Program Files/Google/Chrome/Application/chrome.exe"

TOOLS = [
    ("claude.svg", "Claude Code", "Anthropic"),
    ("openai.svg", "Codex", "OpenAI"),
    ("githubcopilot.svg", "Copilot", "GitHub"),
    ("googlegemini.svg", "Gemini CLI", "Google"),
]


def inline(name):
    s = io.open(os.path.join(SRC, name), encoding="utf-8").read()
    s = re.sub(r'\s(width|height|fill)="[^"]*"', "", s)
    return s.replace("<svg", '<svg width="34" height="34" fill="currentColor"', 1)


cards = "".join(
    '<div class="c">%s<div class="t"><div class="n">%s</div>'
    '<div class="v">%s</div></div></div>' % (inline(f), n, v)
    for f, n, v in TOOLS)

html = """<!doctype html><meta charset="utf-8"><style>
 *{box-sizing:border-box;margin:0}
 body{font-family:"Malgun Gothic",sans-serif;background:#fff;padding:12px 16px}
 .row{display:flex;gap:18px}
 .c{flex:1;display:flex;align-items:center;gap:12px;
    border:1.4px solid #D3DDE8;border-radius:9px;padding:10px 14px;color:#1F4E79}
 .t{text-align:left;line-height:1.25}
 .n{font-size:19px;font-weight:700;color:#1F4E79}
 .v{font-size:13px;color:#70706F}
 .f{margin-top:10px;font-size:13px;color:#8A8A8A}
</style><div class="row">%s</div>
<div class="f">아이콘 — simple-icons (CC0 1.0). 상표는 각 소유자의 것이며 도구를 가리키는
용도로만 썼다.</div>""" % cards

page = os.path.join(HERE, "_tools.html")
io.open(page, "w", encoding="utf-8").write(html)
out = os.path.join(HERE, "fig_tools.png")
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                "--window-size=1280,118", "--default-background-color=FFFFFFFF",
                "--screenshot=" + out, page],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
from PIL import Image
print("fig_tools.png", Image.open(out).size)
