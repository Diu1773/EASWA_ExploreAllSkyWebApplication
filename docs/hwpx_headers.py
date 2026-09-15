# -*- coding: utf-8 -*-
"""투고본의 머리말을 학회 템플릿처럼 세 종류로 넣는다 (HWPX 경유).

템플릿은 1쪽에 「| 연구논문 |」과 학회지명을 한 줄에 두고, 2쪽부터는 홀수 쪽에
학회지명, 짝수 쪽에 논문 제목을 넣는다. **한글 COM 으로는 이것을 만들 수 없다** —
`HeaderFooter` 액션에 `ApplyClass`·`WhichPage`·`Where` 를 무엇으로 줘도 머리말
컨트롤이 하나만 생기고 마지막 것이 앞의 것을 덮는다(2026-09-10 확인).

HWPX 는 ZIP + XML 이라 머리말이 이렇게 보인다.

    <hp:ctrl><hp:header id="1" applyPageType="ODD"> … </hp:header></hp:ctrl>

`applyPageType` 이 BOTH·ODD·EVEN 세 값을 갖고, 같은 구역에 머리말 컨트롤을 둘
넣으면 한글이 홀수·짝수를 나눠 찍는다. 그래서 이 스크립트는 hwp 를 hwpx 로 바꾸고,
머리말 컨트롤을 복제해 값을 바꾼 뒤 다시 hwp 로 되돌린다.

1쪽만 다른 머리말은 **구역**으로 가른다. `make_hwp.py` 의 `break_section` 이 서론
앞에서 구역을 나누므로 section0 이 표제부, section1 이 본문이다.

    python -X utf8 docs/hwpx_headers.py

한글 2022(12.0)에서 확인했다. HWPX 왕복은 서식을 보존하지만, 돌린 뒤에는
`docs/save_pdf.py` 와 `docs/check_typeset.py` 로 반드시 다시 확인한다.
"""
import html
import io
import os
import re
import sys
import zipfile

import win32com.client as win32

BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
HWP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, "EASWA_논문_v23_투고본.hwp")
HWPX = os.path.join(BASE, "_투고본_머리말.hwpx")
MD = os.path.join(BASE, "EASWA_논문_v23.md")

LEFT = "| 연구논문 |"          # 템플릿 1쪽 왼쪽
JOURNAL = "현장과학교육 권(호)"   # 템플릿 홀수 쪽
TAB = '<hp:tab width="0" leader="0" type="0"/>'   # 1쪽에서 둘 사이를 벌린다


def paper_title():
    """원고 첫 줄의 제목. 머리말에 넣기에 길면 부제를 떼어 낸다."""
    first = io.open(MD, encoding="utf-8").readline()
    t = re.sub(r"^#\s+", "", first).strip()
    return t


def _hwp():
    h = win32.Dispatch("HWPFrame.HwpObject")
    try:
        h.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
    except Exception:
        pass
    h.XHwpWindows.Item(0).Visible = False
    return h


def to_hwpx(src, dst):
    h = _hwp()
    if not h.Open(src, "HWP", "forceopen:true"):
        h.Quit()
        sys.exit("한글 파일을 열지 못했다 — %s" % src)
    if os.path.exists(dst):
        os.remove(dst)
    ok = h.SaveAs(dst, "HWPX", "")
    n = h.PageCount
    h.Clear(1)
    h.Quit()
    if not ok:
        sys.exit("HWPX 저장 실패")
    return n


def to_hwp(src, dst):
    h = _hwp()
    if not h.Open(src, "HWPX", "forceopen:true"):
        h.Quit()
        sys.exit("HWPX 를 열지 못했다")
    try:
        os.remove(dst)
    except FileNotFoundError:
        pass
    except PermissionError:
        dst = dst[:-4] + "_새판.hwp"
        print("  ! 원본이 한글에서 열려 있다 — %s 로 저장한다" % os.path.basename(dst))
    ok = h.SaveAs(dst, "HWP", "")
    n = h.PageCount
    h.Clear(1)
    h.Quit()
    if not ok:
        sys.exit("한글 저장 실패")
    return dst, n


def header_ctrls(xml):
    """머리말 컨트롤 전부의 (시작, 끝) 목록. 문서 순서대로."""
    out, i = [], 0
    while True:
        hs = xml.find("<hp:header", i)
        if hs < 0:
            return out
        he = xml.index("</hp:header>", hs) + len("</hp:header>")
        cs = xml.rindex("<hp:ctrl>", 0, hs)
        ce = xml.index("</hp:ctrl>", he) + len("</hp:ctrl>")
        out.append((cs, ce))
        i = ce


def retext(ctrl, text, apply_to, new_id):
    """머리말 컨트롤의 텍스트·적용 쪽·정렬을 바꾼다.

    텍스트 요소 안에는 탭 컨트롤이 섞여 있다 —
    `<hp:t>| 연구논문 |<hp:tab …/>…현장과학교육 권(호)</hp:t>`.
    그래서 `[^<]*` 로 잡으면 통째로 빗나간다(2026-09-10, 텍스트가 안 바뀌었다).
    """
    out = re.sub(r'applyPageType="[^"]*"', 'applyPageType="%s"' % apply_to, ctrl)
    out = re.sub(r'<hp:header id="\d+"', '<hp:header id="%d"' % new_id, out)
    # text 에 <hp:tab/> 이 섞여 올 수 있다. 태그는 그대로 두고 글자만 이스케이프한다.
    body = "".join(p if p.startswith("<hp:tab") else html.escape(p)
                   for p in re.split(r"(<hp:tab[^>]*/>)", text))
    out = re.sub(r"<hp:t>.*?</hp:t>", lambda _m: "<hp:t>%s</hp:t>" % body,
                 out, count=1, flags=re.S)
    return out


def hide_note_number(xml):
    """각주 번호를 안 보이게 한다 — 제목 뒤의 「1)」과 쪽 아래의 「1) 」.

    교신저자·심사판정 두 줄은 각주로 달아야 1쪽 맨 아래에 붙는다. 그런데 각주를
    달면 제목 끝에 번호가 붙는다(2026-09-12 소유자 지적). 템플릿은 쪽 아래에
    번호 없이 「*교신저자…」로 시작한다 — 번호 모양을 사용자 기호로 두고 기호를
    비워 둔 것이다. 여기서도 같게 만든다.

    한글 COM 의 `FootnoteShape` 로는 안 된다. `NumberFormat` 을 0~13 무엇으로
    줘도 결과가 「1)」 그대로였다(같은 날 열네 값을 다 시험했다). XML 은 먹는다.
    """
    def fix(m):
        blk = m.group(0)
        blk = blk.replace('type="DIGIT"', 'type="USER_CHAR"')
        # 기호를 빈칸 하나로 두면 각주 줄이 2mm 들여쓴 채 찍힌다. 빈 문자열이라야
        # 템플릿처럼 왼쪽 끝에서 「*교신저자」가 시작한다(2026-09-12 실측).
        blk = re.sub(r'userChar="[^"]*"', 'userChar=""', blk)
        return blk.replace('suffixChar=")"', 'suffixChar=""')

    xml = re.sub(r"<hp:footNotePr>.*?</hp:footNotePr>", fix, xml, flags=re.S)
    # 각주마다 제 번호와 괄호를 들고 있다 — 41 은 ')' 의 문자 번호다
    xml = re.sub(r'(<hp:footNote [^>]*?)suffixChar="41"', r'\1suffixChar="0"', xml)
    return xml


def main():
    if not os.path.exists(HWP):
        sys.exit("투고본 한글 파일이 없다 — 먼저 docs/make_hwp.py 를 돌린다")
    pages = to_hwpx(HWP, HWPX)
    title = paper_title()

    z = zipfile.ZipFile(HWPX)
    names = z.namelist()
    data = {n: z.read(n) for n in names}
    z.close()

    secs = sorted(n for n in names if re.search(r"section\d+\.xml$", n))
    if not secs:
        sys.exit("HWPX 에서 구역을 찾지 못했다")
    print("구역 %d개 · %d쪽" % (len(secs), pages))

    # 구역을 나누면 새 구역은 머리말을 물려받지 않는다. 첫 구역의 컨트롤을 본으로 쓴다.
    model = None
    for name in secs:
        x = data[name].decode("utf-8")
        cs = header_ctrls(x)
        if cs:
            model = x[cs[0][0]:cs[0][1]]
            break
    if model is None:
        sys.exit("머리말이 어느 구역에도 없다 — make_hwp.py 의 set_header 를 먼저 돌린다")

    for k, name in enumerate(secs):
        xml = data[name].decode("utf-8")
        # 여러 번 돌려도 같은 결과가 되도록 기존 머리말을 모두 지우고 새로 넣는다
        spans = header_ctrls(xml)
        at = spans[0][0] if spans else (
            xml.index("</hp:ctrl>", xml.index("</hp:secPr>")) + len("</hp:ctrl>"))
        for cs, ce in reversed(spans):
            if cs < at:
                at -= 0            # 앞쪽 것을 지워도 삽입 지점은 그 자리다
            xml = xml[:cs] + xml[ce:]
        if k == 0 and len(secs) > 1:
            # 표제부 구역 — 템플릿 1쪽과 같이 왼쪽 표시와 학회지명을 한 줄에.
            # 탭 컨트롤은 본에 그대로 남아 있으므로 텍스트만 갈아 끼운다.
            new = retext(model, LEFT + TAB * 4 + JOURNAL, "BOTH", 1)
            xml = xml[:at] + new + xml[at:]
            print("  1쪽 구역: 「%s … %s」" % (LEFT, JOURNAL))
        else:
            # 가운데로 보내는 일은 탭이 한다. 문단 모양을 바꾸면 머리말 문단이
            # 본문 스타일을 물고 와 크기까지 달라진다. 1쪽에서 탭 넷이 x93 —
            # 템플릿의 홀수 쪽 x89.9 와 3mm 차이라 그대로 쓴다(2026-09-10 실측).
            # 홀수 쪽은 탭 다섯으로 가운데(x92) — 템플릿 x89.9. 짝수 쪽 제목은
            # 폭을 거의 다 쓰므로 탭을 넣으면 한 글자가 다음 줄로 넘친다.
            odd = retext(model, TAB * 5 + JOURNAL, "ODD", 1)
            even = retext(model, title, "EVEN", 2)
            xml = xml[:at] + odd + even + xml[at:]
            print("  본문 구역: 홀수 「%s」 · 짝수 「%s…」" % (JOURNAL, title[:26]))
        note = xml.count("<hp:footNote ")
        xml = hide_note_number(xml)
        if note:
            print("  각주 %d개의 번호를 안 보이게 — 제목 뒤 「1)」" % note)
        data[name] = xml.encode("utf-8")

    os.remove(HWPX)
    zo = zipfile.ZipFile(HWPX, "w", zipfile.ZIP_DEFLATED)
    for n in names:
        zo.writestr(n, data[n],
                    zipfile.ZIP_STORED if n == "mimetype" else zipfile.ZIP_DEFLATED)
    zo.close()

    out, n = to_hwp(HWPX, HWP)
    os.remove(HWPX)
    print("저장 완료 — %s · %d쪽" % (os.path.basename(out), n))


if __name__ == "__main__":
    main()
