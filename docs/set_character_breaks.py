# -*- coding: utf-8 -*-
"""한글 문서의 한글 줄 나눔을 글자 단위로 바꾸고 HWP·PDF를 함께 저장한다.

같은 학회 게재본은 좁은 2단에서도 한글 어절 내부의 줄 나눔을 허용하여 양쪽
정렬의 공백이 과도하게 벌어지지 않는다. 한글 COM의 ``BreakNonLatinWord``는
이 문서와 한글 2022에서 ``0``이 글자 단위, ``1``이 어절 단위로 동작했다.
HWPX 속성만 고치면 HWP 왕복에서 값이 버려질 수 있으므로, 모든 HWPX 작업이 끝난
최종 HWP에 한글 COM으로 직접 준다.

    python -X utf8 docs/set_character_breaks.py SOURCE.hwp TARGET.hwp TARGET.pdf
    python -X utf8 docs/set_character_breaks.py --in-place SOURCE.hwp

첫 형식은 원본을 보존하고, ``--in-place``는 임시 HWP를 검증한 뒤 원본 자리에
원자적으로 교체한다. 두 형식 모두 본문 문자열이 달라지면 반영하지 않는다.
"""

from __future__ import annotations

import os
import sys
import uuid

import win32com.client as win32


def report(message):
    print(message, flush=True)


def set_table_cells(hwp):
    """표의 모든 칸에 글자 단위 줄 나눔을 적용한다."""
    visited = 0
    changed = 0
    ctrl = hwp.HeadCtrl
    while ctrl:
        if ctrl.CtrlID == "tbl":
            hwp.SetPosBySet(ctrl.GetAnchorPos(0))
            hwp.FindCtrl()
            hwp.HAction.Run("ShapeObjTableSelCell")
            hwp.HAction.Run("Cancel")
            seen = set()
            while True:
                pos = hwp.GetPos()
                if pos in seen or len(seen) > 500:
                    break
                seen.add(pos)
                shape = hwp.HParameterSet.HParaShape
                hwp.HAction.GetDefault("ParagraphShape", shape.HSet)
                visited += 1
                if shape.BreakNonLatinWord != 0:
                    shape.BreakNonLatinWord = 0
                    hwp.HAction.Execute("ParagraphShape", shape.HSet)
                    changed += 1
                if not hwp.HAction.Run("TableRightCell"):
                    break
            hwp.HAction.Run("Cancel")
        ctrl = ctrl.Next
    return visited, changed


def find_paragraph(hwp, needle):
    """본문 선택에서 빠지는 각주 문단을 문자열로 찾는다."""
    hwp.MovePos(2, 0, 0)
    find = hwp.HParameterSet.HFindReplace
    hwp.HAction.GetDefault("RepeatFind", find.HSet)
    find.FindString = needle
    find.IgnoreMessage = 1
    find.Direction = 0
    if not hwp.HAction.Execute("RepeatFind", find.HSet):
        return False
    hwp.HAction.Run("Cancel")
    hwp.HAction.Run("MoveParaBegin")
    return True


def set_note_paragraphs(hwp):
    """SelectAll에서 빠지는 교신저자·접수일 각주에도 같은 값을 적용한다."""
    changed = 0
    for needle in ("*교신저자 이메일 주소", "▶ 접수:"):
        if not find_paragraph(hwp, needle):
            continue
        shape = hwp.HParameterSet.HParaShape
        hwp.HAction.GetDefault("ParagraphShape", shape.HSet)
        if shape.BreakNonLatinWord != 0:
            shape.BreakNonLatinWord = 0
            hwp.HAction.Execute("ParagraphShape", shape.HSet)
            changed += 1
    return changed


def main():
    in_place = len(sys.argv) == 3 and sys.argv[1] == "--in-place"
    if in_place:
        source = os.path.abspath(sys.argv[2])
        stem = os.path.splitext(os.path.basename(source))[0]
        target_hwp = os.path.join(
            os.path.dirname(source),
            "_%s_글자나눔_%s.hwp" % (stem, uuid.uuid4().hex),
        )
        target_pdf = None
    elif len(sys.argv) == 4:
        source, target_hwp, target_pdf = map(os.path.abspath, sys.argv[1:])
    else:
        sys.exit(
            "SOURCE.hwp TARGET.hwp TARGET.pdf 또는 --in-place SOURCE.hwp를 지정해야 한다"
        )
    if not os.path.exists(source):
        sys.exit("원본 HWP가 없다: %s" % source)
    for target in (target_hwp, target_pdf):
        if target is None:
            continue
        if os.path.exists(target):
            sys.exit("산출물이 이미 있다. 덮어쓰지 않는다: %s" % target)

    report("[1/9] 한글 COM 인스턴스 시작")
    hwp = win32.Dispatch("HWPFrame.HwpObject")
    opened = False
    pages = 0
    cells = 0
    cells_changed = 0
    notes_changed = 0
    try:
        report("[2/9] 파일 경로 검사 모듈 등록")
        try:
            hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
        except Exception:
            pass
        report("[3/9] 원본 열기")
        hwp.XHwpWindows.Item(0).Visible = False
        if not hwp.Open(source, "HWP", "forceopen:true"):
            raise RuntimeError("한글 파일을 열지 못했다: %s" % source)
        opened = True

        report("[4/9] 변경 전 본문 추출")
        before = hwp.GetTextFile("TEXT", "")
        report("[5/9] 본문 문단 속성 변경")
        hwp.HAction.Run("SelectAll")
        shape = hwp.HParameterSet.HParaShape
        hwp.HAction.GetDefault("ParagraphShape", shape.HSet)
        shape.BreakNonLatinWord = 0
        hwp.HAction.Execute("ParagraphShape", shape.HSet)
        hwp.HAction.Run("Cancel")
        report("[6/9] 표 셀 문단 속성 변경")
        cells, cells_changed = set_table_cells(hwp)
        notes_changed = set_note_paragraphs(hwp)
        report("[7/9] 변경 후 본문 대조")
        after = hwp.GetTextFile("TEXT", "")
        if before != after:
            raise RuntimeError("줄 나눔 변경 중 본문 문자열이 바뀌었다")

        report("[8/9] HWP 저장")
        if not hwp.SaveAs(target_hwp, "HWP", ""):
            raise RuntimeError("HWP 저장에 실패했다")
        if target_pdf is not None:
            report("[9/9] PDF 저장")
            if not hwp.SaveAs(target_pdf, "PDF", ""):
                raise RuntimeError("PDF 저장에 실패했다")
        else:
            report("[9/9] PDF는 다음 조판 단계에서 저장")
        pages = hwp.PageCount
        hwp.Clear(1)
        opened = False
    finally:
        report("한글 COM 인스턴스 종료")
        if opened:
            try:
                hwp.Clear(1)
            except Exception:
                pass
        hwp.Quit()

    if in_place:
        os.replace(target_hwp, source)
        target_hwp = source
    report(
        "글자 단위 줄 나눔 적용 — 본문 전체 · 표 %d칸(%d칸 변경) · 각주 %d개 변경 · %d쪽"
        % (cells, cells_changed, notes_changed, pages)
    )
    if target_pdf is None:
        report("본문 문자열 동일 · %s" % target_hwp)
    else:
        report("본문 문자열 동일 · %s · %s" % (target_hwp, target_pdf))


if __name__ == "__main__":
    main()
