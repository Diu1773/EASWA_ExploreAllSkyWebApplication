# -*- coding: utf-8 -*-
"""두 HWP의 한글 COM TEXT 내보내기 결과가 정확히 같은지 확인한다."""

import os
import sys

import win32com.client as win32


def extract(path):
    hwp = win32.DispatchEx("HWPFrame.HwpObject")
    opened = False
    try:
        try:
            hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
        except Exception:
            pass
        hwp.XHwpWindows.Item(0).Visible = False
        if not hwp.Open(path, "HWP", "forceopen:true"):
            raise RuntimeError("열기 실패: %s" % path)
        opened = True
        text = hwp.GetTextFile("TEXT", "")
        pages = hwp.PageCount
        hwp.Clear(1)
        opened = False
        return text, pages
    finally:
        if opened:
            try:
                hwp.Clear(1)
            except Exception:
                pass
        hwp.Quit()


def main():
    if len(sys.argv) != 3:
        sys.exit("비교할 HWP 두 개를 지정한다")
    left, right = map(os.path.abspath, sys.argv[1:])
    left_text, left_pages = extract(left)
    right_text, right_pages = extract(right)
    if left_text != right_text:
        for index, (a, b) in enumerate(zip(left_text, right_text)):
            if a != b:
                sys.exit("본문 불일치: %d번째 문자 %r != %r" % (index, a, b))
        sys.exit("본문 길이 불일치: %d != %d" % (len(left_text), len(right_text)))
    print(
        "본문 문자열 동일 — %d자 · %d쪽 -> %d쪽"
        % (len(left_text), left_pages, right_pages)
    )


if __name__ == "__main__":
    main()
