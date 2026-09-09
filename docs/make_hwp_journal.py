# -*- coding: utf-8 -*-
"""게재 서식 HTML 을 한글(.hwp) 로 옮긴다.

브라우저 조판은 다단에서 그림 옆으로 글을 흘려 넣지 못한다(2026-09-09 사장님이
그림 2 에서 잡음). 한글은 그것을 할 수 있으므로 마무리는 한글에서 한다.
이 스크립트는 **틀만** 잡는다 — 용지, 여백, 2단, 표지 1단. 그림을 어느 단에 놓고
어디에 고정할지는 사람이 한글에서 손으로 정한다.

  python -X utf8 docs/make_hwp_journal.py

전제: `docs/typeset_journal.py` 를 먼저 돌려 게재 서식 HTML 이 있어야 한다.
한글 2022(12.0) 에서 확인했다.
"""
import os
import sys
import time

import win32com.client as win32

BASE = r"C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos"
SRC = os.path.join(BASE, "EASWA_논문_v17_게재서식.html")
OUT = os.path.join(BASE, "EASWA_논문_v17_투고본.hwp")

MM = 7200 / 25.4          # 1 mm = 283.46 HWPUNIT
PAPER_W, PAPER_H = 210.0, 285.0
M_LEFT = M_RIGHT = 21.5
M_TOP, M_BOTTOM = 21.5, 14.0
M_HEAD = M_FOOT = 0.0
COL_GAP = 9.2             # 단 사이 간격 (게재본 실측)


def hwp():
    h = win32.Dispatch("HWPFrame.HwpObject")
    try:
        h.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
    except Exception:
        pass
    h.XHwpWindows.Item(0).Visible = False
    return h


def set_page(h):
    act = h.CreateAction("PageSetup")
    s = act.CreateSet()
    act.GetDefault(s)
    s.SetItem("ApplyTo", 3)               # 문서 전체
    ms = s.CreateItemSet("PageDef", "PageDef")
    ms.SetItem("PaperWidth", int(PAPER_W * MM))
    ms.SetItem("PaperHeight", int(PAPER_H * MM))
    ms.SetItem("LeftMargin", int(M_LEFT * MM))
    ms.SetItem("RightMargin", int(M_RIGHT * MM))
    ms.SetItem("TopMargin", int(M_TOP * MM))
    ms.SetItem("BottomMargin", int(M_BOTTOM * MM))
    ms.SetItem("HeaderLen", int(M_HEAD * MM))
    ms.SetItem("FooterLen", int(M_FOOT * MM))
    ms.SetItem("GutterLen", 0)
    ms.SetItem("Landscape", 0)
    act.Execute(s)


def two_columns(h, start_text="Ⅰ. 서론"):
    """표지 다음부터 2단. 표지는 1단으로 둔다."""
    h.MovePos(2)                                   # 문서 처음
    opt = h.HParameterSet.HFindReplace
    h.HAction.GetDefault("RepeatFind", opt.HSet)
    opt.FindString = start_text
    opt.IgnoreMessage = 1
    opt.Direction = 0
    if not h.HAction.Execute("RepeatFind", opt.HSet):
        print("  '%s' 를 못 찾아 문서 전체를 2단으로 둔다" % start_text)
        h.MovePos(2)
    else:
        h.HAction.Run("MoveLineBegin")

    act = h.CreateAction("MultiColumn")
    s = act.CreateSet()
    act.GetDefault(s)
    s.SetItem("Count", 2)
    s.SetItem("SameGap", int(COL_GAP * MM))
    s.SetItem("LineType", 0)                       # 단 사이 선 없음
    s.SetItem("SameWidth", 1)
    s.SetItem("ApplyTo", 2)                        # 새 구역부터
    act.Execute(s)


def main():
    if not os.path.exists(SRC):
        sys.exit("게재 서식 HTML 이 없다 — 먼저 docs/typeset_journal.py 를 돌린다")
    h = hwp()
    t0 = time.time()
    if not h.Open(SRC, "HTML", "forceopen:true"):
        h.Quit()
        sys.exit("HTML 열기 실패")
    print("HTML 열기 %.0f초 · %d쪽" % (time.time() - t0, h.PageCount))

    set_page(h)
    print("용지 %.0f×%.0f mm · 여백 %.1f/%.1f/%.1f/%.1f · %d쪽"
          % (PAPER_W, PAPER_H, M_LEFT, M_RIGHT, M_TOP, M_BOTTOM, h.PageCount))

    try:
        two_columns(h)
        print("2단 적용 (간격 %.1f mm) · %d쪽" % (COL_GAP, h.PageCount))
    except Exception as e:
        print("2단 적용 실패 —", e)

    if os.path.exists(OUT):
        os.remove(OUT)
    ok = h.SaveAs(OUT, "HWP", "")
    h.Clear(1)
    h.Quit()
    if not (ok and os.path.exists(OUT)):
        sys.exit("저장 실패")
    print("저장 완료 — %s (%.1f MB)" % (OUT, os.path.getsize(OUT) / 1e6))


if __name__ == "__main__":
    main()
