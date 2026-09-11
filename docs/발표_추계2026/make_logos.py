# -*- coding: utf-8 -*-
"""코딩 에이전트 도구 로고 띠 (2026-09-11).

사장님 지시 —
  *「바이브코딩이나 ai에이전트쪽엔 claude codex 로고 넣자」*
  *「전체적으로 색감이 하늘색?파란색?청색?이라 그 ai로고들넣은거는 실제 로고들만
    넣는게 나을듯 카드없애고」*

그래서 **카드 테두리를 없애고 각 로고를 제 브랜드 색으로** 그린다. 슬라이드가 온통
청색이라 이 띠가 색을 들여놓는 자리다.

  Claude Code  #D97757 (주황)  ·  Codex  #000000  ·  Cursor  #000000

사장님이 *「copilot gemini 빼고 codex넣어라」* 하셔서 셋만 둔다 —
**Claude Code · Codex · Cursor**.

**OpenAI 마크의 출처는 나머지 셋과 다르다.** 2026-09-11 확인 시 `openai` 아이콘이
simple-icons 에서 내려가 있다(CDN 404, 3,460개 데이터에 없음). 그 사실을 말씀드렸고
넣으라고 정하셨다. 쓰는 파일은 그 모음에 있을 때 받아 둔 `logos/openai.svg` 이고,
CC0 1.0 은 철회되지 않는 포기 선언이라 **복제 자체는 그대로 허용된다.** 내려간 쪽은
상표 문제로 보이며, 도구를 «가리키는» 용도(지칭적 사용)는 통상적 범위다.
그림 안과 슬라이드 아래에 이 사정을 적는다.

나머지 셋은 `https://cdn.simpleicons.org/<slug>` 가 브랜드 색으로 내려 준 것을
`logos/<slug>_color.svg` 에 받아 두었다. 상표는 각 소유자의 것이다.

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
    ("openai_color.svg", "Codex", "OpenAI"),
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
<div class="f">아이콘 — simple-icons (CC0 1.0), 각 브랜드 색. OpenAI 마크는 그 모음에
있을 때 받아 둔 CC0 판. 상표는 각 소유자의 것이며 도구를 가리키는 용도로만 썼다.</div>""" % cards

page = os.path.join(HERE, "_tools.html")
io.open(page, "w", encoding="utf-8").write(html)
out = os.path.join(HERE, "fig_tools.png")
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                "--window-size=1280,118", "--default-background-color=FFFFFFFF",
                "--screenshot=" + out, page],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
from PIL import Image
print("fig_tools.png", Image.open(out).size)
