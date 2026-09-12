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
SRC = os.path.join(BASE, 'EASWA_논문_v18_투고본.html')
RULES = os.path.join(BASE, 'EASWA_논문_v18_투고본.문단.json')
OUT = os.path.join(BASE, 'EASWA_논문_v18_투고본.hwp')

# 논문템플릿.hwp 의 PAGE_DEF 실측값 (mm) — COM 으로 직접 읽었다(2026-09-10)
PAPER_W, PAPER_H = 210.0, 285.0
M_LEFT, M_RIGHT, M_TOP, M_BOTTOM, M_HEAD, M_FOOT = 22.0, 22.0, 22.0, 15.0, 18.0, 17.0
MM = 7200.0 / 25.4          # HWPUNIT per mm
MM_PT = 72.0 / 25.4         # PDF 포인트 per mm


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


_KEEPLINES_WARNED = False


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
        # 「문단 보호」 — 캡션이 두 줄 이상일 때 첫 줄만 그림 쪽에 남는 것을 막는다.
        # 「다음 문단과 함께」는 다음 문단의 첫 줄까지만 붙잡는다(2026-09-11).
        if it.get('keeplines'):
            try:
                ps.KeepLinesTogether = 1
            except Exception:
                global _KEEPLINES_WARNED
                if not _KEEPLINES_WARNED:
                    print('  ! 문단 보호(KeepLinesTogether)를 줄 수 없다')
                    _KEEPLINES_WARNED = True
        ps.PrevSpacing = int(it['prev'] * 100)      # 1pt = 100 HWPUNIT
        h.HAction.Execute('ParagraphShape', ps.HSet)
        # 장 제목은 가운데 — 템플릿의 「서론」·「연구 방법」·「참고문헌」이 모두 가운데다
        if it.get('align') == 'center':
            h.HAction.Run('ParagraphShapeAlignCenter')
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
    # 그림 캡션은 빼야 한다. 캡션은 뒤에 본문이 따라올 필요가 없고, 앞의 그림을
    # 따라다녀야 한다 — 여기서 캡션 앞에 쪽 나누기를 넣으면 그림과 캡션이 갈린다
    # (2026-09-11, 그림 8·9 의 캡션만 다음 쪽 맨 위에 남았다).
    items = [it for it in json.load(io.open(RULES, encoding='utf-8'))['paras']
             if it.get('role') != '그림제목']
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
        # 그림이 든 문단을 가운데로. 한글은 CSS 의 text-align:center 를 무시해서
        # 폭이 좁은 그림이 왼쪽에 붙는다(2026-09-09, 그림 2 에서 소유자가 잡았다).
        h.HAction.Run('ParagraphShapeAlignCenter')
        # 그림과 그 캡션은 떨어지면 안 된다 — 그림 2 는 14쪽, 캡션은 15쪽 맨 위에
        # 있었다(2026-09-10). CSS 의 page-break-inside 를 한글이 무시한다.
        ps = h.HParameterSet.HParaShape
        h.HAction.GetDefault('ParagraphShape', ps.HSet)
        ps.KeepWithNext = 1
        h.HAction.Execute('ParagraphShape', ps.HSet)
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
    """표를 본문 폭에 맞추고, 쪽에서 갈릴지 말지를 정한다.

    행이 적은 표가 쪽 경계에서 갈리면 머리글 없는 조각이 다음 쪽 맨 위에 남는다
    (2026-09-10, 표 10 이 19~20 쪽으로 갈렸다). 한 쪽에 들어갈 표는 통째로 넘기고,
    12행이 넘는 표만 갈리도록 둔다. CSS 의 page-break-inside 는 한글이 무시한다.
    """
    if not os.path.exists(RULES):
        return
    conf = json.load(io.open(RULES, encoding='utf-8'))
    body_w = conf['body_w']
    tbls = conf.get('tbls', [])
    nt, nb = 0, 0
    k = 0
    c = h.HeadCtrl
    while c:
        if c.CtrlID == 'tbl':
            pr = c.Properties
            # 표 폭을 본문 폭으로 늘리는 것은 한글이 받아 주지 않는다 — 열 너비 합에
            # 매여 150mm 로 남는다(2026-09-10 확인). 대신 가운데로 놓는다. 템플릿의
            # 표 1 도 76mm 짜리가 가운데였다.
            if pr.Item('HorzAlign') != 1:
                pr.SetItem('HorzAlign', 1)     # 0 왼쪽 · 1 가운데 · 2 오른쪽
                nt += 1
            if k < len(tbls):
                # 0 나눔 · 1 셀 단위로 나눔 · 2 나누지 않음
                pr.SetItem('PageBreak', 1 if tbls[k]['big'] else 2)
                nb += 1
            c.Properties = pr
            k += 1
        c = c.Next
    print('표 %d개를 가운데로 · %d개에 쪽 나눔 규칙' % (nt, nb))


HEADER_LEFT = '| 연구논문 |'
HEADER_MID = '현장과학교육 권(호)'


def set_header(h):
    """머리말을 넣는다 — 템플릿 1쪽과 같은 「| 연구논문 |」 + 학회지명.

    한글 COM 으로는 홀수 쪽·짝수 쪽 머리말을 나눌 수 없다(2026-09-10 확인:
    ApplyClass·WhichPage·Where 를 무엇으로 줘도 머리말 컨트롤이 하나만 생기고
    마지막 것이 앞의 것을 덮는다). 그래서 양쪽 같은 머리말 하나를 쓴다.
    템플릿은 홀수 쪽에 학회지명, 짝수 쪽에 논문 제목을 넣는다.
    """
    h.MovePos(2, 0, 0)
    o = h.HParameterSet.HHeaderFooter
    h.HAction.GetDefault('HeaderFooter', o.HSet)
    o.HSet.SetItem('Type', 0)
    if not h.HAction.Execute('HeaderFooter', o.HSet):
        print('  ! 머리말에 들어가지 못했다')
        return
    t = h.HParameterSet.HInsertText
    h.HAction.GetDefault('InsertText', t.HSet)
    t.Text = '%s				%s' % (HEADER_LEFT, HEADER_MID)
    h.HAction.Execute('InsertText', t.HSet)
    h.HAction.Run('CloseEx')
    print('머리말 「%s … %s」' % (HEADER_LEFT, HEADER_MID))


def set_pagenum(h):
    """쪽 번호를 바깥쪽 아래에 — 템플릿 실측 DrawPos=8."""
    o = h.HParameterSet.HPageNumPos
    h.HAction.GetDefault('PageNumPos', o.HSet)
    o.DrawPos = 8
    o.NumberFormat = 0
    o.SideChar = 0
    o.NewNumber = 1
    if h.HAction.Execute('PageNumPos', o.HSet):
        print('쪽 번호 바깥쪽 아래')
    else:
        print('  ! 쪽 번호를 넣지 못했다')


def place_footnote(h):
    """교신저자·심사판정 두 줄을 한글제목에 단 **각주**로 넣는다.

    학회 템플릿(`논문템플릿.hwp`)은 이 두 줄을 본문 문단이 아니라 각주로 둔다.
    각주라야 1쪽 맨 아래에 붙는다 — 템플릿 실측 245.0~252.7mm, 본문 아래 끝이
    253mm 다. 본문 문단으로 두면 주제어 바로 밑(200mm)에 붙어 45mm 위로 뜬다
    (2026-09-12 소유자 지적). 템플릿 HWPX 에도 `<hp:footNote>` 가 한글제목
    문단에 달려 있다.
    """
    if not os.path.exists(RULES):
        return
    conf = json.load(io.open(RULES, encoding='utf-8'))
    lines = conf.get('footnote') or []
    if not lines:
        print('  ! 각주로 넣을 줄이 없다')
        return
    # 제목은 줄을 나눠 놓았으므로 앞 열두 글자로만 찾는다
    title = (conf.get('title') or '')[:12]
    if not title or not _find(h, title):
        print('  ! 한글제목을 찾지 못해 각주를 넣지 않았다')
        return
    h.HAction.Run('MoveParaEnd')
    if not h.HAction.Run('InsertFootnote'):
        print('  ! 각주를 넣지 못했다')
        return
    for k, ln in enumerate(lines):
        if k:
            h.HAction.Run('BreakPara')
        t = h.HParameterSet.HInsertText
        h.HAction.GetDefault('InsertText', t.HSet)
        t.Text = ln
        h.HAction.Execute('InsertText', t.HSet)
    h.HAction.Run('CloseEx')
    print('한글제목에 각주 %d줄 — %s' % (len(lines), lines[0][:26]))


def break_section(h, needle, label):
    """찾은 문단 앞에서 구역을 나눈다.

    머리말은 구역마다 따로 둘 수 있다. 1쪽(표제부)에만 「| 연구논문 |」을 두고
    2쪽부터는 홀수·짝수를 나누려면 구역이 둘이어야 한다 — 템플릿이 그렇다.
    머리말 자체는 docs/hwpx_headers.py 가 HWPX 로 바꿔서 넣는다.
    """
    if not _find(h, needle):
        print('  ! 「%s」을 찾지 못해 구역을 나누지 않았다' % needle)
        return
    h.HAction.Run('BreakSection')
    print('%s 앞에서 구역 나누기' % label)


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


def free_path(path):
    """저장할 자리를 비운다. 한글에서 열어 둔 파일이면 옆 이름으로 비켜 준다.

    소유자가 투고본을 한글로 열어 화면을 보는 중에 다시 돌리면 SaveAs 가
    PermissionError 로 죽는다(2026-09-09). 한 번의 변환을 통째로 버리지 않는다.
    """
    if not os.path.exists(path):
        return path
    try:
        os.remove(path)
        return path
    except PermissionError:
        pass
    # 「_새판」도 열려 있으면 번호를 올린다. 둘 다 막혔을 때 한 판을 통째로
    # 버리고 「저장 실패」로 끝났다(2026-09-12).
    for tag in ('_새판', '_새판2', '_새판3', '_새판4'):
        alt = path[:-4] + tag + path[-4:]
        if not os.path.exists(alt):
            print('  ! %s 가 한글에서 열려 있다 — %s 로 저장한다'
                  % (os.path.basename(path), os.path.basename(alt)))
            return alt
        try:
            os.remove(alt)
            print('  ! %s 가 한글에서 열려 있다 — %s 로 저장한다'
                  % (os.path.basename(path), os.path.basename(alt)))
            return alt
        except PermissionError:
            continue
    sys.exit('투고본과 _새판 넷이 모두 한글에서 열려 있다 — 한글에서 닫아 주십시오')


def fix_split_tables(rounds=3):
    """쪽에서 갈린 표 앞에 쪽 나누기를 넣는다.

    한글 표 속성의 「나누지 않음」(PageBreak=2)은 저장은 되지만 실제 배치에 듣지
    않았다(2026-09-10 확인: 표 10 이 19~20 쪽으로 갈렸고 머리글의 마지막 줄만
    다음 쪽에 남았다). 그래서 저장한 hwp 를 PDF 로 재서 캡션이 있는 쪽과 마지막
    행이 있는 쪽이 다른 표를 찾아, 그 캡션 앞에 쪽 나누기를 넣는다.
    행이 12개가 넘어 어차피 한 쪽에 안 들어가는 표는 그대로 둔다.
    """
    import fitz
    if not os.path.exists(RULES):
        return
    # 캡션 열쇠는 「표제목」이다. 조판기의 CSS 클래스를 한글 스타일 이름으로 바꿀 때
    # 규칙 파일의 열쇠도 함께 바뀌었는데(2026-09-11) 여기만 옛 이름 'cap' 을 보고 있어
    # 목록이 늘 비었다 — 그래서 이 함수가 세 판 내리 아무 일도 하지 않았고 표 2 의
    # 마지막 행이 13쪽 맨 위에 머리글 없이 떨어졌다(F-327).
    tbls = [dict(t, cap=t.get('표제목') or t.get('cap'))
            for t in json.load(io.open(RULES, encoding='utf-8')).get('tbls', [])]
    tbls = [t for t in tbls if not t['big'] and t['cap'] and t.get('last')]
    if not tbls:
        print('  ! 규칙 파일에 표 캡션이 없다 — 갈린 표를 보지 않는다')
        return
    tmp = os.path.join(BASE, '_splitcheck.pdf')
    done = set()          # 한 번 민 표는 다시 밀지 않는다
    never = set()         # 밀어도 갈리는 표 — 후보에서 아주 뺀다
    for _ in range(rounds):
        h = _hwp()
        h.Open(OUT, 'HWP', 'forceopen:true')
        if os.path.exists(tmp):
            os.remove(tmp)
        h.SaveAs(tmp, 'PDF', '')
        h.Clear(1)
        h.Quit()
        pages, gaps = [], []
        d = fitz.open(tmp)
        tops = []          # 쪽마다 {캡션 앞머리: 그 캡션의 y(mm)} — 문서를 닫기
                           # 전에 재 둔다
        heads = [t['cap'][:14] for t in tbls]
        for pg in d:
            pages.append(pg.get_text())
            here = {}
            for hd in heads:
                r = pg.search_for(hd)
                if r:
                    here[hd] = min(x.y0 for x in r) / MM_PT
            tops.append(here)
            b = [x for x in pg.get_text('blocks') if x[4].strip()
                 and x[3] / MM_PT > 26 and x[1] / MM_PT < 258]
            low = max([x[3] for x in b] or [0]) / MM_PT
            gaps.append(pg.rect.height / MM_PT - low - 32.0)
        d.close()
        bad, stuck, undo = [], [], []
        for t in tbls:
            if t['cap'] in never:
                continue
            head = t['cap'][:14]
            cp = next((i for i, p in enumerate(pages) if head in p), None)
            if cp is None:
                continue
            lp = next((i for i in range(cp, len(pages)) if t['last'] in pages[i]), None)
            if lp is None or lp <= cp:
                continue
            # 「이미 쪽 맨 위인가」는 **자리로** 잰다. 줄 순서로 보면 표가 많은
            # 쪽에서 읽는 순서와 위치가 달라 엉뚱한 표가 걸린다(2026-09-12,
            # 부록 표 3 이 31쪽 223mm 에 있는데 맨 위로 판정됐다).
            y = tops[cp].get(head)
            at_top = y is not None and y < 50.0
            if t['cap'] in done or at_top:
                # 이미 쪽 맨 위인데도 갈린다 — 한 쪽에 안 들어가는 표다. 더 밀면
                # 앞 쪽만 비운다(2026-09-10, 표 6 이 세 번 밀렸다).
                stuck.append(t['cap'])
                never.add(t['cap'])
                if t['cap'] in done:
                    undo.append(t['cap'])
                continue
            bad.append(t['cap'])
        # 밀었더니 앞 쪽이 크게 빈 표도 되돌린다 — 갈림을 없앤 이득보다 손해가 크다
        # (2026-09-10, 표 11 을 밀었더니 21쪽이 165mm 비었다).
        for cap in list(done):
            cp = next((i for i, pg in enumerate(pages) if cap[:14] in pg), None)
            if cp and cp > 0 and gaps[cp - 1] > 120.0:
                undo.append(cap)
                never.add(cap)
                print('  「%s」 를 밀었더니 앞 쪽이 %.0fmm 비었다 — 되돌린다'
                      % (cap[:18], gaps[cp - 1]))

        if stuck:
            print('  한 쪽에 안 들어가 그대로 두는 표: %s'
                  % ' / '.join(c[:16] for c in stuck))
        # 밀어 봐야 갈리는 표는 앞서 넣은 쪽 나누기를 도로 뺀다 — 그것 때문에 앞 쪽이
        # 통째로 빈다(2026-09-10, 14쪽이 134mm 비었는데 표 6 은 26mm 였다).
        undo = list(dict.fromkeys(undo))     # 같은 표가 두 번 들어가면 두 번째
                                             # DeleteBack 이 진짜 글자를 지운다
        if undo:
            h = _hwp()
            h.Open(OUT, 'HWP', 'forceopen:true')
            n = 0
            for cap in undo:
                if _find(h, cap[:20]):
                    h.HAction.Run('MoveLineBegin')
                    h.HAction.Run('DeleteBack')      # 앞의 쪽 나누기를 지운다
                    n += 1
                    done.discard(cap)
            if n:
                h.SaveAs(OUT, 'HWP', '')
                print('  넣었던 쪽 나누기 %d개를 도로 뺐다' % n)
            h.Clear(1)
            h.Quit()
        if not bad and not undo:
            print('쪽에서 갈린 표 없음 (밀 수 있는 것 기준)')
            break
        if not bad:
            # 되돌린 판은 배치가 달라졌다. 다시 재지 않고 끝내면 되돌리는 과정에서
            # 새로 갈린 표를 놓친다(2026-09-12, 부록 표 3 이 31~32쪽으로 갈렸다).
            continue
        done |= set(bad)
        h = _hwp()
        h.Open(OUT, 'HWP', 'forceopen:true')
        for cap in bad:
            if _find(h, cap[:20]):
                h.HAction.Run('BreakPage')
        h.SaveAs(OUT, 'HWP', '')
        h.Clear(1)
        h.Quit()
        print('갈린 표 %d개 앞에 쪽 나누기: %s'
              % (len(bad), ' / '.join(c[:16] for c in bad)))
    if os.path.exists(tmp):
        os.remove(tmp)
    # 밀어도 한 쪽에 안 들어가는 표는 갈린 채로 둔다 — 점검기가 이것을 결함으로
    # 세지 않도록 규칙 파일에 남긴다(2026-09-11).
    conf = json.load(io.open(RULES, encoding='utf-8'))
    conf['split_ok'] = sorted(never)
    io.open(RULES, 'w', encoding='utf-8').write(
        json.dumps(conf, ensure_ascii=False, indent=1))


def pull_table_forward(rounds=2, waste_mm=80.0):
    """**쓰지 않는다.** 앞 쪽이 빈 자리로 뒤 표를 당기려 했으나 역효과였다.

    22쪽의 165mm 를 회수하려고 표 12 앞에 쪽 나누기를 넣었더니 표 11 은 당겨지지
    않고 뒤가 밀려 33쪽이 35쪽이 됐다(2026-09-10). 빈 자리가 넷에서 여섯으로 늘었다.
    한글은 표를 앞 쪽으로 당기지 않는다 — 쪽 나누기는 뒤로 미는 일만 한다.
    되살리려면 넣은 뒤 쪽수와 빈 자리를 재서 나빠지면 물리는 장치가 먼저 필요하다.

    원래 뜻: 앞 쪽이 크게 비었는데 표 둘이 다음 쪽에 함께 밀린 자리를 푼다.

    22쪽에 표 10 하나만 있고 아래가 165mm 비었다 — 표 11 과 표 12 가 함께 23쪽으로
    갔기 때문이다(2026-09-10 소유자 지적). 뒤 표 앞에 쪽 나누기를 넣으면 앞 표는
    빈 자리로 당겨진다. 앞 표까지 밀려 손해가 되면 되돌린다.
    """
    import fitz
    if not os.path.exists(RULES):
        return
    tbls = [t for t in json.load(io.open(RULES, encoding='utf-8')).get('tbls', [])
            if t.get('cap')]
    if len(tbls) < 2:
        return
    tmp = os.path.join(BASE, '_pullcheck.pdf')
    for _ in range(rounds):
        h = _hwp()
        h.Open(OUT, 'HWP', 'forceopen:true')
        if os.path.exists(tmp):
            os.remove(tmp)
        h.SaveAs(tmp, 'PDF', '')
        h.Clear(1)
        h.Quit()
        d = fitz.open(tmp)
        pages = [pg.get_text() for pg in d]
        gaps = []
        for pg in d:
            b = [x for x in pg.get_text('blocks') if x[4].strip()
                 and x[3] / MM_PT > 26 and x[1] / MM_PT < 258]
            low = max([x[3] for x in b] or [0])
            gaps.append(pg.rect.height / MM_PT - low / MM_PT - 32.0)
        d.close()
        os.remove(tmp)
        move = None
        for i, gap in enumerate(gaps[:-1]):
            if gap < waste_mm:
                continue
            here = [t for t in tbls if t['cap'][:14] in pages[i + 1]]
            if len(here) >= 2:
                move = here[1]['cap']
                break
        if not move:
            print('앞으로 당길 표 없음')
            return
        h = _hwp()
        h.Open(OUT, 'HWP', 'forceopen:true')
        if _find(h, move[:20]):
            h.HAction.Run('BreakPage')
            h.SaveAs(OUT, 'HWP', '')
            print('「%s」 앞에 쪽 나누기 — 앞 표를 당긴다' % move[:20])
        h.Clear(1)
        h.Quit()


def appendix_head():
    """부록 제목의 앞머리를 원고에서 읽는다.

    '부록' 두 글자만 찾으면 본문의 「…부록에 제시하였다」·「(부록 표 1)」이 먼저
    걸린다. 그 자리에 쪽 나누기가 들어가 11쪽이 186mm 비었다(2026-09-11,
    F-324). 제목 줄 전체를 쓰면 본문 언급과 겹치지 않는다.
    """
    md = os.path.join(BASE, 'EASWA_논문_v18.md')
    if os.path.exists(md):
        for ln in io.open(md, encoding='utf-8'):
            t = ln.strip().lstrip('#').strip()
            if ln.startswith('#') and t.startswith('부록'):
                return t[:18]
    return '부록. '


def place_appendix_break(head=None, min_lines=14):
    """부록을 새 쪽에서 시작시킨다 — 앞 쪽이 거의 비지 않을 때만.

    조건 없이 밀었더니 참고문헌 마지막 한 줄만 있는 쪽이 생겼다(2026-09-10,
    28쪽이 241mm 비었다). 한 줄 때문에 한 쪽을 버리지 않는다. 저장한 hwp 를
    PDF 로 재서 그 쪽에 몇 줄이 남는지 세고 판단한다.
    """
    import fitz
    head = head or appendix_head()
    tmp = os.path.join(BASE, '_appendix.pdf')
    h = _hwp()
    h.Open(OUT, 'HWP', 'forceopen:true')
    if os.path.exists(tmp):
        os.remove(tmp)
    h.SaveAs(tmp, 'PDF', '')
    h.Clear(1)
    h.Quit()
    before = None
    d = fitz.open(tmp)
    for pg in d:
        lines = [x.strip() for x in pg.get_text().splitlines() if x.strip()]
        for k, l in enumerate(lines):
            if l.startswith(head):
                before = k
                break
        if before is not None:
            break
    d.close()
    os.remove(tmp)
    if before is None:
        print('  ! 부록을 찾지 못해 쪽 나누기를 넣지 않았다')
        return
    # 머리말 두 줄과 쪽 번호 한 줄은 본문이 아니다
    body_before = max(0, before - 3)
    if body_before == 0:
        print('부록은 이미 새 쪽에서 시작한다')
        return
    if body_before < min_lines:
        print('부록 앞에 %d줄만 남아 쪽을 나누지 않는다 (한 쪽을 버리지 않는다)' % body_before)
        return
    h = _hwp()
    h.Open(OUT, 'HWP', 'forceopen:true')
    break_before(h, head, '부록')
    h.SaveAs(OUT, 'HWP', '')
    h.Clear(1)
    h.Quit()


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

    set_header(h)
    set_pagenum(h)
    place_figures(h)
    fit_tables(h)
    apply_para_rules(h)
    place_footnote(h)
    break_section(h, 'Ⅰ. 서론', '서론')
    print('%d쪽' % h.PageCount)

    global OUT
    OUT = free_path(OUT)
    ok = h.SaveAs(OUT, 'HWP', '')
    h.Clear(1)
    h.Quit()
    if not (ok and os.path.exists(OUT)):
        sys.exit('저장 실패')
    print('저장 완료 — %s (%.1f MB)' % (OUT, os.path.getsize(OUT) / 1e6))


def keep_word(h):
    """줄이 넘어갈 때 **어절 단위**로 끊게 한다 — 문서 전체에.

    한글 문단 모양 「확장 → 줄 나눔 기준 → 한글: 어절」이다. HTML 을 읽어 온
    문단은 글자 단위(`BreakNonLatinWord=1`)라 낱말 한가운데서 갈렸다 — 초록에서
    「공 / 공 천문자료」·「설계 원 / 리로」처럼 갈린 자리가 192군데였다
    (2026-09-12 소유자 지적).

    **hwpx 의 `breakNonLatinWord` 속성만으로는 안 된다.** 그 속성을 KEEP_WORD 로
    고쳐도 한글이 읽어 들이면 문단 모양은 그대로 1(글자)이었다. 한글 자신에게
    시켜야 바뀐다. 온 문서를 잡고 이 항목 하나만 바꾸면 정렬·들여쓰기·줄 간격은
    그대로 남는다(실측 — 장제목 가운데 정렬·참고문헌 내어쓰기·줄 간격 15.94pt
    모두 같았다).

    **쪽수가 는다** — 한 줄에 덜 들어가므로 32쪽이 33쪽이 됐다. 그래서 쪽 나누기를
    정하기 **전에** 준다.
    """
    h.HAction.Run('SelectAll')
    t = h.HParameterSet.HParaShape
    h.HAction.GetDefault('ParagraphShape', t.HSet)
    t.BreakNonLatinWord = 0
    h.HAction.Execute('ParagraphShape', t.HSet)
    h.HAction.Run('Cancel')
    print('줄 나눔을 어절 단위로 — 본문 · %d쪽' % h.PageCount)
    print('  표 안 %d칸 · %d쪽' % (keep_word_cells(h), h.PageCount))


def keep_word_cells(h):
    """표 안에도 같은 것을 준다 — 칸을 하나씩 돌면서.

    `SelectAll` 은 표 **바깥** 문단만 잡는다. 표를 `FindCtrl` 로 잡아도 문단
    모양은 표를 품은 문단에 걸릴 뿐 칸 안까지 가지 않는다(2026-09-12 실측 —
    표 8개에 걸었는데 갈린 자리가 36 그대로였다). hwpx 의
    `breakNonLatinWord` 속성을 고치는 길도 막혀 있다 — 한글이 hwp 로 되돌릴 때
    그 값을 버린다(같은 날 실측, 열한 군데를 고쳐도 PDF 가 한 글자도 안 바뀌었다).
    남은 길은 칸마다 캐럿을 옮기며 주는 것뿐이고, 200칸에 4초 걸린다.
    """
    n = 0
    c = h.HeadCtrl
    while c:
        if c.CtrlID == 'tbl':
            h.SetPosBySet(c.GetAnchorPos(0))
            h.FindCtrl()
            h.HAction.Run('ShapeObjTableSelCell')
            h.HAction.Run('Cancel')
            seen = set()
            while True:
                pos = h.GetPos()
                if pos in seen or len(seen) > 400:
                    break
                seen.add(pos)
                t = h.HParameterSet.HParaShape
                h.HAction.GetDefault('ParagraphShape', t.HSet)
                if t.BreakNonLatinWord != 0:
                    t.BreakNonLatinWord = 0
                    h.HAction.Execute('ParagraphShape', t.HSet)
                    n += 1
                if not h.HAction.Run('TableRightCell'):
                    break
            h.HAction.Run('Cancel')
        c = c.Next
    return n


def apply_align(h):
    """가운데 정렬을 **다시** 준다.

    `hwpx_styles.py` 의 간격 문단 걷어내기를 지나면 표제부의 한 줄짜리 문단
    (이름·요약타이틀)이 양쪽 정렬로 돌아간다 — `make_hwp.py` 직후에는 가운데(3)인데
    그 단계 뒤에는 0 이다(2026-09-12 실측). 배치를 바꾸는 단계가 다 끝난 뒤에
    한 번 더 준다.
    """
    if not os.path.exists(RULES):
        return
    items = [it for it in json.load(io.open(RULES, encoding='utf-8'))['paras']
             if it.get('align') == 'center']
    n = 0
    for it in items:
        if _find(h, it['t']):
            h.HAction.Run('ParagraphShapeAlignCenter')
            n += 1
    print('가운데 정렬 %d개 다시 적용' % n)


def after_styles(path):
    """쪽 나누기는 **스타일을 손본 뒤에** 정한다.

    `hwpx_styles.py` 의 `drop_gaps` 가 간격용 빈 문단 45개를 지우고 그 값을 문단
    위 간격으로 옮기면 쪽나눔 자리가 통째로 달라진다. 그 앞에서 재고 판단하면
    필요 없는 쪽 나누기가 남는다 — 표 5 앞에 넣은 것 때문에 20쪽이 153mm
    비었다(2026-09-11). 그래서 이 셋은 스타일 단계 뒤로 뺐다.

        typeset_hwp → make_hwp → hwpx_styles → **make_hwp --쪽나눔** →
        hwpx_headers → save_pdf
    """
    global OUT
    OUT = path
    h = _hwp()
    h.Open(OUT, 'HWP', 'forceopen:true')
    keep_word(h)
    apply_align(h)
    h.SaveAs(OUT, 'HWP', '')
    h.Clear(1)
    h.Quit()
    place_appendix_break()
    fix_split_tables()
    fix_widow_headings()


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--쪽나눔':
        after_styles(sys.argv[2])
    else:
        main()
