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
import json
import html
import os
import re
import sys

BASE = "C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos"
SRC = BASE + "/EASWA_논문_v23.md"
STYLE_FROM = BASE + "/EASWA_논문_v15_조판.html"
# 두 판을 따로 돌리면 한쪽이 옛 내용으로 남는다(2026-09-09, 소유자가 그 판을 보고
# 이미 지운 문장을 지적했다). --only-plain 을 주지 않으면 두 판을 모두 만든다.
INLINE = "--inline" in sys.argv
# 한글용 판은 그림 자리에 [[FIGn]] 표시만 남긴다(img_tag 주석). 그 판을 그대로
# 크롬에서 PDF 로 뽑으면 그림이 없고 여백이 첫 쪽에만 생긴다(2026-09-09 소유자가
# 잡았다). --preview 는 사람이 눈으로 볼 판이다 — 그림을 실제로 넣고 여백은
# @page 로 준다. 한글에 넣을 판은 옵션 없이 돌린 것이다.
PREVIEW = "--preview" in sys.argv
OUT = BASE + ("/EASWA_논문_v23_투고본_미리보기.html" if PREVIEW
              else "/EASWA_논문_v23_투고본.html")


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
body{margin:0;font-size:9.7pt;line-height:1.62;color:#000}
#page-area{padding:0}
#paper{max-width:210mm;margin:0 auto;padding:21.4mm 22.0mm 19mm 22.5mm;background:#fff}
p{margin:0;word-break:keep-all;line-break:strict}
img{border:0}

/* 표제부 */
.hdtbl{width:100%;border:0}
td.hdl{border:0;padding:0;font-size:11pt;text-align:left}
td.hdr{border:0;padding:0;font-size:9pt;text-align:right;vertical-align:bottom}
.gap{margin:0;line-height:1;text-indent:0}
.한글제목{font-size:22pt;text-align:center;line-height:1.30;margin:0 0 6mm;text-indent:0}
.한글이름{font-size:11pt;text-align:center;margin:0 0 2.4mm;text-indent:0}
.한글소속{font-size:10pt;text-align:center;margin:0 0 8mm;text-indent:0}
.영문제목{font-size:19pt;text-align:center;line-height:1.28;margin:0 0 5mm;text-indent:0}
.영문이름{font-size:11pt;text-align:center;margin:0 0 2.4mm;text-indent:0}
.영문소속{font-size:11pt;font-style:italic;text-align:center;margin:0 0 9mm;text-indent:0}
.요약타이틀{font-size:10pt;text-align:center;margin:0 0 3mm;text-indent:0}
.국문초록{font-size:8.5pt;text-align:justify;line-height:1.52;margin:0;text-indent:0}
.주제어{font-size:8.5pt;text-align:justify;margin:3mm 0 0;text-indent:0}
/* 각주는 한글 각주 기능으로 들어간다(make_hwp.py 의 place_footnote). 스타일
   이름만 템플릿과 맞춰 둔다 — 9pt · 양쪽 정렬 · 내어쓰기 13.1pt. */
.각주{font-size:9pt;text-align:justify;text-indent:-13.1pt;margin:0 0 0 13.1pt}

/* 본문 */
.장제목{font-size:15pt;text-align:center;margin:7mm 0 3.2mm;text-indent:0;page-break-after:avoid}
.소제목{font-size:11pt;text-align:justify;margin:4.6mm 0 1.5mm;text-indent:0;page-break-after:avoid}
.소제목3{font-weight:bold;font-size:10.0pt;text-align:left;margin:3.2mm 0 1mm;text-indent:0;page-break-after:avoid}
.소제목4{font-weight:bold;font-size:9.8pt;text-align:left;margin:2.6mm 0 .8mm;text-indent:0;page-break-after:avoid}
.본문{font-size:10pt;text-align:justify;text-indent:10pt;margin:0;line-height:1.60}
.참고문헌{font-size:10pt;text-align:justify;text-indent:-6mm;margin:0 0 0 6mm;line-height:1.55}
.인용{font-size:9.3pt;text-align:justify;margin:1.6mm 0 1.6mm 6mm;text-indent:0}
li{font-size:10pt;text-align:justify}
ul,ol{margin:1.2mm 0 1.2mm 8mm;padding:0}

/* 표 — 게재본은 가로선만 (굵은 선 1.14pt, 가는 선 0.36pt) */
.tbl{margin:2.4mm 0 3.4mm}
.표제목{font-size:10.0pt;text-align:justify;margin:0 0 1.2mm;text-indent:1.9pt;page-break-after:avoid}
table{border-collapse:collapse;width:100%;line-height:1.40}
th,td{border:0;border-top:.36px solid #333;padding:1.2mm 1.6mm;
      vertical-align:top;font-size:8.5pt}
/* 템플릿의 「표내용」은 8.5pt 가운데 정렬이다. 짧은 값이 든 열은 그대로 두고,
   문장이 든 열만 칸에서 왼쪽으로 돌린다 — 긴 문장을 가운데로 놓으면 읽히지
   않는다(2026-09-12). */
.표내용{text-align:center}
thead th{border-top:1.14px solid #000;border-bottom:.36px solid #333;font-weight:bold}
tbody tr:last-child td{border-bottom:1.14px solid #000}
.tbl.big table{page-break-inside:auto}
.tbl.big thead{display:table-header-group}
.tbl.big tr{page-break-inside:avoid}

/* 그림 — 게재본 실측 폭 105~171mm · 높이 최대 123mm */
.fig{margin:3.2mm 0 3.6mm;text-align:center;page-break-inside:avoid}
.fig p{margin:0;text-indent:0}
.그림제목{font-size:10.0pt;text-align:center;margin:1.6mm 0 0;text-indent:1.9pt}
/* 여러 장짜리 그림 — 표 칸에 넣어 쪽이 갈리지 않게 한다 */
.pnltbl{width:100%;border:0;margin:0 auto}
td.pnl{border:0;padding:0 1mm 1.5mm;text-align:center;vertical-align:top}

/* 머리글 표는 선을 그리지 않는다 — 위의 th,td 규칙 뒤에 와야 지워진다. */
.hdtbl,.hdtbl tr,.hdtbl td{border:0;border-top:0;border-bottom:0;padding:0}
</style>"""

PREVIEW_CSS = """
/* 미리보기 — 종이 여백을 @page 로 준다. 요소 padding 으로 주면 첫 쪽과 마지막
   쪽에만 여백이 생기고 가운데 쪽은 글이 종이 끝에 붙는다(2026-09-09 소유자 지적).
   값은 make_hwp.py 가 한글에 주는 여백과 같다 — 위 15+머리말 6.4, 아래 12+꼬리말 7. */
@page{size:210mm 285mm;margin:21.4mm 22.0mm 19mm 22.5mm}
#page-area{padding:0}
#paper{max-width:165.5mm;margin:0 auto;padding:0}
.newpage{page-break-before:always}
img{max-width:100%;height:auto}
"""

style = STYLE
if PREVIEW:
    style = STYLE.replace("</style>", PREVIEW_CSS + "</style>")

md = io.open(SRC, encoding="utf-8").read().replace("\r\n", "\n")
md = re.sub(r"<!--\s*EASWA_[A-Z_]+\s*-->\n?", "", md)   # 검증기 마커
lines = md.split("\n")


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![*\w])\*([^*\n]+?)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"`([^`]+?)`", r"<code>\1</code>", t)
    t = re.sub(r"\[([^\]]+?)\]\(([^)]+?)\)", r'<a href="\2">\1</a>', t)
    # 마크다운 이스케이프를 푼다 — 원고의 「Rp/R\*」에서 역슬래시가 표에 그대로
    # 찍혔다(2026-09-10, 표 7 에서 소유자가 잡았다). 원고에 54곳 있다.
    t = re.sub(r"\\([*_`\[\]#])", r"\1", t)
    return t


def _titlepage_class(s):
    """표제부 한 줄이 어느 자리인지 판정한다 (게재본 배열 기준)."""
    t = s.strip()
    if t.startswith('*교신저자') or t.startswith('▶'):
        return '각주'
    if re.match(r'^\*\*[A-Z].+\*\*$', t):          # **영문 제목**
        return '영문제목'
    if re.match(r'^\*[A-Z].+\*$', t):                # *영문 소속*
        return '영문소속'
    if re.match(r'^[가-힣]{2,4}( ?[·,] ?[가-힣]{2,4})+\*?$', t):
        return '한글이름'
    if '대학교' in t and len(t) < 60:
        return '한글소속'
    if re.match(r'^[A-Z][a-z]+ [A-Z][a-z]+( ?[·,] ?[A-Z][a-z]+ [A-Z][a-z]+)+\*?$', t):
        return '영문이름'
    return None


# 한글은 HTML 을 가져올 때 CSS 의 max-width/max-height 를 무시하고 이미지 픽셀을
# 96dpi 로 환산해 넣는다(2880px → 762mm). 그렇다고 <img width height> 로 주면 그
# 픽셀 수에 맞춰 원본을 다시 샘플링해 버린다(5770px → 581px · 89dpi). 그래서 크기는
# 태그에 적지 않고 변환 뒤 COM 으로 mm 단위로 준다(docs/make_hwp.py).
# 게재본 실측: 그림 폭 105~171mm · 높이 최대 123mm (김미림·손정주 2022 그림 2).
MAX_W_MM, MAX_H_MM = 166.0, 123.0
# 그림 하나 때문에 앞 쪽이 통째로 비는 자리가 있다. 그림과 캡션은 한 덩어리로
# 움직이므로 앞 쪽에 남은 자리보다 조금만 커도 통째로 다음 쪽으로 간다. 그런
# 그림만 여기에서 따로 줄인다 — 파일 이름 → 높이 상한(mm).
FIG_CAP = {
    # 그림 3 — 103mm 일 때 11쪽 아래가 90mm 비고 표 2 마지막 행이 13쪽 맨 위에
    # 머리글 없이 떨어졌다(2026-09-11). 60mm(폭 96mm)면 그림과 캡션이 11쪽에
    # 들어가고, 그 뒤가 한 쪽씩 당겨져 13쪽의 105mm 도 표 3 으로 메워진다.
    # 네 서비스 화면은 「이런 모양새」를 보이는 참고용이고 캡션이 볼 곳을 말한다.
    "case_stage1_entry.png": 60.0,
}


def img_mm(src, share=1.0):
    """이미지 하나가 차지할 폭·높이를 mm 로 돌려준다. share 는 한 줄에 몇 몫인지."""
    try:
        from PIL import Image
        p = src if os.path.isabs(src) else os.path.join(BASE, src)
        with Image.open(p) as im:
            w0, h0 = im.size
    except Exception:
        return None
    ratio = h0 / float(w0)
    w_mm = MAX_W_MM * share
    cap = min(MAX_H_MM, FIG_CAP.get(os.path.basename(p), MAX_H_MM))
    if w_mm * ratio > cap:
        w_mm = cap / ratio
    return w_mm, w_mm * ratio


def montage(srcs, cols=2, gut=10):
    """여러 장을 한 장으로 합친다.

    한글은 표 행이나 문단 줄 사이에서 쪽을 나누므로, 그림 여러 장을 나란히 두면
    쪽 경계에서 찢어진다(2026-09-09, 그림 3 의 네 장이 14~15쪽으로 갈렸다).
    한 장으로 합치면 통째로 다음 쪽으로 넘어간다.
    """
    from PIL import Image
    ims = [Image.open(src if os.path.isabs(src) else os.path.join(BASE, src)).convert("RGB")
           for src in srcs]
    if len(ims) == 2 and cols == 2:
        # 비율이 다른 두 장을 같은 폭으로 맞추면 낮은 쪽 아래가 빈다(그림 1 의
        # 전천 화면과 주제 카드가 0.51 대 0.80 이었다). 높이를 맞추고 폭을 비율의
        # 역으로 나눈다 — 그림 2 에서 쓴 방법과 같다(2026-09-10).
        r0, r1 = ims[0].height / ims[0].width, ims[1].height / ims[1].width
        total = max(im.width for im in ims) * 2
        w0 = int(round(total * r1 / (r0 + r1)))
        ims = [ims[0].resize((w0, max(1, round(w0 * r0))), Image.LANCZOS),
               ims[1].resize((total - w0, max(1, round((total - w0) * r1))), Image.LANCZOS)]
    else:
        cw = min(im.width for im in ims)
        ims = [im if im.width == cw
               else im.resize((cw, max(1, round(im.height * cw / im.width))), Image.LANCZOS)
               for im in ims]
    rows = [ims[k:k + cols] for k in range(0, len(ims), cols)]
    rh = [max(im.height for im in r) for r in rows]
    W = max(sum(im.width for im in r) + gut * (len(r) - 1) for r in rows)
    H = sum(rh) + gut * (len(rows) - 1)
    out_im = Image.new("RGB", (W, H), (255, 255, 255))
    y = 0
    for r, h in zip(rows, rh):
        x = 0
        for im in r:
            out_im.paste(im, (x, y))
            x += im.width + gut
        y += h + gut
    name = "_panel_%s.png" % ("-".join(os.path.splitext(os.path.basename(x))[0] for x in srcs))[:80]
    path = os.path.join(BASE, "원고_그림", name)
    out_im.save(path)
    for im in ims:
        im.close()
    return "원고_그림/" + name


def split_tall(src, ratio=1.15, gut=40):
    """세로로 긴 화면 한 장을 조용한 가로 띠에서 잘라 좌우로 편다.

    2880×4560 짜리 홈 화면 한 장이 쪽의 절반을 먹었다(2026-09-09 소유자 지적:
    「사진을 두개로 나누던 세로를 반갈을하던」). 가운데 40% 구간에서 가로줄의 픽셀
    분산이 가장 낮은 띠 — 곧 배경만 있는 자리 — 를 찾아 자르므로 내용이 갈리지
    않는다. home_modules.png 는 1822행에서 갈려 진입 화면과 모듈 목록으로 나뉜다.
    """
    from PIL import Image
    import numpy as np
    p = src if os.path.isabs(src) else os.path.join(BASE, src)
    with Image.open(p) as im0:
        w, h = im0.size
        if h < w * ratio:
            return src
        a = np.asarray(im0.convert("L"), dtype=float)
        lo, hi = int(h * 0.30), int(h * 0.70)
        sd = a[lo:hi].std(axis=1)
        quiet = sd < np.percentile(sd, 3)
        runs, cur = [], None
        for k, v in enumerate(quiet):
            if v and cur is None:
                cur = k
            elif not v and cur is not None:
                runs.append((cur, k)); cur = None
        if cur is not None:
            runs.append((cur, len(quiet)))
        if not runs:
            return src
        r0 = max(runs, key=lambda r: r[1] - r[0])
        cut = lo + (r0[0] + r0[1]) // 2
        im = im0.convert("RGB")
        left, right = im.crop((0, 0, w, cut)), im.crop((0, cut, w, h))
    # 두 쪽의 높이가 다르면 한쪽 아래가 빈다. 폭을 높이 비율의 역으로 나눠 주면
    # 둘이 나란해진다(2026-09-10 소유자 지적: 「세로 크기를 맞추던가」).
    from PIL import Image as _I
    r = right.height / float(left.height)
    total = w * 2
    wl = int(round(total * r / (1.0 + r)))
    wr = total - wl
    left = left.resize((wl, max(1, round(left.height * wl / left.width))), _I.LANCZOS)
    right = right.resize((wr, max(1, round(right.height * wr / right.width))), _I.LANCZOS)
    H = max(left.height, right.height)
    out_im = Image.new("RGB", (wl + gut + wr, H), (255, 255, 255))
    out_im.paste(left, (0, 0))
    out_im.paste(right, (wl + gut, 0))
    name = "_split_%s.png" % os.path.splitext(os.path.basename(p))[0]
    path = os.path.join(BASE, "원고_그림", name)
    out_im.save(path)
    left.close(); right.close()
    print("  세로 %.2f배 그림을 %d행에서 갈라 좌우로 폈다 — %s" % (h / w, cut, name))
    return "원고_그림/" + name


def img_tag(src, alt, share=1.0):
    """그림 자리에 표시만 남긴다.

    한글의 HTML 가져오기는 그림을 무조건 96dpi 로 다시 샘플링한다 — <img> 에 크기를
    적든 안 적든 마찬가지다(2026-09-09 확인: 5770px 원본이 582px 로 줄었다). 그래서
    HTML 에는 [[FIG1]] 같은 표시만 넣고, 변환 뒤 COM 의 InsertPicture 로 원본을 넣은
    다음 mm 크기를 준다(docs/make_hwp.py 의 place_figures).
    """
    box = img_mm(src, share) or (0, 0)
    if PREVIEW:
        rel = src if not os.path.isabs(src) else os.path.relpath(src, BASE).replace(os.sep, "/")
        size = (' style="width:%.2fmm;height:%.2fmm"' % box) if box[0] else ""
        return '<img src="%s" alt="%s"%s>' % (html.escape(rel, quote=True),
                                              html.escape(alt, quote=True), size)
    figs.append({
        "path": os.path.abspath(src if os.path.isabs(src) else os.path.join(BASE, src)),
        "w": round(box[0], 2), "h": round(box[1], 2),
    })
    return "[[FIG%d]]" % len(figs)



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
F_TITLE   = '나눔스퀘어_ac'          # 템플릿 장제목 글꼴

ROLE_FONT = {
    'hdl': F_SANS_M, 'hdr': F_SERIF, '한글제목': F_SERIF_B,
    '한글이름': F_SANS_M, '한글소속': F_SERIF,
    '영문제목': F_LATIN, '영문이름': F_LATIN, '영문소속': F_LATIN,
    '요약타이틀': F_SANS_B, '국문초록': F_SERIF, '주제어': F_SANS_M, '각주': F_SERIF,
    '장제목': F_TITLE, '소제목': F_SANS_M, '소제목3': F_SANS_M, '소제목4': F_SANS_M,
    '본문': F_SERIF, '표제목': F_SANS_M, '그림제목': F_SANS_M, '참고문헌': F_SERIF,
    'li': F_SERIF, '인용': F_SERIF,
}


def _w(x):
    """칸 하나가 차지할 폭을 전각 글자 수로 센다."""
    return sum(1.0 if ord(c) > 0x2000 else 0.55 for c in x)


def _tokens(x):
    """줄이 갈릴 수 있는 자리로 끊는다 — 공백·가운뎃점·슬래시."""
    return [t for t in re.split(r"[\s·/]+", x) if t] or [x]


def col_floor(hdr, rows, hi):
    """어떤 칸도 세로로 쌓이지 않을 최소 열 너비를 % 로 돌려준다.

    **머리글 전체를 한 줄에 넣으려 들면 안 된다.** 머리글이 다 긴 표에서는 최소 폭
    합이 100%를 넘고, 부족분을 넉넉한 열에서 빼는 과정에서 짧은 머리글 열 하나가
    부담을 다 진다 — 표 10 의 「응답」 열이 5%(8.8mm)로 쪼그라들어 글자가 세로로
    한 줄씩 쌓였다(2026-09-09, 소유자가 잡았다).

    그래서 보장하는 것은 **가장 긴 낱말 하나가 들어갈 폭**이다. 머리글이 여러 줄로
    접히는 것은 정상이고, 낱말이 중간에서 갈리는 것만 막는다.
    표 폭 165.5mm · 표 글꼴 8.4pt · 칸 좌우 여백 1.6mm씩 + 여유 1mm.
    """
    ch = 8.4 * 25.4 / 72.0
    out = []
    for j, hd in enumerate(hdr):
        cells = [r[j] for r in rows if j < len(r)] + [hd]
        longest = max([_w(t) for c in cells for t in _tokens(c)] or [2.0])
        # 무리 이름만 드문드문 든 열은 그 이름 전체가 한 줄에 들어가게 한다 — 표 11 의
        # 「보완 요소」가 「보완 / 요소」로 접혔다. 칸이 대부분 비어 넓혀도 비용이 작다.
        body = [r[j] for r in rows if j < len(r)]
        filled = [c for c in body if c.strip()]
        # 무리 이름이 하나뿐인 열은 넓혀도 얻는 게 없다 — 표 11 에서 「구분」을 넓혔더니
        # 「응답 항목」이 좁아져 세 행이 두 줄이 되고 표가 쪽을 넘었다(2026-09-10).
        if body and len(set(filled)) >= 2 and len(filled) * 2 <= len(body):
            longest = max(longest, max(_w(c) for c in filled))
        out.append(min(hi, (longest * ch + 4.2) / MAX_W_MM * 100.0))
    if sum(out) > 100:
        k = 100.0 / sum(out)
        out = [x * k for x in out]
    return out


def colwidths(hdr, rows, lo=7, hi=45):
    """칸마다 들어갈 글자 수로 열 너비 비율을 정하되, 머리글은 접지 않는다."""
    n = len(hdr)
    w = _w
    raw = []
    for j in range(n):
        cells = [r[j] for r in rows if j < len(r)] + [hdr[j]]
        # 가장 긴 칸과 평균을 반씩 본다 — 한 칸만 긴 열이 판을 뒤집지 않게.
        mx = max(w(c) for c in cells)
        av = sum(w(c) for c in cells) / len(cells)
        raw.append(0.5 * mx + 0.5 * av)
    tot = sum(raw) or 1.0
    pct = [max(lo, min(hi, 100.0 * x / tot)) for x in raw]
    # 숫자만 든 열은 넓혀 봐야 빈칸이다 — 그만큼 글이 든 열이 좁아진다.
    for j in range(n):
        body = [r[j] for r in rows if j < len(r)]
        if body and all(re.fullmatch(r"[\d\s./%()—–+-]*", c or "") for c in body):
            pct[j] = min(pct[j], 13.0)
    floor = col_floor(hdr, rows, hi)
    # 모자란 열을 최소 폭까지 올리고 그만큼을 넉넉한 열에서 비례로 뺀다.
    for _ in range(6):
        k = 100.0 / sum(pct)
        pct = [x * k for x in pct]
        short = [j for j in range(n) if pct[j] < floor[j] - 1e-9]
        if not short:
            break
        need = sum(floor[j] - pct[j] for j in short)
        pool = sum(pct[j] for j in range(n) if j not in short)
        if pool <= need:
            break
        for j in range(n):
            pct[j] = floor[j] if j in short else pct[j] * (pool - need) / pool
    out = [int(round(x)) for x in pct]
    out[-1] += 100 - sum(out)
    return out


def note_caption(cap, heads):
    """그림 캡션을 문단 지시서에 올린다 — 「문단 보호」를 주기 위해서다.

    캡션이 두 줄 이상일 때 한글은 첫 줄만 그림 쪽에 남기고 나머지를 다음 쪽으로
    넘긴다(2026-09-11, 18쪽 끝에 그림 8 캡션 첫 줄만 남았다). 그림 문단의
    「다음 문단과 함께」는 다음 문단의 **첫 줄**까지만 붙잡으므로, 캡션 쪽에
    「문단 보호」를 걸어야 캡션 전체가 그림을 따라간다.

    찾을 문자열은 굵은 제목 부분만 쓴다 — 그 뒤는 `&nbsp;` 가 섞여 본문과
    글자가 다르다.
    """
    m = re.match(r"^\*\*(.+?)\*\*", cap.strip())
    t = (m.group(1) if m else re.sub(r"[*]", "", cap)).strip()
    if not t:
        return
    # 문단 보호는 **짧은 캡션에만** 준다. 열 줄짜리 캡션까지 통째로 묶으면 그림과
    # 캡션이 한 덩어리로 190mm 를 넘어 앞 쪽이 통째로 빈다(2026-09-11, 16쪽 99mm).
    # 긴 캡션은 갈려도 읽는 데 걸리지 않지만, 두 줄짜리가 한 줄만 남는 것은 눈에 띈다.
    body = re.sub(r"[*]", "", cap).strip()
    lines = _w(body) / 50.0                       # 한 줄에 전각 50자 안팎
    heads.append({"t": t, "role": "그림제목", "prev": 0,
                  "keep": False, "keeplines": lines <= 4.0})


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


out, toc, heads, figs, tbls = [], [], [], [], []
footnote = []          # 한글제목에 달 각주 — 교신저자·심사판정 두 줄
paper_title = []       # 각주를 달 문단을 찾을 때 쓰는 한글제목 원문
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
        # 「큰 표」는 갈려도 어쩔 수 없는 표다. 한글은 갈린 표의 다음 쪽에 머리행을
        # 되풀이해 주지 않으므로(2026-09-10, 표 12 의 뒷부분이 머리글 없이 21쪽에
        # 남았다) 갈리는 표는 최소로 둔다. 20행짜리 표 12 는 한 쪽에 들어간다.
        big = len(rows) > 20
        # 마지막 행에서 빈칸이 아닌 첫 칸 — 표가 쪽에서 갈렸는지 재는 표시가 된다
        last = next((c for c in (rows[-1] if rows else []) if c.strip()), "")
        tbls.append({"rows": len(rows), "cols": len(hdr), "big": big,
                     "표제목": html.unescape(re.sub("<[^>]+>", "", cap)) if cap else "",
                     "last": html.unescape(re.sub("<[^>]+>", "", last))})
        # 표 캡션 앞 간격. 한글이 CSS margin 을 무시해서 앞 문단과 붙어 버린다
        # (2026-09-10, 표 6 이 「…하였다.표 6. 세 탐구모듈의」로 이어졌다).
        # 문단 지시서의 prev 는 캡션을 텍스트로 찾아 적용하므로 못 찾으면 그대로
        # 붙는다. 빈 문단을 앞에 하나 두면 어느 경우에도 떨어진다.
        t = [GAP(6), '<div class="tbl%s">' % (" big" if big else "")]
        if cap:
            t.append(P("표제목", cap.replace("</strong> ", "</strong>&nbsp;")))
            heads.append({"t": html.unescape(re.sub("<[^>]+>", "", cap)), "role": "표제목",
                          "prev": 9, "keep": True})
        # 표 칸은 style="font-family" 를 무시한다. <font face> 는 이름 그대로 남는다.
        # 열마다 정렬을 정한다 — 한 칸이라도 열두 자가 넘으면 그 열은 왼쪽이다
        left = [any(_w(r[j]) > 12 for r in rows if j < len(r))
                for j in range(len(hdr))]

        def cell(tag, c, attr="", j=0):
            # 클래스는 하나만 준다 — 두 개를 주면 한글이 「.표내용 왼쪽」이라는
            # 낯선 이름의 스타일을 만든다. 왼쪽 정렬은 칸에 직접 적는다.
            if 'class=' not in attr:
                attr += ' class="표내용"'
            if left[j]:
                if 'style="' in attr:
                    attr = attr.replace('style="', 'style="text-align:left;')
                else:
                    attr += ' style="text-align:left"'
            return '<%s%s><font face="%s">%s</font></%s>' % (tag, attr, F_SANS_L, inline(c), tag)
        # 칸 너비는 한글이 내용과 무관하게 똑같이 나눈다. 글자 수에 맞춰 나눠 준다
        # (2026-09-09: 「수행 내용」이 좁아 여섯 줄로 접히고 「방법 절」이 넓었다).
        wid = colwidths(hdr, rows)
        t.append("<table><thead><tr>")
        t += [cell("th", c, ' width="%d%%"' % wid[j], j) for j, c in enumerate(hdr)]
        t.append("</tr></thead><tbody>")
        # 첫 칸이 빈 행은 위 행과 같은 무리다. 그 사이에는 선을 긋지 않는다 —
        # 20행짜리 표 12 가 행마다 선이 그어져 읽히지 않았다(2026-09-09 소유자 지적).
        for r in rows:
            same = bool(r) and not r[0].strip()
            at = ' style="border-top:none"' if same else ""
            t.append("<tr>" + "".join(cell("td", c, at, j)
                                       for j, c in enumerate(r)) + "</tr>")
        t.append("</tbody></table></div>")
        t.append(GAP(5))
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
        out.append(GAP(9))
        if cap:
            note_caption(cap, heads)
        out.append('<div class="fig"><p>%s</p>%s</div>'
                   % (img_tag(merged, panels[0][0]),
                      P("그림제목", caption(cap)) if cap else ""))
        out.append(GAP(7))
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
        wide = split_tall(mi.group(2))
        # 편 그림도 폭을 다 쓴다. 좁히면 그 쪽이 더 비어서(그림+캡션이 한 덩어리로
        # 움직이므로) 낭비가 오히려 늘었다 — 0.80 으로 줄였더니 빈 자리가 84mm 에서
        # 100mm 로 커졌다(2026-09-10 실측).
        out.append(GAP(9))
        if cap:
            note_caption(cap, heads)
        out.append('<div class="fig"><p>%s</p>%s</div>'
                   % (img_tag(wide, mi.group(1)),
                      P("그림제목", caption(cap)) if cap else ""))
        out.append(GAP(7))
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
            # 「| 연구논문|」과 학회지명은 본문이 아니라 머리말에 있어야 한다
            # (템플릿 실측: 1쪽 머리말 y22.0). make_hwp.py 의 set_header 가 넣는다.
            # 제목 앞에 빈 문단을 두지 않는다 — 템플릿은 본문 맨 위(40.0mm)에서
            # 바로 제목이 시작한다. GAP(6) 을 두었더니 3mm 내려갔다(2026-09-12).
            # h1 으로 두면 한글 내장 개요 문단모양이 크기·정렬을 덮어쓴다.
            # 각주를 달 자리이므로 제목 글자를 지시서에 남긴다(make_hwp 의
            # place_footnote 가 이 문단을 찾는다). balance 가 줄을 나누므로
            # 찾을 때는 앞 열두 글자만 쓴다.
            paper_title[:] = [txt]
            out.append(P("한글제목", balance(inline(txt))))
            out.append(GAP(9))
            toc.append('<a class="lv1" href="#%s">%s</a>' % (aid, html.escape(txt)))
        elif txt in ("요약", "국문초록", "Abstract", "ABSTRACT"):
            out.append(GAP(11) if txt in ("요약", "국문초록") else GAP(9))
            # 템플릿은 「요 약」처럼 두 글자를 벌려 쓴다
            cap = "요 약" if txt in ("요약", "국문초록") else txt
            heads.append({"t": cap, "role": "요약타이틀", "prev": 0,
                          "keep": False, "align": "center"})
            out.append(P("요약타이틀", inline(cap)))
            out.append(GAP(4))
            in_abs, in_ref = True, False
            toc.append('<a class="lv2" href="#%s">%s</a>' % (aid, html.escape(txt)))
        else:
            role = {1: "장제목", 2: "소제목", 3: "소제목3", 4: "소제목4"}[lvl]
            in_abs = False
            in_ref = txt.startswith("참고문헌")
            if lvl == 1: seen_body = True
            # 장 바로 밑의 첫 절에는 간격을 주지 않는다 — 게재본이 그렇다.
            prev = {"장제목": 18, "소제목": 13, "소제목3": 9, "소제목4": 7}[role]
            if heads and heads[-1]["role"] == "장제목" and role == "소제목":
                prev = 0
            heads.append({"t": txt, "role": role, "prev": prev, "keep": True,
                          "align": "center" if role == "장제목" else None})
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
            out += [P("참고문헌", x) for x in items]
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
        out.append(P("인용", " ".join(q)))
        continue

    # 표 캡션 후보 — 바로 다음이 표면 위에서 캡션으로 회수한다.
    if re.match(r"^\*\*(부록 )?(표|그림)\s", s) and s.endswith("**"):
        out.append('<p class="tcapsrc">%s</p>' % inline(s[2:-2]))
        i += 1
        continue
    if s.startswith("**주제어:**") or s.startswith("**Keywords:**"):
        out.append(GAP(5))
        out.append(P("주제어", inline(s)))
        i += 1
        continue

    if not seen_body:
        cls = _titlepage_class(s)
        if cls:
            body_txt = s.strip()
            if cls == '영문제목':
                body_txt = body_txt[2:-2]           # **영문 제목**
            elif cls == '영문소속':
                body_txt = body_txt[1:-1]           # *영문 소속*
            # au·enau 끝의 *(교신저자)와 corr 앞의 *는 그대로 둔다
            if cls == '각주':
                # 템플릿은 이 두 줄을 **한글제목에 단 각주**로 넣어 쪽 맨 아래에
                # 붙인다(논문템플릿.hwp 실측: 245.0~252.7mm, 본문 아래 끝).
                # 본문 문단으로 두면 주제어 바로 밑에 붙어 45mm 위로 뜬다
                # (2026-09-12 소유자 지적). 여기서는 흘려보내고 문단 지시서에만
                # 적어 두면 make_hwp.py 가 한글 각주 기능으로 넣는다.
                footnote.append(body_txt)
                i += 1
                continue
            # 한글의 HTML 가져오기가 **한 줄짜리** 표제부 문단에 CENTER 대신
            # JUSTIFY 를 준다 — 이름·요약타이틀이 왼쪽에 붙었다(2026-09-12 소유자
            # 지적). 스타일은 CENTER 인데 문단 모양이 다르다. 변환 뒤에 직접 준다.
            if cls in ("한글이름", "한글소속", "영문이름", "영문소속", "영문제목"):
                key = re.sub(r"[*\[\]]", "", body_txt).strip()[:14]
                if key:
                    heads.append({"t": key, "role": cls, "prev": 0,
                                  "keep": False, "align": "center"})
            out.append(P(cls, inline(body_txt)))
            if cls in ('af', 'enaf'):
                out.append(GAP(9))
            elif cls == '영문제목':
                out.append(GAP(9))
            i += 1
            continue
    out.append(P("국문초록" if in_abs else ("참고문헌" if in_ref else "본문"), inline(s)))
    i += 1

body = "".join(out).replace('<p class="tcapsrc">',
                            '<p class="표제목" style="font-family:%s">' % F_SANS_M)
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

# 문단 간격과 「다음 문단과 함께」 지시서. 한글이 CSS margin 과
# page-break-after:avoid 를 무시하므로 docs/make_hwp.py 가 변환 뒤에 읽어 적용한다.
io.open(OUT[:-5] + ".문단.json", "w", encoding="utf-8").write(
    json.dumps({"paras": heads, "figs": figs, "tbls": tbls,
                "footnote": footnote, "title": (paper_title or [""])[0],
                "body_w": MAX_W_MM},
               ensure_ascii=False, indent=1))

n_fig = body.count('<div class="fig"')
n_tbl = body.count('<div class="tbl')
print("조판 완료 — %s" % OUT)
if footnote:
    print("  한글제목에 달 각주 %d줄 — %s" % (len(footnote), footnote[0][:28]))
print("  표 %d개 · 그림 %d개 · 목차 %d항목 · %,d바이트"
      .replace("%,d", "%d") % (n_tbl, n_fig, len(toc), len(doc)))
