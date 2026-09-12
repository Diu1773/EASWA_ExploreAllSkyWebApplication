# -*- coding: utf-8 -*-
"""한글이 뽑은 투고본 PDF 를 읽어 조판 규칙을 어긴 자리를 찾는다.

원고 내용은 앞으로도 여러 번 바뀐다. 그때마다 눈으로 스물여덟 쪽을 넘겨 가며
같은 결함을 다시 찾는 일을 없애려고 만들었다. 규칙의 근거는 `docs/조판규칙.md`.

    python -X utf8 docs/check_typeset.py

어긴 자리가 있으면 1 로 끝난다. 각 항목은 「무엇이 · 몇 쪽에 · 어떻게 고치나」를
함께 찍는다.
"""
import io
import json
import os
import re
import sys

import fitz

BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
PDF = os.path.join(BASE, "EASWA_논문_v18_투고본.pdf")
MD = os.path.join(BASE, "EASWA_논문_v18.md")
RULES = os.path.join(BASE, "EASWA_논문_v18_투고본.문단.json")

MM = 72.0 / 25.4                      # 1 mm = 2.835 pt
# 템플릿 실측: 위 여백 22 + 머리말 18 = 본문 40mm 부터. 아래 15 + 꼬리말 17.
HEAD_Y, FOOT_Y = 26.0, 258.0          # 이 밖은 머리말·쪽 번호이므로 본문에서 뺀다
TOP_MIN, TOP_MAX = 38.0, 48.0         # 본문 첫 줄이 시작할 위쪽 범위 (mm)
BOTTOM_MIN = 12.0                     # 본문 아래 여백 최소
WASTE_MM = 45.0                       # 쪽 아래가 이만큼 넘게 비면 알린다
WASTE_BAD = 70.0                      # 이만큼 비면 알림이 아니라 어김이다 (OPERATOR C-212)
STACK_RUN = 3                         # 한 글자짜리 줄이 이만큼 이어지면 세로 쌓임
LEFTOVER = ("[[FIG", "**", "~~", "](", "<br>", "&nbsp;", "|---")


def _mm(x):
    return x / MM


def figures_expected():
    """원고가 부르는 그림 파일 수. 한 줄에 여러 장이면 한 장으로 합쳐진다."""
    md = io.open(MD, encoding="utf-8").read().split("\n")
    n = 0
    for ln in md:
        if re.search(r"!\[[^\]]*\]\([^)]+\)", ln):
            n += 1
    return n


def body_blocks(pg):
    """머리말과 쪽 번호를 뺀 본문 블록만 돌려준다."""
    out = []
    for x in pg.get_text("blocks"):
        if not x[4].strip():
            continue
        if x[3] / MM < HEAD_Y or x[1] / MM > FOOT_Y:
            continue
        out.append(x)
    return out


def stacked_cells(pg):
    """글자가 세로로 한 줄씩 쌓인 자리를 찾는다.

    표 열이 한 글자 폭까지 좁아지면 한글이 글자를 세로로 쌓는다 — 표 10 의
    「응답」 열이 그렇게 됐다(2026-09-09). 같은 x 에서 한 글자짜리 줄이 이어지면
    그 열의 % 가 모자란다는 뜻이다.
    """
    hits = []
    for b in pg.get_text("dict")["blocks"]:
        if b.get("type"):
            continue
        run, x0, first = 0, None, None
        for l in b["lines"]:
            txt = "".join(s["text"] for s in l["spans"]).strip()
            bx = round(l["bbox"][0], 1)
            one = len(txt) == 1 and txt not in "—–-"
            if one and (x0 is None or abs(bx - x0) < 2.0):
                run += 1
                x0 = bx
                first = first or txt
            else:
                if run >= STACK_RUN:
                    hits.append((round(_mm(x0), 1), run, first))
                run, x0, first = (1, bx, txt) if one else (0, None, None)
        if run >= STACK_RUN:
            hits.append((round(_mm(x0), 1), run, first))
    return hits


def split_figure_caption(d):
    """그림은 앞 쪽에 있고 캡션만 다음 쪽 맨 위에 남은 자리."""
    bad = []
    prev_img = False
    for i, pg in enumerate(d, 1):
        blocks = body_blocks(pg)
        first = blocks[0][4].strip() if blocks else ""
        if prev_img and re.match(r"^그림\s*\d+\.", first):
            if not pg.get_images(full=True):
                bad.append((i, first[:36]))
            else:
                r = pg.get_image_rects(pg.get_images(full=True)[0][0])
                if r and r[0].y0 > blocks[0][1]:
                    bad.append((i, first[:36]))
        prev_img = bool(pg.get_images(full=True))
    return bad


def caption_orphans(d):
    """표·그림 캡션만 쪽 끝에 남고 본체가 다음 쪽으로 넘어간 자리.

    **그림 캡션은 그림 아래에 온다.** 캡션이 쪽 마지막 글이어도 그 위에 그림이
    있으면 갈린 것이 아니다 — 그림 8 을 한 줄 캡션으로 줄였더니 이 검사가
    멀쩡한 자리를 잡았다(2026-09-12). 표 캡션은 표 위에 오므로 그대로 본다.
    """
    bad = []
    for i, pg in enumerate(d, 1):
        lines = [x.strip() for x in pg.get_text().splitlines() if x.strip()]
        if not lines:
            continue
        last = lines[-1]
        m = re.match(r"^(표|그림)\s*\d+\.", last)
        if not m:
            continue
        if m.group(1) == "그림":
            hit = pg.search_for(last[:24])
            ims = [r for im in pg.get_images(full=True) for r in pg.get_image_rects(im[0])]
            if hit and ims and min(r.y1 for r in ims) < min(x.y0 for x in hit):
                continue          # 바로 위에 그림이 있다 — 갈리지 않았다
        bad.append((i, last[:40]))
    return bad


def main():
    if not os.path.exists(PDF):
        sys.exit("투고본 PDF 가 없다 — docs/typeset_hwp.py → docs/make_hwp.py → PDF 저장 순으로 돌린다")
    d = fitz.open(PDF)
    bad = []

    # 1. 그림 — 원고가 부르는 만큼 실제로 들어갔나
    got = sum(len(pg.get_images(full=True)) for pg in d)
    want = figures_expected()
    if got < want:
        bad.append("그림 %d개를 불렀는데 %d개만 들어갔다 — make_hwp.py 의 place_figures 가 "
                   "[[FIGn]] 자리를 못 찾았는지 본다" % (want, got))

    # 2. 남으면 안 되는 표시
    for i, pg in enumerate(d, 1):
        t = pg.get_text()
        for mark in LEFTOVER:
            if mark in t:
                bad.append("%d쪽에 「%s」가 남았다 — 조판이 아니라 원고나 변환의 잔재다" % (i, mark))

    # 3. 여백 — 모든 쪽이 같아야 한다
    for i, pg in enumerate(d, 1):
        blocks = body_blocks(pg)
        ims = [pg.get_image_rects(x[0]) for x in pg.get_images(full=True)]
        if not blocks and not ims:
            continue
        top = min([x[1] for x in blocks] + [r[0].y0 for r in ims if r] or [0])
        low = max([x[3] for x in blocks] + [r[0].y1 for r in ims if r] or [0])
        if not (TOP_MIN <= _mm(top) <= TOP_MAX):
            bad.append("%d쪽 위 여백이 %.1fmm (규격 %.0f~%.0f) — @page 가 아니라 요소 여백으로 "
                       "주면 첫 쪽에만 생긴다" % (i, _mm(top), TOP_MIN, TOP_MAX))
        if _mm(pg.rect.height - low) < BOTTOM_MIN:
            bad.append("%d쪽 아래 여백이 %.1fmm 로 규격 미만" % (i, _mm(pg.rect.height - low)))

    # 4. 세로로 쌓인 칸
    for i, pg in enumerate(d, 1):
        for x, run, ch in stacked_cells(pg):
            bad.append("%d쪽 왼쪽 %.0fmm 에서 「%s」부터 %d줄이 한 글자씩 세로로 쌓였다 — "
                       "그 열의 최소 폭이 모자라다(typeset_hwp.py 의 col_floor)" % (i, x, ch, run))

    # 5. 그림과 캡션이 갈린 자리
    for i, cap in split_figure_caption(d):
        bad.append("%d쪽 맨 위에 캡션 「%s」만 있고 그림은 앞 쪽에 있다 — "
                   "그림 문단에 「다음 문단과 함께」가 없다(make_hwp.py 의 place_figures)"
                   % (i, cap))

    # 6. 캡션만 남은 쪽
    for i, cap in caption_orphans(d):
        bad.append("%d쪽 끝에 캡션 「%s」만 남았다 — 본체가 다음 쪽으로 갔다" % (i, cap))

    # 8. 쪽에서 갈린 표 — 머리글 없는 조각이 다음 쪽 맨 위에 남는다.
    #    표 2 의 마지막 행이 13쪽 맨 위에 떨어져 있었는데 아무 검사도 잡지 못했다
    #    (2026-09-11, Main/FAILURES.md F-327).
    if os.path.exists(RULES):
        conf = json.load(io.open(RULES, encoding="utf-8"))
        texts = [pg.get_text() for pg in d]
        ok = set(conf.get("split_ok", []))
        for t in conf.get("tbls", []):
            cap = t.get("표제목") or t.get("cap")
            if cap in ok:
                continue          # 밀어도 한 쪽에 안 들어가는 표
            last = t.get("last")
            if not cap or not last:
                continue
            cp = next((i for i, x in enumerate(texts) if cap[:14] in x), None)
            if cp is None:
                continue
            lp = next((i for i in range(cp, len(texts)) if last in texts[i]), None)
            if lp is not None and lp > cp:
                bad.append("「%s」 가 %d~%d쪽으로 갈렸다 — 머리글 없는 조각이 남는다"
                           % (cap[:18], cp + 1, lp + 1))

    # 7. 쪽 아래 빈 자리 — 70mm 를 넘으면 어김이다.
    #    재 놓고 「비었습니다」로 넘긴 적이 두 번 있다(OPERATOR C-212 승격).
    waste = []
    for i, pg in enumerate(d, 1):
        blocks = body_blocks(pg)
        ims = [pg.get_image_rects(x[0]) for x in pg.get_images(full=True)]
        if not blocks and not ims:
            continue
        low = max([x[3] for x in blocks] + [r[0].y1 for r in ims if r] or [0])
        # 종이 끝이 아니라 본문 영역 끝까지를 잰다 — 아래 여백 15 + 꼬리말 17 은 규격이다
        gap = _mm(pg.rect.height - low) - 32.0
        if gap > WASTE_MM and i not in (d.page_count,):
            waste.append((i, round(gap)))
            # 부록은 새 쪽에서 시작한다 — 그 앞 쪽이 비는 것은 뜻한 바다
            nxt = d[i].get_text().lstrip().splitlines() if i < d.page_count else []
            to_appendix = any(l.strip().startswith("부록.") for l in nxt[:5])
            # 다음 쪽의 그림 덩어리(그림+캡션)가 빈 자리의 한 배 반을 넘으면 줄여서
            # 넣을 수 있는 크기가 아니다 — 그림 6 은 그림만 123mm 에 캡션이 열한
            # 줄이라 어떤 쪽에도 끼워 넣을 수 없다(2026-09-12). 알림으로만 둔다.
            block = 0.0
            if i < d.page_count:
                nx = d[i]
                ims = [r for im in nx.get_images(full=True) for r in nx.get_image_rects(im[0])]
                if ims:
                    top, bot = min(r.y0 for r in ims), max(r.y1 for r in ims)
                    # 캡션은 그림 바로 아래에 잇달아 붙은 줄까지다. 그 뒤 본문까지
                    # 세면 어떤 그림이든 「못 줄인다」가 되어 버린다(2026-09-12).
                    end = bot
                    for b in sorted(body_blocks(nx), key=lambda x: x[1]):
                        if b[1] < bot:
                            continue
                        if b[1] - end > 8 * MM:
                            break
                        end = b[3]
                    block = _mm(end - top)
            stuck = block > gap * 1.5
            if gap > WASTE_BAD and not to_appendix and not stuck:
                bad.append("%d쪽 아래가 %.0fmm 비었다 — 쪽 나누기나 그림 크기를 본다"
                           % (i, gap))

    chars = sum(len(pg.get_text()) for pg in d)
    print("투고본 %d쪽 · 쪽당 %d자 · 그림 %d개" % (d.page_count, chars // d.page_count, got))
    if waste:
        print("아래가 %.0fmm 넘게 빈 쪽 (알림): %s"
              % (WASTE_MM, " · ".join("%d쪽 %dmm" % w for w in waste)))
    d.close()

    if bad:
        print("\n어긴 자리 %d건" % len(bad))
        for b in bad:
            print("  -", b)
        return 1
    print("조판 규칙 어김 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
