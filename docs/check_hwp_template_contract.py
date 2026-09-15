# -*- coding: utf-8 -*-
"""투고본의 스타일 정의와 실제 문단이 학회 HWP 템플릿과 같은지 검사한다.

PDF가 비슷하게 보이는지만으로는 한글의 스타일 편집 창에 남은 글꼴·장평·자간과
문단 여백을 확인할 수 없다. 이 검사는 HWP를 HWPX로 다시 저장한 뒤 스타일 정의,
실제 글자 run, 실제 문단, 표 셀의 스타일 이름을 모두 비교한다.

    python -X utf8 docs/check_hwp_template_contract.py 투고본.hwp
"""

import os
import re
import sys
import tempfile
import zipfile

from lxml import etree
import win32com.client as win32


TEMPLATE = r"C:\Users\bmffr\Downloads\논문템플릿.hwp"
NS = {
    "hh": "http://www.hancom.co.kr/hwpml/2011/head",
    "hp": "http://www.hancom.co.kr/hwpml/2011/paragraph",
    "hc": "http://www.hancom.co.kr/hwpml/2011/core",
}
STYLES = (
    "한글제목", "한글이름", "한글소속", "영문제목", "영문이름", "영문소속",
    "요약타이틀", "국문초록", "장제목", "소제목", "본문", "참고문헌",
    "표제목", "그림제목", "표내용", "각주",
)


def to_hwpx(source, target):
    hwp = win32.DispatchEx("HWPFrame.HwpObject")
    try:
        try:
            hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
        except Exception:
            pass
        hwp.XHwpWindows.Item(0).Visible = False
        if not hwp.Open(source, "HWP", "forceopen:true"):
            raise RuntimeError("한글 파일을 열지 못했다: %s" % source)
        if not hwp.SaveAs(target, "HWPX", ""):
            raise RuntimeError("HWPX 저장에 실패했다: %s" % source)
        pages = hwp.PageCount
        hwp.Clear(1)
        return pages
    finally:
        hwp.Quit()


def load(path):
    with zipfile.ZipFile(path) as archive:
        header = etree.fromstring(archive.read("Contents/header.xml"))
        sections = [
            etree.fromstring(archive.read(name))
            for name in sorted(archive.namelist())
            if re.search(r"section\d+\.xml$", name)
        ]
    fonts = {
        box.get("lang"): {
            font.get("id"): font.get("face")
            for font in box
            if etree.QName(font).localname == "font"
        }
        for box in header.xpath('.//*[local-name()="fontface"]')
    }
    chars = {
        item.get("id"): item
        for item in header.xpath('.//*[local-name()="charPr"]')
    }
    paras = {
        item.get("id"): item
        for item in header.xpath('.//*[local-name()="paraPr"]')
    }
    styles_by_id = {
        item.get("id"): item
        for item in header.xpath('.//*[local-name()="style"]')
    }
    styles_by_name = {
        item.get("name"): item for item in styles_by_id.values() if item.get("name")
    }
    return fonts, chars, paras, styles_by_id, styles_by_name, sections


def char_signature(item, fonts, semantic=True):
    font_ref = item.find("hh:fontRef", NS)
    ratio = item.find("hh:ratio", NS)
    spacing = item.find("hh:spacing", NS)
    out = (
        item.get("height"),
        fonts["HANGUL"][font_ref.get("hangul")],
        fonts["LATIN"][font_ref.get("latin")],
        tuple(ratio.attrib.values()),
        tuple(spacing.attrib.values()),
    )
    if semantic:
        out += (
            item.find("hh:bold", NS) is not None,
            item.find("hh:italic", NS) is not None,
        )
    return out


def para_signature(item):
    align = item.find("hh:align", NS)
    setting = item.find("hh:breakSetting", NS)
    case = item.find("hp:switch/hp:case", NS)
    margin = case.find("hh:margin", NS)
    spacing = case.find("hh:lineSpacing", NS)
    return (
        align.get("horizontal"),
        *[
            margin.find("hc:" + name, NS).get("value")
            for name in ("intent", "left", "right", "prev", "next")
        ],
        spacing.get("type"),
        spacing.get("value"),
        item.get("condense"),
        item.get("tabPrIDRef"),
        setting.get("breakNonLatinWord"),
    )


def actual_para_signature(item):
    """쪽걸침·번호·표 셀 정렬·한글 줄 나눔을 뺀 스타일 계약을 비교한다.

    한글 줄 나눔은 템플릿 스타일의 기본값을 복제하지 않고, 같은 학회 게재본과
    소유자 확정에 따라 실제 문단에 글자 단위로 직접 준다. 아래 본문 순회에서
    ``KEEP_WORD``인지 별도로 검사한다. 한글 2022에서 COM
    ``BreakNonLatinWord=1``을 적용한 뒤 HWPX로 내보내면 이 값이 기록된다.
    """
    full = para_signature(item)
    return full[4:-1]  # prev·next·줄간격·condense·tab


def in_ancestor(element, name):
    return any(etree.QName(x).localname == name for x in element.iterancestors())


def paragraph_excerpt(paragraph, limit=60):
    text = "".join(paragraph.itertext()).replace("\n", " ").strip()
    return text[:limit] or "<빈 문단>"


def main():
    if len(sys.argv) < 2:
        sys.exit("검사할 HWP 경로를 지정해야 한다")
    target = os.path.abspath(sys.argv[1])
    if not os.path.exists(target):
        sys.exit("투고본을 찾지 못했다: %s" % target)
    if not os.path.exists(TEMPLATE):
        sys.exit("템플릿을 찾지 못했다: %s" % TEMPLATE)

    with tempfile.TemporaryDirectory(prefix="easwa_style_") as folder:
        target_x = os.path.join(folder, "target.hwpx")
        template_x = os.path.join(folder, "template.hwpx")
        pages = to_hwpx(target, target_x)
        to_hwpx(TEMPLATE, template_x)
        dst = load(target_x)
        tpl = load(template_x)

    bad = []
    for name in STYLES:
        if name not in dst[4] or name not in tpl[4]:
            bad.append("스타일 이름 없음: %s" % name)
            continue
        ds, ts = dst[4][name], tpl[4][name]
        if char_signature(dst[1][ds.get("charPrIDRef")], dst[0]) != char_signature(
            tpl[1][ts.get("charPrIDRef")], tpl[0]
        ):
            bad.append("스타일 글자 모양 불일치: %s" % name)
        if para_signature(dst[2][ds.get("paraPrIDRef")]) != para_signature(
            tpl[2][ts.get("paraPrIDRef")]
        ):
            bad.append("스타일 문단 모양 불일치: %s" % name)

    checked_paras = 0
    checked_runs = 0
    table_wrong = 0
    character_break_wrong = 0
    character_break_samples = []
    for root in dst[5]:
        for even in root.xpath('.//*[local-name()="header" and @applyPageType="EVEN"]'):
            for header_paragraph in even.xpath('.//*[local-name()="p"]'):
                header_para = dst[2].get(header_paragraph.get("paraPrIDRef"))
                align = header_para.find("hh:align", NS) if header_para is not None else None
                if align is None or align.get("horizontal") != "CENTER":
                    bad.append("짝수 쪽 논문 제목 머리말이 가운데 정렬이 아님")
        for paragraph in root.xpath('.//*[local-name()="p"]'):
            style = dst[3].get(paragraph.get("styleIDRef"))
            name = style.get("name") if style is not None else None
            if in_ancestor(paragraph, "tc") and name != "표내용":
                table_wrong += 1
            if name not in STYLES:
                continue
            checked_paras += 1
            base_para = dst[2][style.get("paraPrIDRef")]
            actual_para = dst[2][paragraph.get("paraPrIDRef")]
            # 표 제목 위 10pt, 표 다음 문단 위 10pt, 그림 캡션 뒤 8pt는 스타일
            # 정의를 바꾸지 않고 실제 문단에만 적용한다. 허용 범위를 넓히지 않고
            # 문맥에 따라 세 값을 정확히 검사한다.
            actual = actual_para_signature(actual_para)
            expected = list(actual_para_signature(base_para))
            contains_table = bool(paragraph.xpath('.//*[local-name()="tbl"]'))
            previous = paragraph.getprevious()
            follows_table = (
                previous is not None
                and etree.QName(previous).localname == "p"
                and bool(previous.xpath('.//*[local-name()="tbl"]'))
            )
            if name == "표제목" and not contains_table:
                expected[0] = "1000"
            if follows_table:
                expected[0] = "1000"
            if name == "그림제목":
                expected[1] = "800"
            expected = tuple(expected)
            if actual != expected:
                bad.append("실제 문단 모양 불일치: %s" % name)
            break_setting = actual_para.find("hh:breakSetting", NS)
            break_value = break_setting.get("breakNonLatinWord") if break_setting is not None else None
            if break_value != "KEEP_WORD":
                character_break_wrong += 1
                if len(character_break_samples) < 10:
                    character_break_samples.append(
                        "%s=%s: %s" % (name, break_value, paragraph_excerpt(paragraph))
                    )
            base_char = dst[1][style.get("charPrIDRef")]
            for run in paragraph.findall("hp:run", NS):
                text = run.find("hp:t", NS)
                if text is None or not "".join(text.itertext()):
                    continue
                checked_runs += 1
                actual_char = dst[1][run.get("charPrIDRef")]
                if char_signature(actual_char, dst[0], semantic=False) != char_signature(
                    base_char, dst[0], semantic=False
                ):
                    bad.append(
                        "실제 글자 모양 불일치: %s: %s"
                        % (name, paragraph_excerpt(paragraph))
                    )
                if name == "그림제목" and char_signature(
                    actual_char, dst[0], semantic=True
                ) != char_signature(base_char, dst[0], semantic=True):
                    bad.append(
                        "그림 캡션 굵기·기울임 불일치: %s"
                        % paragraph_excerpt(paragraph)
                    )
    if table_wrong:
        bad.append("표내용 스타일이 아닌 표 셀 문단: %d" % table_wrong)
    if character_break_wrong:
        bad.append("글자 단위 한글 줄 나눔이 아닌 실제 문단: %d" % character_break_wrong)
        bad.extend("줄 나눔 값: " + item for item in character_break_samples)

    if bad:
        print("템플릿 서식 불일치 %d건" % len(bad))
        for item in sorted(set(bad)):
            print("  -", item)
        return 1
    print(
        "템플릿 서식 일치 — %d쪽 · 스타일 %d개 · 실제 문단 %d개 · 글자 run %d개"
        % (pages, len(STYLES), checked_paras, checked_runs)
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
