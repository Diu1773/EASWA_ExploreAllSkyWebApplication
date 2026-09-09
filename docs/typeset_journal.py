# -*- coding: utf-8 -*-
"""조판본을 학회지 게재본 서식(2단)으로 다시 입힌다.

`typeset_v17.py --inline` 이 만든 자기완결 HTML 을 읽어 CSS 만 갈아 끼운다.
**원고 내용은 한 글자도 건드리지 않는다.**

## 실측 근거 — 게재본 두 편에서 직접 잰 값

`Research/고등학교 천문학 수업에서 코딩을 활용한…(조훈·손정주, 2022)` 과
`Research/데이터 사이언스를 적용한 H-R도…(김미림·손정주, 2022)` 의 PDF 를 열어 쟀다.

| 항목 | 조훈 | 김미림 | 여기서 쓰는 값 |
|---|---|---|---|
| 지면 | 209.9×285.0 mm | 210.0×285.0 mm | 210×285 mm |
| 왼쪽 단 x | 62 pt (21.9 mm) | 62 pt | 좌우 여백 21.5 mm |
| 왼쪽 단 끝 | 285 pt (100.5 mm) | 285 pt | 단 폭 78.5 mm |
| 오른쪽 단 x | 312 pt (110.1 mm) | 312 pt | 단 간격 9.2 mm |
| 위 여백 | 21.4 mm | 22.0 mm | 21.5 mm |
| 아래 여백 | 15.0 mm | 12.4 mm | 14 mm |
| 본문 글꼴 | 명조 9.8 pt | 명조 10.2 pt | 명조 9.9 pt |
| 표 글꼴 | 고딕 8.4 pt | 고딕 8.3 pt | 고딕 8.3 pt |

표는 두 편 모두 **가로선만** 쓴다. 위·아래에 굵은 선, 머리글 아래에 가는 선이고
세로선은 없다. 표 제목은 표 위에 왼쪽 정렬로 붙는다. 김미림은 눈에 띄게 할 수치의
**셀 배경을 회색으로** 칠한다. 그림은 한 단 폭(79 mm)과 양단 폭(126~171 mm)을 모두 쓴다.

## 무엇을 자동으로 정하나

- 표의 열이 3개 이하이고 행이 12줄 이하이면 한 단에 넣는다. 그 밖에는 양단.
- 그림은 모두 양단. 화면 캡처라 한 단 폭에서는 글씨가 읽히지 않는다.
- 긴 표는 단·쪽을 넘어 흐르게 두고 머리글을 반복한다.

  python -X utf8 docs/typeset_journal.py
"""
import base64
import io
import os
import re
import sys

BASE = r"C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos"
SRC = BASE + "/EASWA_논문_v17_조판_자기완결.html"
OUT = BASE + "/EASWA_논문_v17_게재서식.html"

NARROW_MAX_COLS = 3
NARROW_MAX_ROWS = 12
NARROW_MAX_CHARS = 350   # 한 단에 넣어도 세로로 길어지지 않는 크기

CSS = """
<style id="journal">
/* ── 게재본 실측 판형 (조훈·손정주 2022 · 김미림·손정주 2022) ───────────── */
/* 여백은 @page 로 준다. #paper 의 padding 은 요소 전체에 한 번만 걸려서
   둘째 쪽부터 위아래 여백이 사라진다(2026-09-09 사장님이 잡음). */
@page{size:210mm 285mm;margin:21.5mm 21.5mm 14mm}
@media print{
  #toc{display:none !important}
  #page-area{padding-left:0 !important}
  #paper{max-width:none !important;box-shadow:none !important;margin:0 !important;
         padding:0 !important;
         column-count:2;column-gap:9.2mm;column-fill:balance}

  body{font-size:9.9pt !important;line-height:1.52 !important}
  p{margin:0 0 .2em;text-indent:1em;orphans:2;widows:2}

  /* ── 표지: 첫 쪽 전체를 쓰고 1단 ─────────────────────────── */
  .coverpage{break-after:page;text-align:center;padding:0}
  .coverpage .kind{text-align:left;font-size:9pt;font-weight:700;margin:0 0 14mm;
                   text-indent:0;padding:0 3mm;
                   border-left:2.4pt solid #000;border-right:2.4pt solid #000;
                   display:table;clear:both}
  .coverpage .kind{text-align:left;font-size:9pt;font-weight:700;margin:0 0 14mm}
  .coverpage .doctitle{font-size:19pt;line-height:1.35;font-weight:700;
                   margin:0 0 9mm;text-indent:0;border:0;text-align:center}
  .coverpage .au{font-size:11pt;margin:0 0 3mm;text-indent:0}
  .coverpage .af{font-size:9.5pt;margin:0 0 11mm;text-indent:0}
  .coverpage .entitle{font-family:"Times New Roman",serif;font-size:16pt;line-height:1.3;
                  margin:0 0 7mm;text-indent:0}
  .coverpage .enau{font-size:10.5pt;margin:0 0 3mm;text-indent:0}
  .coverpage .enaf{font-family:"Times New Roman",serif;font-style:italic;font-size:10pt;
               margin:0 0 13mm;text-indent:0}
  .coverpage section.abs{background:none !important;border:0 !important;padding:0 !important;
                     margin:0 !important;box-shadow:none !important}
  .coverpage .abshead{font-size:10pt;font-weight:700;margin:0 0 4mm;border:0;text-align:center}
  .coverpage .absbody p{font-size:8.6pt;line-height:1.6;text-align:justify;text-indent:0;
                    margin:0 0 .5em}
  .coverpage .kw{font-size:8.6pt;text-align:justify;text-indent:0;margin:4mm 0 0}
  .coverpage .corr{font-size:8.2pt;text-align:left;text-indent:0;margin:22mm 0 0;
               padding-top:2mm;border-top:.5pt solid #444;width:62mm}

  /* 장·절 제목은 단을 넘기지 않는다 (제목만 남고 잘리는 것을 막는다) */
  /* 장 제목을 양단으로 걸면 남은 세로가 모자랄 때 앞 쪽이 통째로 빈다
     (2026-09-09 사장님이 5쪽에서 잡음). 게재본도 장 제목을 단 안에 둔다. */
  h1,h2,h3{break-inside:avoid;break-after:avoid;column-span:none}
  h1{margin:1.0em 0 .45em;font-size:12.5pt}
  h1:first-child{margin-top:0}
  h2{margin:.85em 0 .3em;font-size:10.5pt}
  h3{margin:.6em 0 .25em}

  /* ── 표: 가로선만 ─────────────────────────────────────── */
  figure.tbl{margin:1.3em 0 1.6em;break-inside:auto}
  figure.tbl.wide{column-span:all}
  figure.tbl.tall{column-span:all;break-before:page}
  .tcap{font-size:8.8pt;font-weight:700;margin-bottom:.42em;text-indent:0;letter-spacing:-.1px}
  table{font-size:8.3pt !important;line-height:1.42;border-collapse:collapse;width:100%;
        border-top:2.2pt double #000;border-bottom:2.2pt double #000}
  thead{display:table-header-group}
  tr{break-inside:avoid}
  th,td{border:0 !important;padding:3.4px 5px;vertical-align:top}
  thead th{border-bottom:.5pt solid #000 !important;
           font-weight:700;white-space:normal;text-align:left;padding-top:4px;padding-bottom:4px}
  tbody tr:first-child td{padding-top:5px}
  tbody tr:last-child td{padding-bottom:5px}
  td.grp{vertical-align:middle;font-weight:600}
  td.num,th.num{text-align:center}
  td.hl{background:#e6e6e6;font-weight:700}

  /* 영문초록도 상자 없이 본문으로 (게재본 관행) */
  section.abs{background:none !important;border:0 !important;padding:0 !important;
              box-shadow:none !important;margin:.8em 0 !important}
  .abshead{font-size:10pt;font-weight:700;border:0;margin:0 0 .3em}

  /* 참고문헌은 글머리표 없이 내어쓰기 */
  ul{list-style:none;margin:0;padding:0}
  li{text-indent:-1em;padding-left:1em;margin:0 0 .12em;font-size:9.2pt;line-height:1.42}

  /* ── 그림: 양단, 쪽 맨 위 ──────────────────────────────── */
  figure.fig{break-inside:avoid;text-align:center;margin:.9em 0 1em}
  figure.fig.wide{column-span:all}
  figure.fig.wide img{max-width:100%;max-height:105mm;width:auto;border:.4pt solid #999}
  figure.fig.tallfig img{max-width:100%;max-height:132mm;width:auto;border:.4pt solid #999}
  figure.fig figcaption,.figcap{font-size:8.6pt;text-align:left;text-indent:0;margin-top:.3em}
}
</style>
</head>"""



def build_cover(s):
    """표제부(제목~요약)를 한 쪽짜리 표지로 감싼다. 문구는 건드리지 않는다."""
    i = s.find('<h1 class="doctitle"')
    j = s.find("</section>", i)
    if i < 0 or j < 0:
        print("  표제부를 못 찾았다 — 표지 없이 간다")
        return s
    j += len("</section>")
    head = s[i:j]

    # 문단마다 역할 클래스를 붙인다 (순서는 조판기가 만든 그대로다)
    ps = re.findall(r"<p>.*?</p>", head, re.S)
    roles = ["au", "af", "entitle", "enau", "enaf"]
    for k, r in enumerate(roles):
        if k < len(ps):
            head = head.replace(ps[k], ps[k].replace("<p>", '<p class="%s">' % r, 1), 1)
    # 요약 본문과 주제어·교신저자
    head = head.replace('<section class="abs">', '<section class="abs absbody">', 1)
    if ps:
        kw = next((x for x in ps if "주제어" in x), None)
        if kw:
            head = head.replace(kw, kw.replace("<p>", '<p class="kw">', 1), 1)
        corr = next((x for x in ps if "교신저자" in x), None)
        if corr:
            head = head.replace(corr, corr.replace("<p>", '<p class="corr">', 1), 1)

    cover = ('<div class="coverpage"><p class="kind">연구논문</p>' + head + "</div>")
    s = s[:i] + s[j:]                       # 본문 흐름에서 표제부를 뺀다
    return s.replace('<div id="paper">', cover + '<div id="paper">', 1)



def merge_group_cells(blk):
    """첫 열이 빈 채로 이어지는 행들을 위 칸에 rowspan 으로 합친다.
    마크다운 표는 그룹 라벨을 첫 행에만 적으므로 그대로 두면 라벨 아래가 허옇게 빈다
    (2026-09-09 사장님이 표 11 에서 잡음). 글자는 한 자도 건드리지 않는다."""
    rows = re.findall(r"<tr>[\s\S]*?</tr>", blk)
    if len(rows) < 3:
        return blk
    body = rows[1:]                     # 첫 줄은 머리글
    out, i = [], 0
    while i < len(body):
        r = body[i]
        cells = re.findall(r"<td[^>]*>[\s\S]*?</td>", r)
        if not cells:
            out.append(r); i += 1; continue
        text = re.sub(r"<[^>]+>", "", cells[0]).strip()
        span = 1
        if text:
            while i + span < len(body):
                nx = re.findall(r"<td[^>]*>[\s\S]*?</td>", body[i + span])
                if nx and not re.sub(r"<[^>]+>", "", nx[0]).strip():
                    span += 1
                else:
                    break
        if span > 1:
            inner = re.sub(r"^<td[^>]*>|</td>$", "", cells[0])
            out.append(r.replace(cells[0],
                       '<td class="grp" rowspan="%d">%s</td>' % (span, inner), 1))
            for k in range(1, span):
                nx = re.findall(r"<td[^>]*>[\s\S]*?</td>", body[i + k])
                out.append(body[i + k].replace(nx[0], "", 1))
            i += span
        else:
            out.append(r); i += 1
    m = re.search(r"<tbody>([\s\S]*?)</tbody>", blk)
    if not m:
        return blk
    return blk[:m.start(1)] + "".join(out) + blk[m.end(1):]


def classify(block):
    """표 한 덩어리를 보고 한 단(narrow)인지 양단(wide)인지 정한다."""
    head = re.search(r"<tr>(.*?)</tr>", block, re.S)
    ncol = len(re.findall(r"<t[hd]", head.group(1))) if head else 99
    nrow = len(re.findall(r"<tr>", block))
    chars = len(re.sub(r"<[^>]+>|\s", "", block))
    return ("narrow" if (ncol <= NARROW_MAX_COLS and nrow <= NARROW_MAX_ROWS + 1
                         and chars <= NARROW_MAX_CHARS) else "wide")


def main():
    if not os.path.exists(SRC):
        print("먼저 typeset_v17.py --inline 을 돌린다 —", SRC)
        return 1
    s = io.open(SRC, encoding="utf-8").read()
    s = build_cover(s)

    stat = {"narrow": 0, "wide": 0}

    def mark(m):
        blk = merge_group_cells(m.group(0))
        cls = classify(blk)
        stat[cls] += 1
        return blk.replace('<figure class="tbl', '<figure class="tbl %s' % cls, 1)

    s, n = re.subn(r'<figure class="tbl[\s\S]*?</figure>', mark, s)

    # 그림: 세로로 긴 것은 한 단에, 가로로 넓은 것은 양단에
    def markfig(m):
        """PNG 머리(IHDR)에서 실제 폭·높이를 읽어 세로 그림을 가려낸다.
        그림이 base64 로 박혀 있어 파일 이름으로는 알 수 없다."""
        blk = m.group(0)
        tall = False
        b64 = re.search(r"data:image/png;base64,([A-Za-z0-9+/=]{80,})", blk)
        if b64:
            try:
                head = base64.b64decode(b64.group(1)[:64] + "==")
                w = int.from_bytes(head[16:20], "big")
                h = int.from_bytes(head[20:24], "big")
                tall = 0 < w < h
            except Exception:
                pass
        cls = "tallfig" if tall else "wide"
        return blk.replace('<figure class="fig', '<figure class="fig %s' % cls, 1)

    s, nf = re.subn(r'<figure class="fig[\s\S]*?</figure>', markfig, s)
    print("  그림 %d개 (세로 한 단 / 가로 양단)" % nf)

    # 숫자만 든 칸은 가운데로
    s = re.sub(r"<td>(\s*[\d.,\-–—%()]+\s*)</td>", r'<td class="num">\1</td>', s)

    s = s.replace("</head>", CSS, 1)
    io.open(OUT, "w", encoding="utf-8").write(s)
    print("게재 서식 조판 —", OUT)
    print("  표 %d개 (한 단 %d · 양단 %d)" % (n, stat["narrow"], stat["wide"]))
    print("  210×285 mm · 2단 78.5mm · 간격 9.2mm · 본문 9.9pt · 표 8.3pt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
