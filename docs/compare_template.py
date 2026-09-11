# -*- coding: utf-8 -*-
"""투고본을 학회 템플릿과 **대조**한다 (2026-09-12).

    python -X utf8 docs/compare_template.py

지금까지의 `check_typeset.py` 는 우리 PDF 만 재고 템플릿을 보지 않았다. 그래서
교신저자·심사판정 두 줄이 템플릿에서는 쪽 맨 아래 각주인데 우리는 주제어 밑
본문 문단인 것을 아무도 잡지 못했다(2026-09-12 소유자 지적).

세 가지를 견준다.

    1. 스타일 — 이름이 같은 스타일의 글자 크기·굵기·정렬·줄 간격·들여쓰기
    2. 쪽 틀 — 용지, 네 여백, 머리말·꼬리말 높이
    3. 1쪽 자리 — 머리말·제목 시작·각주·쪽 번호가 몇 mm 에 있나

초록 길이가 다르므로 가운데 요소의 절대 위치는 다를 수밖에 없다. 그래서 자리
대조는 **위에 붙는 것(머리말·제목)과 아래에 붙는 것(각주·쪽 번호)**만 본다.
"""
import io
import json
import os
import re
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hwpx_headers as H                                   # noqa: E402

BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
TPL = r"C:\Users\bmffr\Downloads\논문템플릿.hwp"
MAIN = os.path.join(BASE, "EASWA_논문_v18_투고본.hwp")
ALT = os.path.join(BASE, "EASWA_논문_v18_투고본_새판*.hwp")
PDF = os.path.join(BASE, "EASWA_논문_v18_투고본.pdf")
TPL_PDF = os.path.join(BASE, "_템플릿.pdf")
MM = 72.0 / 25.4

# 템플릿에 있고 우리도 쓰는 스타일. 「바탕글」처럼 한글이 만드는 것은 뺀다.
STYLES = ("한글제목", "한글이름", "한글소속", "영문제목", "영문이름", "영문소속",
          "요약타이틀", "국문초록", "장제목", "소제목", "본문", "참고문헌",
          "표제목", "그림제목", "각주", "표내용")
# 줄 간격은 한글이 %와 pt 두 단위를 섞어 쓴다(1600=160% · 130=13pt). 단위가 달라
# 숫자만으로는 견줄 수 없으므로 크기·굵기·정렬·들여쓰기만 어김으로 센다.
PT = 0.6          # 글자 크기 차이 허용 (pt)
POS = 3.0         # 1쪽 자리 차이 허용 (mm)


def newest():
    import glob
    c = [p for p in [MAIN] + sorted(glob.glob(ALT)) if os.path.exists(p)]
    if not c:
        sys.exit("투고본 한글 파일이 없다 — 먼저 docs/조판.py 를 돌린다")
    return max(c, key=os.path.getmtime)


def styles(hwpx):
    """스타일 이름 → (크기pt, 굵게, 정렬, 줄간격, 들여쓰기)"""
    z = zipfile.ZipFile(hwpx)
    hdr = z.read("Contents/header.xml").decode("utf-8")
    z.close()
    faces = {}
    for m in re.finditer(r'<hh:fontface\b[^>]*lang="(\w+)"[^>]*>(.*?)</hh:fontface>', hdr, re.S):
        for f in re.finditer(r'<hh:font\b([^>]*)/?>', m.group(2)):
            a = f.group(1)
            i, n = re.search(r'id="(\d+)"', a), re.search(r'face="([^"]*)"', a)
            if i and n:
                faces.setdefault(m.group(1), {})[i.group(1)] = n.group(1)
    ch, pp, fc = {}, {}, {}
    for c in hdr.split("<hh:charPr ")[1:]:
        i = re.search(r'^id="(\d+)"', c)
        if not i:
            continue
        g = re.search(r'height="(\d+)"', c[:300])
        ch[i.group(1)] = (int(g.group(1)) / 100.0 if g else None, "<hh:bold" in c[:900])
        fr = re.search(r'<hh:fontRef\b([^>]*)/>', c)
        hg = re.search(r'hangul="(\d+)"', fr.group(1)) if fr else None
        lt = re.search(r'latin="(\d+)"', fr.group(1)) if fr else None
        fc[i.group(1)] = (faces.get("HANGUL", {}).get(hg.group(1) if hg else "", "?"),
                          faces.get("LATIN", {}).get(lt.group(1) if lt else "", "?"))
    for c in hdr.split("<hh:paraPr ")[1:]:
        i = re.search(r'^id="(\d+)"', c)
        if not i:
            continue
        a = re.search(r'<hh:align [^>]*horizontal="(\w+)"', c[:900])
        l = re.search(r'<hh:lineSpacing [^>]*value="(-?\d+)"', c[:900])
        t = re.search(r'<hc:intent [^>]*value="(-?\d+)"', c[:900])
        pp[i.group(1)] = (a.group(1) if a else "-",
                          int(l.group(1)) if l else None,
                          int(t.group(1)) if t else 0)
    out = {}
    for m in re.finditer(r'<hh:style\b([^>]*)/>', hdr):
        a = m.group(1)
        nm = re.search(r'name="([^"]+)"', a)
        pi = re.search(r'paraPrIDRef="(\d+)"', a)
        ci = re.search(r'charPrIDRef="(\d+)"', a)
        if not (nm and pi and ci):
            continue
        h, b = ch.get(ci.group(1), (None, False))
        al, ls, ind = pp.get(pi.group(1), ("-", None, 0))
        out[nm.group(1)] = (h, b, al, ls, ind, fc.get(ci.group(1), ("?", "?")))
    return out


def pagedef(hwpx):
    """용지와 여백 — mm"""
    z = zipfile.ZipFile(hwpx)
    xml = z.read("Contents/section0.xml").decode("utf-8")
    z.close()
    m = re.search(r"<hp:pagePr\b([^>]*)>(.*?)</hp:pagePr>", xml, re.S)
    if not m:
        return {}
    a, body = m.group(1), m.group(2)
    g = dict(re.findall(r'(\w+)="(-?\d+)"', a))
    mg = re.search(r"<hp:margin\b([^>]*)/>", body)
    g.update(dict(re.findall(r'(\w+)="(-?\d+)"', mg.group(1))) if mg else {})
    return {k: int(v) / 100.0 / 2.8346 for k, v in g.items() if v.lstrip("-").isdigit()}


def page1(pdf):
    """1쪽에서 위·아래에 붙는 것들의 자리 — mm"""
    import fitz
    d = fitz.open(pdf)
    p = d[0]
    bs = sorted([b for b in p.get_text("blocks") if b[4].strip()], key=lambda b: b[1])
    d.close()
    r = {}
    for b in bs:
        t = b[4].strip().replace("\n", " ")
        y0, y1 = b[1] / MM, b[3] / MM
        if "현장과학교육" in t and y0 < 35 and "머리말" not in r:
            r["머리말"] = y0
        elif "교신저자 이메일" in t:
            r["각주 시작"] = y0
            r["각주 끝"] = max(y1, r.get("각주 끝", 0))
        elif "▶ 접수" in t:
            r["각주 끝"] = max(y1, r.get("각주 끝", 0))
        elif t == "1" and y0 > 240:
            r["쪽 번호"] = y0
        elif "제목 시작" not in r and y0 > 35 and "현장과학교육" not in t:
            r["제목 시작"] = y0
    return r


def main():
    hwp = newest()
    print("투고본  %s" % os.path.basename(hwp))
    print("템플릿  %s\n" % os.path.basename(TPL))
    t_hwpx = os.path.join(BASE, "_대조_템플릿.hwpx")
    o_hwpx = os.path.join(BASE, "_대조_투고본.hwpx")
    H.to_hwpx(TPL, t_hwpx)
    H.to_hwpx(hwp, o_hwpx)
    if not os.path.exists(TPL_PDF):
        print("  ! 템플릿 PDF 가 없다 — 1쪽 자리는 건너뛴다")

    bad = []

    # 1. 스타일
    ts, os_ = styles(t_hwpx), styles(o_hwpx)
    print("%-8s %-22s %-22s" % ("스타일", "템플릿", "투고본"))
    for n in STYLES:
        a, b = ts.get(n), os_.get(n)
        if not a:
            continue
        if not b:
            bad.append("스타일 「%s」 가 투고본에 없다" % n)
            print("  %-8s %-42s 없음" % (n, "%.1fpt %s %s %s" % (a[0] or 0, "굵게" if a[1] else "보통", a[2], a[5][0][:22])))
            continue
        fa = "%.1fpt %s %-8s %-22s" % (a[0] or 0, "굵게" if a[1] else "보통", a[2], a[5][0][:22])
        fb = "%.1fpt %s %-8s %-22s" % (b[0] or 0, "굵게" if b[1] else "보통", b[2], b[5][0][:22])
        diff = []
        if a[0] and b[0] and abs(a[0] - b[0]) > PT:
            diff.append("크기 %.1f→%.1fpt" % (a[0], b[0]))
        if a[1] != b[1]:
            diff.append("굵기 %s→%s" % ("굵게" if a[1] else "보통", "굵게" if b[1] else "보통"))
        if a[2] != b[2]:
            diff.append("정렬 %s→%s" % (a[2], b[2]))
        if a[5][0] != b[5][0]:
            diff.append("한글 글꼴 %s→%s" % (a[5][0], b[5][0]))
        if a[5][1] != b[5][1]:
            diff.append("영문 글꼴 %s→%s" % (a[5][1], b[5][1]))
        print("  %-8s %-42s %-42s %s" % (n, fa, fb, "← " + " · ".join(diff) if diff else ""))
        for d in diff:
            bad.append("스타일 「%s」 %s" % (n, d))

    # 2. 쪽 틀
    tp, op = pagedef(t_hwpx), pagedef(o_hwpx)
    print("\n%-10s %8s %8s" % ("쪽 틀", "템플릿", "투고본"))
    for k, lab in (("width", "용지 가로"), ("height", "용지 세로"), ("left", "왼쪽 여백"),
                   ("right", "오른쪽 여백"), ("top", "위 여백"), ("bottom", "아래 여백"),
                   ("header", "머리말"), ("footer", "꼬리말")):
        if k not in tp or k not in op:
            continue
        d = "" if abs(tp[k] - op[k]) <= 0.6 else "← %.1fmm 다르다" % (op[k] - tp[k])
        print("  %-10s %7.1f %8.1f  %s" % (lab, tp[k], op[k], d))
        if d:
            bad.append("%s 가 템플릿보다 %.1fmm 다르다" % (lab, op[k] - tp[k]))

    # 3. 1쪽 자리
    if os.path.exists(TPL_PDF) and os.path.exists(PDF):
        a, b = page1(TPL_PDF), page1(PDF)
        print("\n%-10s %8s %8s" % ("1쪽 자리", "템플릿", "투고본"))
        for k in ("머리말", "제목 시작", "각주 시작", "각주 끝", "쪽 번호"):
            if k not in a or k not in b:
                if k in a:
                    bad.append("1쪽에서 「%s」 를 찾지 못했다" % k)
                    print("  %-10s %7.1f      없음  ←" % (k, a[k]))
                continue
            d = "" if abs(a[k] - b[k]) <= POS else "← %.0fmm 다르다" % (b[k] - a[k])
            print("  %-10s %7.1f %8.1f  %s" % (k, a[k], b[k], d))
            if d:
                bad.append("1쪽 「%s」 가 템플릿보다 %.0fmm 다르다" % (k, b[k] - a[k]))

    for p in (t_hwpx, o_hwpx):
        if os.path.exists(p):
            os.remove(p)
    if bad:
        print("\n템플릿과 다른 자리 %d건" % len(bad))
        for x in bad:
            print("  -", x)
        return 1
    print("\n템플릿과 다른 자리 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
