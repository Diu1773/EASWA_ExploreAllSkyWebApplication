# -*- coding: utf-8 -*-
"""투고본 HTML 을 한글에서 열어 hwp 로 저장한다 (2026-09-09).

한글 COM(HWPFrame.HwpObject)을 쓴다. 표와 그림이 그대로 넘어가므로 문단을 하나씩
넣는 것보다 빠르고 안전하다. 저장 뒤 용지·여백을 학회 템플릿 값으로 다시 맞춘다.

    python -X utf8 docs/make_hwp.py
"""
import io
import json
import os
import sys
import time

import win32com.client as win32

BASE = r'C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos'
SRC = os.path.join(BASE, 'EASWA_논문_v17_투고본.html')
RULES = os.path.join(BASE, 'EASWA_논문_v17_투고본.문단.json')
OUT = os.path.join(BASE, 'EASWA_논문_v17_투고본.hwp')

# 논문템플릿.hwp 의 PAGE_DEF 실측값 (mm)
PAPER_W, PAPER_H = 210.0, 285.0
M_LEFT, M_RIGHT, M_TOP, M_BOTTOM, M_HEAD, M_FOOT = 22.5, 22.0, 15.0, 12.0, 6.4, 7.0
MM = 7200.0 / 25.4          # HWPUNIT per mm


# 글꼴은 조판 HTML 이 요소마다 style="font-family:…" 로 들고 온다. <style> 블록에
# 적으면 한글이 이름을 대문자로 바꾸고 따옴표까지 붙여 저장하므로(KOPUBWORLD바탕체
# LIGHT") 여기서 다시 지정하지 않는다 — 덮어쓰면 제목·표의 글꼴 위계가 무너진다.


def _find(h, needle):
    """문서 처음부터 찾아 커서를 그 문단 첫머리에 둔다."""
    h.MovePos(2, 0, 0)
    opt = h.HParameterSet.HFindReplace
    h.HAction.GetDefault('RepeatFind', opt.HSet)
    opt.FindString = needle
    opt.IgnoreMessage = 1
    opt.Direction = 0
    if not h.HAction.Execute('RepeatFind', opt.HSet):
        return False
    h.HAction.Run('Cancel')
    h.HAction.Run('MoveParaBegin')
    return True


def apply_para_rules(h):
    """제목·캡션 문단에 위 간격과 「다음 문단과 함께」를 준다.

    한글은 HTML 의 margin 과 page-break-after:avoid 를 무시한다. 그래서 절 사이가
    붙어 버리고, 제목만 쪽 끝에 남는 일이 생긴다(2026-09-09 소유자 지적). 변환 뒤에
    문단 모양으로 직접 준다 — 「다음 문단과 함께」가 켜지면 한글이 제목을 다음 쪽으로
    같이 넘긴다.
    """
    if not os.path.exists(RULES):
        print('  ! 문단 지시서가 없다 — 간격·쪽 나눔 규칙을 적용하지 않았다')
        return
    items = json.load(io.open(RULES, encoding='utf-8'))['paras']
    done, miss = 0, []
    for it in items:
        if not _find(h, it['t']):
            miss.append(it['t'][:28])
            continue
        ps = h.HParameterSet.HParaShape
        h.HAction.GetDefault('ParagraphShape', ps.HSet)
        ps.KeepWithNext = 1 if it['keep'] else 0
        ps.PrevSpacing = int(it['prev'] * 100)      # 1pt = 100 HWPUNIT
        h.HAction.Execute('ParagraphShape', ps.HSet)
        done += 1
    print('문단 간격·쪽 나눔 규칙 %d개 적용' % done)
    if miss:
        print('  ! 못 찾은 문단 %d개: %s' % (len(miss), ' / '.join(miss[:5])))


def _widow_headings(pdf, items, need=2):
    """제목 뒤에 본문이 need 줄도 안 남은 쪽을 찾는다."""
    import fitz
    heads = [it['t'] for it in items]

    def which(line):
        for t in heads:
            if line.startswith(t[:16]):
                return t
        return None

    d = fitz.open(pdf)
    out = []
    for pg in d:
        lines = [x.strip() for x in pg.get_text().splitlines() if x.strip()]
        for k, l in enumerate(lines):
            t = which(l)
            if not t or len(lines) - k - 1 >= need:
                continue
            # 장 제목 바로 밑에 절 제목이 오는 자리에서는 위의 것부터 넘겨야 한다.
            # 아래 것만 넘기면 장 제목이 혼자 남아 몇 번을 돌아도 끝나지 않는다.
            j = k
            while j > 0 and which(lines[j - 1]):
                j -= 1
                t = which(lines[j])
            if j == 0:          # 이미 쪽 맨 위다 — 더 밀 수 없다
                continue
            if t not in out:
                out.append(t)
    d.close()
    return out


def fix_widow_headings(rounds=3):
    """제목만 쪽 끝에 남는 자리에 쪽 나누기를 넣는다.

    「다음 문단과 함께」는 제목과 바로 다음 문단을 붙여 주지만, 그 문단의 첫 줄
    하나만 따라오는 자리는 막지 못한다(2026-09-09 소유자 지적). 저장한 hwp 를 다시
    열어 PDF 로 뽑고, 실제로 몇 줄이 남았는지 세어 모자란 제목 앞에 쪽 나누기를 넣는다.

    HTML 로 연 문서에서 바로 PDF 로 저장하면 한글이 응답하지 않는다(2026-09-09 확인).
    그래서 hwp 로 한 번 저장한 뒤에 이 단계를 돈다.
    """
    if not os.path.exists(RULES):
        return
    items = json.load(io.open(RULES, encoding='utf-8'))['paras']
    tmp = os.path.join(BASE, '_widowcheck.pdf')
    for _ in range(rounds):
        # PDF 로 내보낸 문서를 그대로 다시 저장하면 한글이 그림을 96dpi 로 줄여
        # 넣는다(2026-09-09 확인). 그래서 재는 판과 고치는 판을 따로 연다.
        h = _hwp()
        h.Open(OUT, 'HWP', 'forceopen:true')
        if os.path.exists(tmp):
            os.remove(tmp)
        h.SaveAs(tmp, 'PDF', '')
        pages = h.PageCount
        h.Clear(1)
        h.Quit()
        bad = _widow_headings(tmp, items)
        if not bad:
            print('최종 %d쪽 — 제목만 남은 자리 없음' % pages)
            break
        h = _hwp()
        h.Open(OUT, 'HWP', 'forceopen:true')
        for t in bad:
            if _find(h, t):
                h.HAction.Run('BreakPage')
        h.SaveAs(OUT, 'HWP', '')
        h.Clear(1)
        h.Quit()
        print('제목만 남은 자리 %d곳에 쪽 나누기: %s'
              % (len(bad), ' / '.join(x[:24] for x in bad)))
    if os.path.exists(tmp):
        os.remove(tmp)


def place_figures(h):
    """[[FIG n]] 표시 자리에 원본 그림을 넣고 mm 크기를 준다.

    한글의 HTML 가져오기는 그림을 96dpi 로 다시 샘플링한다 — 태그에 크기를 적든
    안 적든 마찬가지여서 5770px 원본이 582px 로 줄었다(2026-09-09). COM 의
    InsertPicture 는 원본을 그대로 넣으므로 표시를 지우고 그 자리에 다시 넣는다.
    크기는 InsertPicture 인자로는 듣지 않아 넣은 뒤 문단 개체 속성으로 준다.
    """
    if not os.path.exists(RULES):
        return
    figs = json.load(io.open(RULES, encoding='utf-8'))['figs']
    put = 0
    for n, fg in enumerate(figs, 1):
        mark = '[[FIG%d]]' % n
        h.MovePos(2, 0, 0)
        opt = h.HParameterSet.HFindReplace
        h.HAction.GetDefault('RepeatFind', opt.HSet)
        opt.FindString = mark
        opt.IgnoreMessage = 1
        opt.Direction = 0
        if not h.HAction.Execute('RepeatFind', opt.HSet):
            print('  ! %s 자리를 찾지 못했다' % mark)
            continue
        h.HAction.Run('Delete')                 # 찾아 놓은 표시 글자를 지운다
        if not os.path.exists(fg['path']):
            print('  ! 그림 없음: %s' % fg['path'])
            continue
        h.InsertPicture(fg['path'], True, 0, False, False, 0, 0, 0)
        put += 1
    # 넣은 순서와 문서 차례가 같으므로 앞에서부터 크기를 준다.
    k = 0
    c = h.HeadCtrl
    while c:
        if c.CtrlID == 'gso' and k < len(figs) and figs[k]['w'] > 0:
            pr = c.Properties
            pr.SetItem('TreatAsChar', 1)
            pr.SetItem('Width', int(figs[k]['w'] * MM))
            pr.SetItem('Height', int(figs[k]['h'] * MM))
            c.Properties = pr
            k += 1
        c = c.Next
    print('그림 %d개를 원본으로 넣고 %d개 크기 지정' % (put, k))


def fit_tables(h):
    """표를 본문 폭에 맞춘다 — HTML 의 width:100% 를 무시하고 150mm 로 넣는다."""
    if not os.path.exists(RULES):
        return
    body_w = json.load(io.open(RULES, encoding='utf-8'))['body_w']
    nt = 0
    c = h.HeadCtrl
    while c:
        if c.CtrlID == 'tbl':
            pr = c.Properties
            if abs(pr.Item('Width') - body_w * MM) > MM:
                pr.SetItem('Width', int(body_w * MM))
                c.Properties = pr
                nt += 1
        c = c.Next
    print('표 %d개를 본문 폭 %.1fmm 로' % (nt, body_w))


def break_before(h, needle, label):
    """찾은 문자열이 있는 문단 앞에 쪽 나누기를 넣는다.

    게재본(조훈·손정주 2022 · 김미림·손정주 2022)은 1쪽이 주제어와 교신저자 각주로
    끝나고 본문은 2쪽에서 시작한다. 한글은 HTML 의 page-break-before 를 무시하므로
    변환 뒤에 직접 넣는다.
    """
    if not _find(h, needle):
        print('  ! 「%s」을 찾지 못해 쪽 나누기를 넣지 않았다' % needle)
        return
    h.HAction.Run('BreakPage')
    print('%s 앞에 쪽 나누기' % label)


def _hwp():
    h = win32.Dispatch('HWPFrame.HwpObject')
    try:
        h.RegisterModule('FilePathCheckDLL', 'FilePathCheckerModule')
    except Exception:
        pass
    h.XHwpWindows.Item(0).Visible = False
    return h


def main():
    if not os.path.exists(SRC):
        sys.exit('투고본 HTML 이 없다 — 먼저 docs/typeset_hwp.py 를 돌린다')
    h = _hwp()
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

    place_figures(h)
    fit_tables(h)
    apply_para_rules(h)
    break_before(h, 'Ⅰ. 서론', '서론')
    break_before(h, '부록. 서술형', '부록')
    print('%d쪽' % h.PageCount)

    if os.path.exists(OUT):
        os.remove(OUT)
    ok = h.SaveAs(OUT, 'HWP', '')
    h.Clear(1)
    h.Quit()
    if not (ok and os.path.exists(OUT)):
        sys.exit('저장 실패')
    fix_widow_headings()
    print('저장 완료 — %s (%.1f MB)' % (OUT, os.path.getsize(OUT) / 1e6))


if __name__ == '__main__':
    main()
