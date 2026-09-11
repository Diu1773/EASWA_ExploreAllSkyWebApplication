# -*- coding: utf-8 -*-
"""코딩 에이전트 도구 로고 띠 (2026-09-11).

사장님 지시 —
  *「바이브코딩이나 ai에이전트쪽엔 claude codex 로고 넣자」*
  *「전체적으로 색감이 하늘색?파란색?청색?이라 그 ai로고들넣은거는 실제 로고들만
    넣는게 나을듯 카드없애고」*

그래서 **카드 테두리를 없애고 각 로고를 제 브랜드 색으로** 그린다. 슬라이드가 온통
청색이라 이 띠가 색을 들여놓는 자리다.

  Claude Code  #D97757 (주황)  ·  GitHub Copilot #000000
  Gemini CLI   #8E75B2 (보라)  ·  Cursor         #000000

**Codex 로고는 뺐다.** 2026-09-11 확인 시 `openai` 아이콘이 simple-icons 에서 내려갔다
(CDN 404, 3,460개 데이터에 없음). 상표권자가 배포 중지를 요청한 경우가 대부분이라
CC0 로 받을 길이 없다. 이름은 슬라이드 글줄에 남기고 마크만 뺐다.

아이콘은 `https://cdn.simpleicons.org/<slug>` 가 브랜드 색으로 내려 준 것을
`logos/<slug>_color.svg` 에 받아 두었다. 아이콘은 CC0 1.0, 상표는 각 소유자의 것이다.

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
    ("claude_color.svg", "Claude Code", "Anthropic"),
    ("githubcopilot_color.svg", "Copilot", "GitHub"),
    ("googlegemini_color.svg", "Gemini CLI", "Google"),
    ("cursor_color.svg", "Cursor", "Anysphere"),
]


def inline(name):
    s = io.open(os.path.join(SRC, name), encoding="utf-8").read()
    s = re.sub(r'\s(width|height)="[^"]*"', "", s)
    return s.replace("<svg", '<svg width="46" height="46"', 1)


cards = "".join(
    '<div class="c">%s<div class="t"><div class="n">%s</div>'
    '<div class="v">%s</div></div></div>' % (inline(f), n, v)
    for f, n, v in TOOLS)

html = """<!doctype html><meta charset="utf-8"><style>
 *{box-sizing:border-box;margin:0}
 body{font-family:"Malgun Gothic",sans-serif;background:#fff;padding:10px 18px}
 .row{display:flex;gap:14px}
 .c{flex:1;display:flex;align-items:center;justify-content:center;gap:13px}
 .t{text-align:left;line-height:1.22}
 .n{font-size:20px;font-weight:700;color:#1A1A1A}
 .v{font-size:13px;color:#70706F}
 .f{margin-top:10px;font-size:12.5px;color:#8A8A8A;text-align:center}
</style><div class="row">%s</div>
<div class="f">아이콘 — simple-icons (CC0 1.0), 각 브랜드 색. 상표는 각 소유자의 것이며
도구를 가리키는 용도로만 썼다.</div>""" % cards

page = os.path.join(HERE, "_tools.html")
io.open(page, "w", encoding="utf-8").write(html)
out = os.path.join(HERE, "fig_tools.png")
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                "--window-size=1280,118", "--default-background-color=FFFFFFFF",
                "--screenshot=" + out, page],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
from PIL import Image
print("fig_tools.png", Image.open(out).size)
