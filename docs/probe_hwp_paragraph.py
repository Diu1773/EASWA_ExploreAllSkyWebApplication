# -*- coding: utf-8 -*-
"""HWP 문단의 실제 COM 문단 모양 값을 읽는 진단 도구."""

import os
import sys

import win32com.client as win32


def find(hwp, needle):
    hwp.MovePos(2, 0, 0)
    opt = hwp.HParameterSet.HFindReplace
    hwp.HAction.GetDefault("RepeatFind", opt.HSet)
    opt.FindString = needle
    opt.IgnoreMessage = 1
    opt.Direction = 0
    if not hwp.HAction.Execute("RepeatFind", opt.HSet):
        return False
    hwp.HAction.Run("Cancel")
    hwp.HAction.Run("MoveParaBegin")
    return True


def probe(path, needle):
    print("OPEN", path, flush=True)
    hwp = win32.DispatchEx("HWPFrame.HwpObject")
    opened = False
    try:
        try:
            hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
        except Exception:
            pass
        hwp.XHwpWindows.Item(0).Visible = False
        if not hwp.Open(path, "HWP", "forceopen:true"):
            raise RuntimeError("열기 실패")
        opened = True
        if not find(hwp, needle):
            raise RuntimeError("문장 찾기 실패")
        para = hwp.HParameterSet.HParaShape
        hwp.HAction.GetDefault("ParagraphShape", para.HSet)
        names = [
            "BreakNonLatinWord",
            "BreakLatinWord",
            "AlignType",
            "Condense",
            "LineWrap",
            "KeepWithNext",
            "WidowOrphan",
        ]
        values = {}
        for name in names:
            try:
                values[name] = getattr(para, name)
            except Exception as exc:
                values[name] = "<%s>" % type(exc).__name__
        print(values, flush=True)
        hwp.Clear(1)
        opened = False
    finally:
        if opened:
            try:
                hwp.Clear(1)
            except Exception:
                pass
        hwp.Quit()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("HWP 경로 하나 이상과 마지막 인수로 찾을 문장을 지정한다")
    needle = sys.argv[-1]
    for item in sys.argv[1:-1]:
        probe(os.path.abspath(item), needle)
