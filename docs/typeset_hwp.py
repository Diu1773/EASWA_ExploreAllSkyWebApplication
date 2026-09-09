# -*- coding: utf-8 -*-
"""학회 논문템플릿(논문템플릿.hwp)의 서식을 그대로 입힌 조판본을 만든다.

COM 실측: 본문 KoPubWorld바탕체 Light 10pt · 논문 제목 KoPubWorld바탕체_Pro Bold
22pt 가운데 · 장·절 제목 KoPubWorld돋움체 Bold · 표와 캡션 KoPubWorld돋움체 Light
8.5pt · 용지 210×285 mm.

이 HTML 을 한글에서 열어 hwp 로 저장한다(docs/make_hwp.py).
"""
_OLD_DOC = """v16 원고(md) → 조판 HTML.

v15 조판본(`EASWA_논문_v15_조판.html`)의 <style>을 그대로 물려쓰되 v16에서 생긴 것을 처리한다.

  · **그림 여덟 장** — v15에는 이미지 줄이 없어 기존 스크립트가 다루지 못했다.
    「![대체글](경로)」와 그 뒤의 「**그림 N. …**」를 하나의 figure로 묶는다.
  · **부록 A~C** — 새 쪽에서 시작하도록 표시한다.
  · **인쇄 미디어** — 목차를 감추고 종이 여백만 남긴다.
  · **그림 인라인** — 그림을 data URI로 넣어 파일 하나로 완결시킨다. 폴더를 옮겨도
    그림이 보이고, 헤드리스 Chrome의 PDF 변환이 한글 경로에서 걸리지 않는다.

  python -X utf8 docs/typeset_v16.py            # 그림은 상대경로
  python -X utf8 docs/typeset_v16.py --inline   # 그림을 파일 안에 넣는다
"""
import base64
import io
import html
import os
import re
import sys

BASE = "C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos"
SRC = BASE + "/EASWA_논문_v17.md"
STYLE_FROM = BASE + "/EASWA_논문_v15_조판.html"
# 두 판을 따로 돌리면 한쪽이 옛 내용으로 남는다(2026-09-09, 소유자가 그 판을 보고
# 이미 지운 문장을 지적했다). --only-plain 을 주지 않으면 두 판을 모두 만든다.
INLINE = "--inline" in sys.argv
OUT = BASE + ("/EASWA_논문_v17_투고본.html" if INLINE else "/EASWA_논문_v17_투고본.html")


def img_src(rel):
    """--inline이면 그림을 data URI로 바꾼다. 파일이 없으면 경로를 그대로 둔다."""
    if not INLINE:
        return rel
    p = os.path.join(BASE, rel.replace("/", os.sep))
    if not os.path.exists(p):
        print("  ! 그림 없음: %s" % rel)
        return rel
    ext = os.path.splitext(p)[1].lstrip(".").lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "gif": "image/gif", "svg": "image/svg+xml"}.get(ext, "image/png")
    with open(p, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode("ascii"))

EXTRA_CSS = """
.fig{margin:1.3em 0 1.5em;page-break-inside:avoid;text-align:center}
.fig img{max-width:100%;border:1px solid var(--line)}
.fig .figcap{font-family:"Noto Sans KR",sans-serif;font-size:9.3pt;font-weight:600;
                      margin-top:.45em;text-align:left;color:#111}
h1.apx{page-break-before:always}
/* 인쇄 여백을 @page가 아니라 본문 padding으로 준다. @page margin이 0이면 Chrome이
   머리글(날짜·제목)과 바닥글(파일 경로·쪽번호)을 그릴 자리를 잃는다.
   --print-to-pdf-no-header / --no-pdf-header-footer 플래그는 이 버전에서 듣지 않았다. */
/* 학회 논문템플릿.hwp 실측 판형 — A4 가 아니라 210×285 mm 다. */
@page{size:210mm 285mm;margin:0}
/* ── 게재본 실측 서식 (조훈·손정주 2022 · 김미림·손정주 2022, 현장과학교육) ──
   본문 9.8pt · 표와 캡션 8.4pt · 국문 제목 22pt · 영문 제목 19pt Times ·
   초록 8.5pt · 본문 폭 165.5mm · 표는 가로선만(1.14pt 굵은 선, 0.36pt 가는 선) */
body{font-family:"KoPubWorld바탕체 Light","함초롬바탕","바탕",Batang,serif;font-size:9.8pt;line-height:1.62}
p,li,td,th{word-break:keep-all;line-break:strict}

/* 표제부 */
.jhead{display:flex;justify-content:space-between;font-size:9pt;
 font-family:"KoPubWorld돋움체 Light","함초롬돋움",sans-serif;margin:0 0 14mm}
.doctitle{text-indent:0;font-family:"KoPubWorld바탕체_Pro Bold","함초롬바탕",serif;font-size:22pt;font-weight:700;
 text-align:center;line-height:1.32;border:0;margin:0 0 6mm;letter-spacing:-.01em}
.au{font-family:"KoPubWorld돋움체 Medium","함초롬돋움",sans-serif;font-size:11pt;text-align:center;
 margin:0 0 2.6mm;text-indent:0}
.af{font-size:10pt;text-align:center;margin:0 0 8mm;text-indent:0}
.entitle{font-family:"Times New Roman",serif;font-size:19pt;text-align:center;line-height:1.3;
 margin:0 0 5mm;text-indent:0}
.enau{font-size:11pt;text-align:center;margin:0 0 2.4mm;text-indent:0}
.enaf{font-family:"Times New Roman",serif;font-style:italic;font-size:11pt;text-align:center;
 margin:0 0 10mm;text-indent:0}
h2.abshead{font-family:"KoPubWorld돋움체 Bold","함초롬돋움",sans-serif;font-size:10pt;font-weight:700;
 text-align:center;border:0;margin:0 0 3.4mm;padding:0}
.absbody p,.absbody{font-size:8.5pt;line-height:1.55;text-align:justify}
.kw{font-size:8.5pt;margin:3.4mm 0 0;text-indent:0}
.corr{font-size:8pt;margin:14mm 0 0;padding-top:2mm;border-top:.6px solid #444;text-indent:0}

/* 본문 */
h1,h2,h3,h4{font-family:"KoPubWorld돋움체 Bold","함초롬돋움",sans-serif;font-weight:700}
h1{font-size:12.5pt;text-align:center;border:0;margin:7mm 0 3mm;padding:0}
h2{font-size:10.5pt;margin:5mm 0 1.6mm}
h3{font-size:10pt;margin:3.6mm 0 1.2mm}
table,.tcap,.fig .figcap{font-family:"KoPubWorld돋움체 Light","함초롬돋움",sans-serif;font-size:8.4pt}
.tcap{font-weight:700;margin-bottom:1.4mm}
table{border-collapse:collapse;width:100%;line-height:1.42}
th,td{border:0;border-top:.36px solid #333;padding:1.3mm 1.8mm;vertical-align:top}
thead th{border-top:1.14px solid #000;border-bottom:.36px solid #333;font-weight:700}
tbody tr:last-child td{border-bottom:1.14px solid #000}
.fig .figcap{line-height:1.45;text-align:justify}

/* 그림 — 게재본 실측 최대 171×123 mm */
.fig img{max-width:100%;max-height:118mm;width:auto;object-fit:contain;border:.4px solid #999}
.fig .panels img{max-height:66mm}
.fig .panels.grid2 img{max-height:56mm}

.fig .panels{display:flex;gap:5px;align-items:flex-start;justify-content:center}
.fig .panels img{flex:1 1 0;min-width:0;width:100%}
.fig .panels.grid2{flex-wrap:wrap}
.fig .panels.grid2 img{flex:0 0 calc(50% - 3px);width:calc(50% - 3px)}
.tbl.big,.tbl.big table{page-break-inside:auto}
.tbl.big thead{display:table-header-group}
.tbl.big tr{page-break-inside:avoid}
.tcap{page-break-after:avoid}
@media print{
  #toc{display:none}
  #page-area{padding-left:0}
  #paper{margin:0;max-width:none;padding:21.4mm 22.5mm 19mm;box-shadow:none}
  html{background:#fff}
}
</style>"""

old = io.open(STYLE_FROM, encoding="utf-8").read()
style = old[old.index("<style>"):old.index("</style>")] + EXTRA_CSS

md = io.open(SRC, encoding="utf-8").read().replace("\r\n", "\n")
md = re.sub(r"<!--\s*EASWA_[A-Z_]+\s*-->\n?", "", md)   # 검증기 마커
lines = md.split("\n")


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![*\w])\*([^*\n]+?)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"`([^`]+?)`", r"<code>\1</code>", t)
    t = re.sub(r"\[([^\]]+?)\]\(([^)]+?)\)", r'<a href="\2">\1</a>', t)
    return t


def _titlepage_class(s):
    """표제부 한 줄이 어느 자리인지 판정한다 (게재본 배열 기준)."""
    t = s.strip()
    if t.startswith('*교신저자'):
        return 'corr'
    if re.match(r'^\*\*[A-Z].+\*\*$', t):          # **영문 제목**
        return 'entitle'
    if re.match(r'^\*[A-Z].+\*$', t):                # *영문 소속*
        return 'enaf'
    if re.match(r'^[가-힣]{2,4}( ?[·,] ?[가-힣]{2,4})+\*?$', t):
        return 'au'
    if '대학교' in t and len(t) < 60:
        return 'af'
    if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+( ?[·,] ?[A-Z][a-z]+ [A-Z][a-z]+)+\*?$', t):
        return 'enau'
    return None


# 한글은 HTML 을 가져올 때 CSS 의 max-width/max-height 를 무시하고 이미지 픽셀을
# 96dpi 로 환산해 넣는다(2880px → 762mm). 그래서 img 태그에 픽셀 크기를 직접 적는다.
# 게재본 실측 상한: 폭 166mm · 높이 118mm.
PX_PER_MM = 96.0 / 25.4
MAX_W_MM, MAX_H_MM = 165.5, 130.0


def img_box(src, share=1.0):
    """이미지 하나가 차지할 픽셀 폭·높이를 돌려준다. share 는 한 줄에 몇 몫인지."""
    try:
        from PIL import Image
        p = src if os.path.isabs(src) else os.path.join(BASE, src)
        with Image.open(p) as im:
            w0, h0 = im.size
    except Exception:
        return None
    ratio = h0 / float(w0)
    w_mm = MAX_W_MM * share
    if w_mm * ratio > MAX_H_MM:
        w_mm = MAX_H_MM / ratio
    return int(w_mm * PX_PER_MM), int(w_mm * ratio * PX_PER_MM)


def img_tag(src, alt, share=1.0):
    box = img_box(src, share)
    dim = ' width="%d" height="%d"' % box if box else ''
    return '<img src="%s" alt="%s"%s>' % (html.escape(img_src(src)), html.escape(alt), dim)


out, toc = [], []
seen_body = False
sid = 0
i = 0
in_abs = False


def close_abs():
    global in_abs
    if in_abs:
        out.append("</section>")
        in_abs = False


while i < len(lines):
    ln = lines[i]
    s = ln.strip()

    # ── 표 ────────────────────────────────────────────────────────
    if s.startswith("|") and i + 1 < len(lines) and re.match(r"^\|\s*:?-{2,}", lines[i + 1].strip()):
        cap = ""
        if out and out[-1].startswith('<p class="tcapsrc">'):
            cap = out.pop()[len('<p class="tcapsrc">'):-len("</p>")]
        hdr = [c.strip() for c in s.strip("|").split("|")]
        i += 2
        rows = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
            i += 1
        # 한 쪽에 안 들어가는 표에까지 page-break-inside:avoid 를 걸면 통째로 다음
        # 쪽으로 밀려 앞 쪽이 비어 버린다(2026-09-09, 소유자가 10 쪽에서 발견).
        # 행이 많으면 나뉘도록 두고 머리행을 쪽마다 반복한다.
        t = ['<div class="tbl%s">' % (" big" if len(rows) > 12 else "")]
        if cap:
            t.append('<div class="tcap">%s</div>' % cap)
        t.append('<div class="tw"><table><thead><tr>')
        t += ["<th>%s</th>" % inline(c) for c in hdr]
        t.append("</tr></thead><tbody>")
        for r in rows:
            t.append("<tr>" + "".join("<td>%s</td>" % inline(c) for c in r) + "</tr>")
        t.append("</tbody></table></div></div>")
        out.append("".join(t))
        continue

    # ── 그림 ──────────────────────────────────────────────────────
    # 이미지 줄 다음에 오는 「**그림 N. …**」를 같은 figure의 캡션으로 끌어온다.
    # 한 줄에 이미지가 둘 이상이면 나란히 놓는 패널 그림으로 만든다.
    # 화면 여러 장을 각각 한 쪽씩 잡아먹지 않게 하는 장치다(2026-09-09).
    # figure/figcaption 은 한글이 블록으로 보지 않아 그림이 문단 안에 인라인으로
    # 박힌다(2026-09-09, 14 쪽에서 발견). div·p 로만 짠다.
    panels = re.findall(r"!\[([^\]]*)\]\(([^)]+)\)", s)
    if len(panels) > 1 and re.fullmatch(r"(?:\s*!\[[^\]]*\]\([^)]+\)\s*)+", s):
        cap = ""
        j = i + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        if j < len(lines) and re.match(r"^\*\*그림\s", lines[j].strip()):
            cap = lines[j].strip()
            i = j
        share = 0.5 if len(panels) in (2, 4) else 1.0 / max(1, len(panels))
        imgs = "".join(img_tag(src, alt, share) for alt, src in panels)
        grid = " grid2" if len(panels) == 4 else ""
        out.append('<div class="fig" align="center"><div class="panels%s">%s</div>%s</div>'
                   % (grid, imgs,
                      '<p class="figcap" align="left">%s</p>' % inline(cap) if cap else ""))
        i += 1
        continue

    mi = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$", s)
    if mi:
        cap = ""
        j = i + 1
        while j < len(lines) and not lines[j].strip():
            j += 1
        if j < len(lines) and re.match(r"^\*\*그림\s", lines[j].strip()):
            # 캡션은 「**그림 N. 제목.** 설명…」처럼 굵은 부분 뒤에 설명이 이어지기도 한다.
            # 앞뒤 두 글자를 무조건 자르면 설명의 끝이 날아가므로 원문을 그대로 넘긴다.
            cap = lines[j].strip()
            i = j
        out.append('<div class="fig" align="center"><p align="center">%s</p>%s</div>'
                   % (img_tag(mi.group(2), mi.group(1)),
                      '<p class="figcap" align="left">%s</p>' % inline(cap) if cap else ""))
        i += 1
        continue

    # ── 헤딩 ──────────────────────────────────────────────────────
    m = re.match(r"^(#{1,4})\s+(.*)$", s)
    if m:
        lvl, txt = len(m.group(1)), m.group(2).strip()
        sid += 1
        aid = "s%d" % sid
        if lvl == 1 and sid == 1:
            close_abs()
            out.append('<div class="jhead"><span>| 연구논문 |</span>'
                       '<span>현장과학교육 &nbsp;( )&nbsp; PP &nbsp;-</span><span></span></div>')
            # h1 으로 두면 한글 내장 개요 문단모양이 CSS 가운데정렬을 덮는다.
            out.append('<p class="doctitle" align="center" id="%s">%s</p>' % (aid, inline(txt)))
            toc.append('<a class="lv1" href="#%s">%s</a>' % (aid, html.escape(txt)))
        elif txt in ("요약", "국문초록", "Abstract"):
            close_abs()
            out.append('<section class="abs"><h2 class="abshead" id="%s">%s</h2>' % (aid, inline(txt)))
            in_abs = True
            toc.append('<a class="lv2" href="#%s">%s</a>' % (aid, html.escape(txt)))
        else:
            close_abs()
            tag = {1: "h1", 2: "h2", 3: "h3", 4: "h4"}[lvl]
            cls = ' class="apx"' if txt.startswith("부록") else ""
            if lvl == 1: seen_body = True
            al = ' align="center"' if lvl == 1 else ' align="left"'
            out.append("<%s%s%s id=\"%s\">%s</%s>" % (tag, cls, al, aid, inline(txt), tag))
            if lvl <= 2:
                toc.append('<a class="lv%d" href="#%s">%s</a>' % (lvl, aid, html.escape(txt)))
        i += 1
        continue

    if s == "---" or not s:
        i += 1
        continue

    # ── 목록·인용 ─────────────────────────────────────────────────
    if re.match(r"^[-*]\s+", s):
        items = []
        while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
            items.append(inline(re.sub(r"^[-*]\s+", "", lines[i].strip())))
            i += 1
        out.append("<ul>" + "".join("<li>%s</li>" % x for x in items) + "</ul>")
        continue
    if re.match(r"^\d+\.\s+", s):
        items = []
        while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
            items.append(inline(re.sub(r"^\d+\.\s+", "", lines[i].strip())))
            i += 1
        out.append("<ol>" + "".join("<li>%s</li>" % x for x in items) + "</ol>")
        continue
    if s.startswith(">"):
        q = []
        while i < len(lines) and lines[i].strip().startswith(">"):
            q.append(inline(lines[i].strip().lstrip(">").strip()))
            i += 1
        out.append("<blockquote>" + " ".join(q) + "</blockquote>")
        continue

    # 표 캡션 후보 — 바로 다음이 표면 위에서 캡션으로 회수한다.
    if re.match(r"^\*\*(표|그림)\s", s) and s.endswith("**"):
        out.append('<p class="tcapsrc">%s</p>' % inline(s[2:-2]))
        i += 1
        continue
    if s.startswith("**주제어:**") or s.startswith("**Keywords:**"):
        out.append('<p class="kw">%s</p>' % inline(s))
        i += 1
        continue

    if not seen_body:
        cls = _titlepage_class(s)
        if cls:
            body_txt = s.strip()
            if cls == 'entitle':
                body_txt = body_txt[2:-2]           # **영문 제목**
            elif cls == 'enaf':
                body_txt = body_txt[1:-1]           # *영문 소속*
            # au·enau 끝의 *(교신저자)와 corr 앞의 *는 그대로 둔다
            out.append('<p class="%s">%s</p>' % (cls, inline(body_txt)))
            i += 1
            continue
    out.append("<p>%s</p>" % inline(s))
    i += 1

close_abs()
body = "".join(out).replace('<p class="tcapsrc">', '<p class="tcap-inline">')
title = re.sub(r"^#\s+", "", lines[0]).strip()

doc = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet">
%s</head><body>
<!-- 목차 없음: 투고본 -->
<div id="page-area"><div id="paper">%s</div></div>
</body></html>""" % (html.escape(title), style, body)

io.open(OUT, "w", encoding="utf-8", newline="\n").write(doc)

n_fig = body.count('<div class="fig"')
n_tbl = body.count('<div class="tbl')
print("조판 완료 — %s" % OUT)
print("  표 %d개 · 그림 %d개 · 목차 %d항목 · %,d바이트"
      .replace("%,d", "%d") % (n_tbl, n_fig, len(toc), len(doc)))
