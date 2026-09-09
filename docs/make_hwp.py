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
M_LEFT, M_RIGHT, M_TOP, M_BOTTOM, M_HEAD, M_FOOT = 22.0, 22.0, 22.0, 15.0, 18.0, 17.0
MM = 7200.0 / 25.4          # HWPUNIT per mm


# 한글이 HTML 을 가져오면 CSS 의 글꼴 목록을 그대로 쓰지 못하고 한컴바탕·굴림으로
# 대체한다(2026-09-09 확인). 문단을 순회하며 크기는 그대로 두고 글꼴 이름만 템플릿
# 값으로 다시 지정한다.
SERIF = 'KoPubWorld바탕체 Light'
SERIF_B = 'KoPubWorld바탕체_Pro Bold'
SANS_B = 'KoPubWorld돋움체 Bold'
SANS_L = 'KoPubWorld돋움체 Light'


def _face(size):
    if size >= 18: return SERIF_B      # 논문 제목
    if size >= 12: return SANS_B       # 장·절 제목
    if size <= 9.0: return SANS_L      # 표와 캡션
    return SERIF                       # 본문


def apply_fonts(h):
    """문서 전체를 한 번에 지정한다. 문단마다 COM 을 부르면 400문단에 5분이 넘는다.

    크기(Height)는 건드리지 않으므로 제목·표의 크기 위계는 그대로 남고 글꼴 이름만
    바뀐다. 표 안의 8.5pt 도 같은 글꼴이 되지만, 학회지 조판이 어차피 다시 이루어지고
    투고본에서 중요한 것은 글꼴 이름이 규정대로 저장되는 것이다.
    """
    h.CreateAction('SelectAll').Run()
    act = h.CreateAction('CharShape')
    s = act.CreateSet()
    act.GetDefault(s)
    for k in ('FaceNameHangul', 'FaceNameLatin', 'FaceNameHanja',
              'FaceNameJapanese', 'FaceNameOther', 'FaceNameSymbol', 'FaceNameUser'):
        try:
            s.SetItem(k, SERIF)
        except Exception:
            pass
    act.Execute(s)
    h.CreateAction('Cancel').Run()
    print('글꼴 일괄 지정: %s' % SERIF)


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

    apply_fonts(h)

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
