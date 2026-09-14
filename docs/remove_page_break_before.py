# -*- coding: utf-8 -*-
"""지정 문단 앞의 강제 쪽 나누기 하나만 제거해 HWP·PDF 후보를 만든다.

    python -X utf8 docs/remove_page_break_before.py SOURCE.hwp TARGET.hwp TARGET.pdf NEEDLE

본문 문자열이 한 글자라도 달라지면 저장하지 않는다. 글자 단위 줄 나눔으로 배치가
짧아진 뒤, 예전 배치에서 표 갈림을 막으려고 넣은 쪽 나누기가 남은 경우에만 쓴다.
"""

from __future__ import annotations

import os
import sys

import win32com.client as win32

from make_hwp import _find


def report(message):
    print(message, flush=True)


def main():
    if len(sys.argv) != 5:
        sys.exit("SOURCE.hwp TARGET.hwp TARGET.pdf NEEDLE을 지정해야 한다")
    source, target_hwp, target_pdf = map(os.path.abspath, sys.argv[1:4])
    needle = sys.argv[4]
    if not os.path.exists(source):
        sys.exit("원본 HWP가 없다: %s" % source)
    for target in (target_hwp, target_pdf):
        if os.path.exists(target):
            sys.exit("산출물이 이미 있다. 덮어쓰지 않는다: %s" % target)

    report("[1/6] 한글 COM 인스턴스 시작")
    hwp = win32.Dispatch("HWPFrame.HwpObject")
    opened = False
    try:
        try:
            hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
        except Exception:
            pass
        hwp.XHwpWindows.Item(0).Visible = False
        report("[2/6] 원본 열기")
        if not hwp.Open(source, "HWP", "forceopen:true"):
            raise RuntimeError("한글 파일을 열지 못했다: %s" % source)
        opened = True
        before = hwp.GetTextFile("TEXT", "")
        report("[3/6] 대상 문단 찾기: %s" % needle)
        if not _find(hwp, needle):
            raise RuntimeError("대상 문단을 찾지 못했다: %s" % needle)
        hwp.HAction.Run("MoveLineBegin")
        if not hwp.HAction.Run("DeleteBack"):
            raise RuntimeError("대상 문단 앞의 쪽 나누기를 제거하지 못했다")
        after = hwp.GetTextFile("TEXT", "")
        report("[4/6] 본문 문자열 대조")
        if before != after:
            raise RuntimeError("쪽 나누기 제거 중 본문 문자열이 바뀌어 저장하지 않았다")
        report("[5/6] HWP 후보 저장")
        if not hwp.SaveAs(target_hwp, "HWP", ""):
            raise RuntimeError("HWP 저장에 실패했다")
        report("[6/6] PDF 후보 저장")
        if not hwp.SaveAs(target_pdf, "PDF", ""):
            raise RuntimeError("PDF 저장에 실패했다")
        pages = hwp.PageCount
        hwp.Clear(1)
        opened = False
    finally:
        if opened:
            try:
                hwp.Clear(1)
            except Exception:
                pass
        hwp.Quit()
    report("본문 문자열 동일 · 강제 쪽 나누기 1개 제거 · %d쪽" % pages)
    report("%s\n%s" % (target_hwp, target_pdf))


if __name__ == "__main__":
    main()
