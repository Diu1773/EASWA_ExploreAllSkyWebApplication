# -*- coding: utf-8 -*-
"""투고본 HTML 을 한글에서 열어 hwp 로 저장한다 (2026-09-09).

한글 COM(HWPFrame.HwpObject)을 쓴다. 표와 그림이 그대로 넘어가므로 문단을 하나씩
넣는 것보다 빠르고 안전하다. 저장 뒤 용지·여백을 학회 템플릿 값으로 다시 맞춘다.

    python -X utf8 docs/make_hwp.py
"""
import os
import sys
import time

import win32com.client as win32

BASE = r'C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos'
SRC = os.path.join(BASE, 'EASWA_논문_v17_투고본.html')
OUT = os.path.join(BASE, 'EASWA_논문_v17_투고본.hwp')

# 논문템플릿.hwp 의 PAGE_DEF 실측값 (mm)
PAPER_W, PAPER_H = 210.0, 285.0
M_LEFT, M_RIGHT, M_TOP, M_BOTTOM, M_HEAD, M_FOOT = 22.5, 22.0, 15.0, 12.0, 6.4, 7.0
MM = 7200.0 / 25.4          # HWPUNIT per mm


# 글꼴은 조판 HTML 이 요소마다 style="font-family:…" 로 들고 온다. <style> 블록에
# 적으면 한글이 이름을 대문자로 바꾸고 따옴표까지 붙여 저장하므로(KOPUBWORLD바탕체
# LIGHT") 여기서 다시 지정하지 않는다 — 덮어쓰면 제목·표의 글꼴 위계가 무너진다.


def break_before(h, needle, label):
    """찾은 문자열이 있는 문단 앞에 쪽 나누기를 넣는다.

    게재본(조훈·손정주 2022 · 김미림·손정주 2022)은 1쪽이 주제어와 교신저자 각주로
    끝나고 본문은 2쪽에서 시작한다. 한글은 HTML 의 page-break-before 를 무시하므로
    변환 뒤에 직접 넣는다.
    """
    h.MovePos(2, 0, 0)
    opt = h.HParameterSet.HFindReplace
    h.HAction.GetDefault('RepeatFind', opt.HSet)
    opt.FindString = needle
    opt.IgnoreMessage = 1
    opt.Direction = 0
    if not h.HAction.Execute('RepeatFind', opt.HSet):
        print('  ! 「%s」을 찾지 못해 쪽 나누기를 넣지 않았다' % needle)
        return
    h.HAction.Run('Cancel')
    h.HAction.Run('MoveParaBegin')
    h.HAction.Run('BreakPage')
    print('%s 앞에 쪽 나누기' % label)


def main():
    if not os.path.exists(SRC):
        sys.exit('투고본 HTML 이 없다 — 먼저 docs/typeset_hwp.py 를 돌린다')
    h = win32.Dispatch('HWPFrame.HwpObject')
    try:
        h.RegisterModule('FilePathCheckDLL', 'FilePathCheckerModule')
    except Exception:
        pass
    h.XHwpWindows.Item(0).Visible = False
    t0 = time.time()
    if not h.Open(SRC, 'HTML', 'forceopen:true'):
        h.Quit(); sys.exit('HTML 열기 실패')
    print('HTML 열기 %.0f초 · %d쪽' % (time.time() - t0, h.PageCount))

    # 용지와 여백을 템플릿 값으로
    act = h.CreateAction('PageSetup')
    s = act.CreateSet()
    act.GetDefault(s)
    s.SetItem('PaperWidth', int(PAPER_W * MM))
    s.SetItem('PaperHeight', int(PAPER_H * MM))
    s.SetItem('Landscape', 0)
    ms = s.CreateItemSet('PageDef', 'PageDef')
    ms.SetItem('PaperWidth', int(PAPER_W * MM))
    ms.SetItem('PaperHeight', int(PAPER_H * MM))
    ms.SetItem('LeftMargin', int(M_LEFT * MM))
    ms.SetItem('RightMargin', int(M_RIGHT * MM))
    ms.SetItem('TopMargin', int(M_TOP * MM))
    ms.SetItem('BottomMargin', int(M_BOTTOM * MM))
    ms.SetItem('HeaderLen', int(M_HEAD * MM))
    ms.SetItem('FooterLen', int(M_FOOT * MM))
    ms.SetItem('GutterLen', 0)
    act.Execute(s)
    print('용지 %.0f×%.0f mm · 여백 %.0f/%.0f/%.0f/%.0f 적용 · %d쪽'
          % (PAPER_W, PAPER_H, M_LEFT, M_RIGHT, M_TOP, M_BOTTOM, h.PageCount))

    break_before(h, 'Ⅰ. 서론', '서론')
    break_before(h, '부록. 서술형', '부록')
    print('%d쪽' % h.PageCount)

    if os.path.exists(OUT):
        os.remove(OUT)
    ok = h.SaveAs(OUT, 'HWP', '')
    h.Clear(1)
    h.Quit()
    if ok and os.path.exists(OUT):
        print('저장 완료 — %s (%.1f MB)' % (OUT, os.path.getsize(OUT) / 1e6))
    else:
        sys.exit('저장 실패')


if __name__ == '__main__':
    main()
