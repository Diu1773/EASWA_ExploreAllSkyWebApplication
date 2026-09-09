# -*- coding: utf-8 -*-
"""한글 투고본을 PDF 로 저장한다.

브라우저 인쇄가 아니라 **한글이 뽑은 PDF** 여야 제출본과 같은 모습이다.
`docs/check_typeset.py` 도 이 PDF 를 읽는다.

    python -X utf8 docs/save_pdf.py
"""
import os
import sys

import win32com.client as win32

BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
MAIN = os.path.join(BASE, "EASWA_논문_v17_투고본.hwp")
ALT = os.path.join(BASE, "EASWA_논문_v17_투고본_새판.hwp")
OUT = os.path.join(BASE, "EASWA_논문_v17_투고본.pdf")


def newest():
    """한글에 열려 있어 「_새판」으로 비켜 간 판이 더 새것이면 그것을 쓴다."""
    cands = [p for p in (MAIN, ALT) if os.path.exists(p)]
    if not cands:
        sys.exit("투고본 한글 파일이 없다 — 먼저 docs/make_hwp.py 를 돌린다")
    return max(cands, key=os.path.getmtime)


def main():
    src = newest()
    h = win32.Dispatch("HWPFrame.HwpObject")
    try:
        h.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
    except Exception:
        pass
    h.XHwpWindows.Item(0).Visible = False
    if not h.Open(src, "HWP", "forceopen:true"):
        h.Quit()
        sys.exit("한글 파일 열기 실패 — %s" % src)
    out = OUT
    if os.path.exists(out):
        try:
            os.remove(out)
        except PermissionError:
            out = out[:-4] + "_새판.pdf"
            print("  ! PDF 가 열려 있다 — %s 로 저장한다" % os.path.basename(out))
            if os.path.exists(out):
                try:
                    os.remove(out)
                except PermissionError:
                    pass
    ok = h.SaveAs(out, "PDF", "")
    n = h.PageCount
    h.Clear(1)
    h.Quit()
    if not (ok and os.path.exists(out)):
        sys.exit("PDF 저장 실패")
    print("%s → %s · %d쪽 · %.1f MB"
          % (os.path.basename(src), os.path.basename(out), n, os.path.getsize(out) / 1e6))


if __name__ == "__main__":
    main()
