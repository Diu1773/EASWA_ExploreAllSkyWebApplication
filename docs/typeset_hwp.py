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

EXTRA_CSS = ""
# 한글이 <style> 블록의 글꼴 이름을 망가뜨리므로 여기에는 글꼴을 적지 않는다.
# 크기·정렬·여백·들여쓰기·표 선만 담고, 글꼴은 각 요소의 style= 로 준다.
STYLE = """<style>
@page{size:210mm 285mm;margin:0}
html{background:#fff}
body{margin:0;font-size:9.8pt;line-height:1.62;color:#000}
#page-area{padding:0}
#paper{max-width:210mm;margin:0 auto;padding:21.4mm 22.0mm 19mm 22.5mm;background:#fff}
p{margin:0;word-break:keep-all;line-break:strict}
img{border:0}

/* 표제부 */
.hdtbl{width:100%;border:0}
td.hdl{border:0;padding:0;font-size:11pt;text-align:left}
td.hdr{border:0;padding:0;font-size:9pt;text-align:right;vertical-align:bottom}
.gap{margin:0;line-height:1;text-indent:0}
.doctitle{font-size:22pt;text-align:center;line-height:1.30;margin:0 0 6mm;text-indent:0}
.au{font-size:11pt;text-align:center;margin:0 0 2.4mm;text-indent:0}
.af{font-size:10pt;text-align:center;margin:0 0 8mm;text-indent:0}
.entitle{font-size:19pt;text-align:center;line-height:1.28;margin:0 0 5mm;text-indent:0}
.enau{font-size:11pt;text-align:center;margin:0 0 2.4mm;text-indent:0}
.enaf{font-size:11pt;font-style:italic;text-align:center;margin:0 0 9mm;text-indent:0}
.abshead{font-weight:bold;font-size:10pt;text-align:center;margin:0 0 3mm;text-indent:0}
.abs{font-size:8.5pt;text-align:justify;line-height:1.52;margin:0;text-indent:8.5pt}
.kw{font-size:8.5pt;text-align:justify;margin:3mm 0 0;text-indent:0}
.corr{font-size:9pt;text-align:left;margin:11mm 0 0;padding-top:1.6mm;
      border-top:.5px solid #333;text-indent:0}

/* 본문 */
.ch{font-weight:bold;font-size:15pt;text-align:center;margin:7mm 0 3.2mm;text-indent:0;page-break-after:avoid}
.sec{font-weight:bold;font-size:10.1pt;text-align:left;margin:4.6mm 0 1.5mm;text-indent:0;page-break-after:avoid}
.sub{font-weight:bold;font-size:9.8pt;text-align:left;margin:3.2mm 0 1mm;text-indent:0;page-break-after:avoid}
.sub4{font-weight:bold;font-size:9.8pt;text-align:left;margin:2.6mm 0 .8mm;text-indent:0;page-break-after:avoid}
.bd{font-size:9.8pt;text-align:justify;text-indent:9.8pt;margin:0}
.ref{font-size:9.8pt;text-align:justify;text-indent:-9mm;margin:0 0 0 9mm;line-height:1.55}
.quote{font-size:9.3pt;text-align:justify;margin:1.6mm 0 1.6mm 6mm;text-indent:0}
li{font-size:9.8pt;text-align:justify}
ul,ol{margin:1.2mm 0 1.2mm 8mm;padding:0}

/* 표 — 게재본은 가로선만 (굵은 선 1.14pt, 가는 선 0.36pt) */
.tbl{margin:2.4mm 0 3.4mm}
.cap{font-size:9.8pt;text-align:left;margin:0 0 1.2mm;text-indent:0;page-break-after:avoid}
table{border-collapse:collapse;width:100%;line-height:1.40}
th,td{border:0;border-top:.36px solid #333;padding:1.2mm 1.6mm;
      vertical-align:top;font-size:8.4pt;text-align:left}
thead th{border-top:1.14px solid #000;border-bottom:.36px solid #333;font-weight:bold}
tbody tr:last-child td{border-bottom:1.14px solid #000}
.tbl.big table{page-break-inside:auto}
.tbl.big thead{display:table-header-group}
.tbl.big tr{page-break-inside:avoid}

/* 그림 — 게재본 실측 폭 105~171mm · 높이 최대 123mm */
.fig{margin:3.2mm 0 3.6mm;text-align:center;page-break-inside:avoid}
.fig p{margin:0;text-indent:0}
.figcap{font-size:9.8pt;text-align:justify;margin:1.6mm 0 0;text-indent:0}
/* 여러 장짜리 그림 — 표 칸에 넣어 쪽이 갈리지 않게 한다 */
.pnltbl{width:100%;border:0;margin:0 auto}
td.pnl{border:0;padding:0 1mm 1.5mm;text-align:center;vertical-align:top}

/* 머리글 표는 선을 그리지 않는다 — 위의 th,td 규칙 뒤에 와야 지워진다. */
.hdtbl,.hdtbl tr,.hdtbl td{border:0;border-top:0;border-bottom:0;padding:0}
</style>"""

style = STYLE

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
# 게재본 실측: 그림 폭 105~171mm · 높이 최대 123mm (김미림·손정주 2022 그림 2).
PX_PER_MM = 96.0 / 25.4
MAX_W_MM, MAX_H_MM = 165.5, 123.0


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


def montage(srcs, cols=2, gut=10):
    """여러 장을 한 장으로 합친다.

    한글은 표 행이나 문단 줄 사이에서 쪽을 나누므로, 그림 여러 장을 나란히 두면
    쪽 경계에서 찢어진다(2026-09-09, 그림 3 의 네 장이 14~15쪽으로 갈렸다).
    한 장으로 합치면 통째로 다음 쪽으로 넘어간다.
    """
    from PIL import Image
    ims = [Image.open(src if os.path.isabs(src) else os.path.join(BASE, src)).convert("RGB")
           for src in srcs]
    cw = min(im.width for im in ims)
    ims = [im if im.width == cw else im.resize((cw, max(1, round(im.height * cw / im.width))),
                                               Image.LANCZOS) for im in ims]
    rows = [ims[k:k + cols] for k in range(0, len(ims), cols)]
    rh = [max(im.height for im in r) for r in rows]
    W = cw * cols + gut * (cols - 1)
    H = sum(rh) + gut * (len(rows) - 1)
    out_im = Image.new("RGB", (W, H), (255, 255, 255))
    y = 0
    for r, h in zip(rows, rh):
        x = 0
        for im in r:
            out_im.paste(im, (x, y))
            x += cw + gut
        y += h + gut
    name = "_panel_%s.png" % ("-".join(os.path.splitext(os.path.basename(x))[0] for x in srcs))[:80]
    path = os.path.join(BASE, "원고_그림", name)
    out_im.save(path)
    for im in ims:
        im.close()
    return "원고_그림/" + name


def img_tag(src, alt, share=1.0):
    box = img_box(src, share)
    dim = ' width="%d" height="%d"' % box if box else ''
    return '<img src="%s" alt="%s"%s>' % (html.escape(img_src(src)), html.escape(alt), dim)



# ── 게재본 실측 서식 ────────────────────────────────────────────────────
# 조훈·손정주(2022) 현장과학교육 16(5) · 김미림·손정주(2022) 16(1)
#   장 제목 15pt · 절 제목 10.1pt 돋움Bold · 본문 9.8pt · 초록 8.5pt
#   표·그림 캡션 9.8pt 돋움Medium · 표 본문 8.4pt · 국문 제목 22pt · 영문 제목 19pt
#
# 한글의 HTML 가져오기는 <style> 블록의 font-family 를 대문자로 바꾸고 따옴표까지
# 글꼴 이름에 넣어 버린다(KOPUBWORLD바탕체 LIGHT" 같은 이름이 남는다). 반면 요소에
# 직접 쓴 style="font-family:…" 는 이름 그대로 저장된다. 그래서 글꼴만 인라인으로 준다.
F_SERIF   = 'KoPubWorld바탕체 Light'
F_SERIF_B = 'KoPubWorld바탕체_Pro Bold'
F_SANS_L  = 'KoPubWorld돋움체 Light'
F_SANS_M  = 'KoPubWorld돋움체 Medium'
F_SANS_B  = 'KoPubWorld돋움체 Bold'
F_LATIN   = 'Times New Roman'

ROLE_FONT = {
    'hdl': F_SANS_M, 'hdr': F_SERIF, 'doctitle': F_SERIF_B,
    'au': F_SANS_M, 'af': F_SERIF,
    'entitle': F_LATIN, 'enau': F_LATIN, 'enaf': F_LATIN,
    'abshead': F_SANS_B, 'abs': F_SERIF, 'kw': F_SANS_M, 'corr': F_SERIF,
    'ch': F_SANS_B, 'sec': F_SANS_B, 'sub': F_SANS_B, 'sub4': F_SANS_B,
    'bd': F_SERIF, 'cap': F_SANS_M, 'figcap': F_SANS_M, 'ref': F_SERIF,
    'li': F_SERIF, 'quote': F_SERIF,
}


def caption(t):
    """캡션 한 줄. 굵은 제목 뒤의 한 칸이 한글 변환에서 사라져 붙어 버린다."""
    return inline(t).replace("</strong> ", "</strong>&nbsp;")


def GAP(pt):
    """빈 문단 하나로 간격을 만든다. 한글이 CSS margin 을 거의 무시해서다."""
    return '<p class="gap" style="font-size:%gpt">&nbsp;</p>' % pt


def P(role, text, extra=""):
    """문단 하나. 글꼴은 인라인으로, 나머지 서식은 클래스로 준다."""
    st = "font-family:%s" % ROLE_FONT.get(role, F_SERIF)
    if extra:
        st += ";" + extra
    return '<p class="%s" style="%s">%s</p>' % (role, st, text)


def balance(t):
    """제목을 줄마다 비슷한 길이로 끊는다.

    22pt 로 자동 줄바꿈을 맡기면 마지막 줄에 「토」 한 글자만 남는다(2026-09-09
    확인). 한 줄에 들어가는 폭을 재서 줄 수를 정하고, 그 줄 수로 가장 고르게
    나뉘는 지점을 찾아 <br> 를 넣는다.
    """
    def w(x):                      # 한글 1, 라틴·숫자 0.55 로 셈
        return sum(1.0 if ord(c) > 0x2000 else 0.55 for c in x)
    words = t.split(" ")
    total = w(t)
    per = 20.3                     # 22pt · 본문 폭 165.5mm 에 드는 폭 (실측 20.75)
    n = max(1, -(-int(total * 100) // int(per * 100)))
    if n <= 1 or len(words) < n:
        return t
    target = total / n
    lines_, cur = [], ""
    for k, wd in enumerate(words):
        cand = (cur + " " + wd).strip()
        rest = len(words) - k - 1
        over, under = w(cand) - target, target - w(cur)
        if cur and over > 0 and over > under and len(lines_) < n - 1                 and rest >= n - len(lines_) - 1:
            lines_.append(cur); cur = wd
        else:
            cur = cand
    lines_.append(cur)
    return "<br>".join(lines_)


out, toc = [], []
seen_body = False
sid = 0
i = 0
in_abs = False
in_ref = False


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
            t.append(P("cap", cap.replace("</strong> ", "</strong>&nbsp;")))
        # 표 칸은 style="font-family" 를 무시한다. <font face> 는 이름 그대로 남는다.
        def cell(tag, c):
            return '<%s><font face="%s">%s</font></%s>' % (tag, F_SANS_L, inline(c), tag)
        t.append("<table><thead><tr>")
        t += [cell("th", c) for c in hdr]
        t.append("</tr></thead><tbody>")
        for r in rows:
            t.append("<tr>" + "".join(cell("td", c) for c in r) + "</tr>")
        t.append("</tbody></table></div>")
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
        cols = 2 if len(panels) in (2, 4) else len(panels)
        merged = montage([src for _, src in panels], cols)
        out.append('<div class="fig"><p>%s</p>%s</div>'
                   % (img_tag(merged, panels[0][0]),
                      P("figcap", caption(cap)) if cap else ""))
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
        out.append('<div class="fig"><p>%s</p>%s</div>'
                   % (img_tag(mi.group(2), mi.group(1)),
                      P("figcap", caption(cap)) if cap else ""))
        i += 1
        continue

    # ── 헤딩 ──────────────────────────────────────────────────────
    m = re.match(r"^(#{1,4})\s+(.*)$", s)
    if m:
        lvl, txt = len(m.group(1)), m.group(2).strip()
        sid += 1
        aid = "s%d" % sid
        if lvl == 1 and sid == 1:
            in_abs = False
            out.append(
                '<table class="hdtbl"><tr>'
                '<td class="hdl" style="border:none;font-family:%s">| 연구논문 |</td>'
                '<td class="hdr" style="border:none;font-family:%s">'
                '현장과학교육 &nbsp;( )&nbsp; PP &nbsp;-</td>'
                '</tr></table>' % (F_SANS_M, F_SERIF))
            out.append(GAP(17))
            # h1 으로 두면 한글 내장 개요 문단모양이 크기·정렬을 덮어쓴다.
            out.append(P("doctitle", balance(inline(txt))))
            out.append(GAP(13))
            toc.append('<a class="lv1" href="#%s">%s</a>' % (aid, html.escape(txt)))
        elif txt in ("요약", "국문초록", "Abstract", "ABSTRACT"):
            out.append(GAP(11) if txt in ("요약", "국문초록") else GAP(9))
            out.append(P("abshead", inline(txt)))
            out.append(GAP(4))
            in_abs, in_ref = True, False
            toc.append('<a class="lv2" href="#%s">%s</a>' % (aid, html.escape(txt)))
        else:
            role = {1: "ch", 2: "sec", 3: "sub", 4: "sub4"}[lvl]
            in_abs = False
            in_ref = txt.startswith("참고문헌")
            if lvl == 1: seen_body = True
            out.append(P(role, inline(txt)))
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
        if in_ref:
            # 참고문헌은 글머리표 없이 내어쓰기로 — 게재본과 같다.
            out += [P("ref", x) for x in items]
        else:
            lst = ' style="font-family:%s"' % F_SERIF
            out.append("<ul>" + "".join("<li%s>%s</li>" % (lst, x) for x in items) + "</ul>")
        continue
    if re.match(r"^\d+\.\s+", s):
        items = []
        while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
            items.append(inline(re.sub(r"^\d+\.\s+", "", lines[i].strip())))
            i += 1
        lst = ' style="font-family:%s"' % F_SERIF
        out.append("<ol>" + "".join("<li%s>%s</li>" % (lst, x) for x in items) + "</ol>")
        continue
    if s.startswith(">"):
        q = []
        while i < len(lines) and lines[i].strip().startswith(">"):
            q.append(inline(lines[i].strip().lstrip(">").strip()))
            i += 1
        out.append(P("quote", " ".join(q)))
        continue

    # 표 캡션 후보 — 바로 다음이 표면 위에서 캡션으로 회수한다.
    if re.match(r"^\*\*(표|그림)\s", s) and s.endswith("**"):
        out.append('<p class="tcapsrc">%s</p>' % inline(s[2:-2]))
        i += 1
        continue
    if s.startswith("**주제어:**") or s.startswith("**Keywords:**"):
        out.append(GAP(5))
        out.append(P("kw", inline(s)))
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
            if cls == 'corr':
                out.append(GAP(20))          # 게재본은 교신저자 각주가 쪽 아래에 있다
            out.append(P(cls, inline(body_txt)))
            if cls in ('af', 'enaf'):
                out.append(GAP(13))
            elif cls == 'entitle':
                out.append(GAP(9))
            i += 1
            continue
    out.append(P("abs" if in_abs else ("ref" if in_ref else "bd"), inline(s)))
    i += 1

body = "".join(out).replace('<p class="tcapsrc">',
                            '<p class="cap" style="font-family:%s">' % F_SANS_M)
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
