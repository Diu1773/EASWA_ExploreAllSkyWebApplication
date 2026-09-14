# -*- coding: utf-8 -*-
"""학회 HWP 템플릿의 실제 스타일 계약을 투고본 HWPX에 동기화한다.

HTML에서 만든 HWP는 화면에 보이는 글꼴만 비슷하게 들어가고, 한글의 스타일
정의에는 한컴바탕·장평 100%·자간 0%가 남을 수 있다. 또한 문단마다 직접 서식이
들어가므로 스타일 정의만 고쳐도 이미 놓인 글자는 바뀌지 않는다.

이 모듈은 템플릿과 이름이 같은 스타일의 charPr·paraPr·다음 스타일을 복제하고,
그 스타일을 쓰는 실제 문단과 글자에도 같은 값을 적용한다. 표 안 문단에는
``표내용`` 스타일을 붙이되 기존의 좌·중앙 정렬을 보존하며, 연구문제 번호 문단과
쪽걸침 방지 속성도 유지한다. 본문 문자열과 표·그림·각주 컨트롤에는 손대지 않는다.
"""

from __future__ import annotations

import copy
import os
import re
import sys
import zipfile
from collections import Counter

from lxml import etree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hwpx_headers as H  # noqa: E402


BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
TPL = r"C:\Users\bmffr\Downloads\논문템플릿.hwp"

HH = "http://www.hancom.co.kr/hwpml/2011/head"
HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HC = "http://www.hancom.co.kr/hwpml/2011/core"
NS = {"hh": HH, "hp": HP, "hc": HC}

FONT_LANG = {
    "hangul": "HANGUL",
    "latin": "LATIN",
    "hanja": "HANJA",
    "japanese": "JAPANESE",
    "other": "OTHER",
    "symbol": "SYMBOL",
    "user": "USER",
}

SEMANTIC_TAGS = (
    "bold",
    "italic",
    "emboss",
    "engrave",
    "supscript",
    "subscript",
)


def _read_hwpx(path):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        return names, {name: z.read(name) for name in names}


def _write_hwpx(path, names, data):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for name in names:
            z.writestr(
                name,
                data[name],
                zipfile.ZIP_STORED if name == "mimetype" else zipfile.ZIP_DEFLATED,
            )


def _serialize_xml(root):
    """한글이 만든 HWPX의 선언부까지 보존한다.

    한글 2022는 XML 내용이 유효해도 ``standalone=\"yes\"``가 빠진 HWPX를 열 때
    복구 대화상자를 띄울 수 있다. 숨은 COM에서는 그 대화상자가 보이지 않아 멈춘다.
    """
    body = etree.tostring(root, encoding="utf-8", xml_declaration=False)
    return b'<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + body


def _children(container, local):
    return [x for x in container if etree.QName(x).localname == local]


def _max_id(container, local):
    ids = [
        int(x.get("id"))
        for x in _children(container, local)
        if (x.get("id") or "").isdigit()
    ]
    return max(ids or [-1])


def _update_count(container, local):
    container.set("itemCnt", str(len(_children(container, local))))


def _canonical(element):
    clone = copy.deepcopy(element)
    clone.attrib.pop("id", None)
    return etree.tostring(clone, method="c14n", with_comments=False)


def _by_id(root, local):
    return {
        x.get("id"): x
        for x in root.xpath('.//*[local-name()=$name]', name=local)
        if x.get("id") is not None
    }


def _style_maps(root):
    elems = root.xpath('.//*[local-name()="style"]')
    by_name = {x.get("name"): x for x in elems if x.get("name")}
    by_id = {x.get("id"): x for x in elems if x.get("id")}
    return by_name, by_id


def _font_maps(root):
    containers = {}
    by_id = {}
    by_face = {}
    for ff in root.xpath('.//*[local-name()="fontface"]'):
        lang = ff.get("lang")
        containers[lang] = ff
        by_id[lang] = {}
        by_face[lang] = {}
        for font in _children(ff, "font"):
            by_id[lang][font.get("id")] = font
            by_face[lang].setdefault(font.get("face"), font)
    return containers, by_id, by_face


def _ensure_font(tpl_root, dst_root, lang, font_id):
    _, tpl_by_id, _ = _font_maps(tpl_root)
    dst_cont, _, dst_by_face = _font_maps(dst_root)
    source = tpl_by_id[lang][font_id]
    face = source.get("face")
    if face in dst_by_face[lang]:
        return dst_by_face[lang][face].get("id")

    container = dst_cont[lang]
    new_id = str(_max_id(container, "font") + 1)
    clone = copy.deepcopy(source)
    clone.set("id", new_id)
    container.append(clone)
    # fontface만 개수 속성이 itemCnt가 아니라 fontCnt다. 이 값을 갱신하지 않으면
    # 한글이 뒤에 붙인 글꼴을 무시하고 한컴바탕으로 대체한다.
    container.set("fontCnt", str(len(_children(container, "font"))))
    return new_id


def _import_record(tpl_root, dst_root, container_local, record_local, record_id):
    """ID를 가진 header 레코드를 내용 기준으로 재사용하거나 새로 붙인다."""
    source = _by_id(tpl_root, record_local)[record_id]
    dst_container = dst_root.xpath('.//*[local-name()=$name]', name=container_local)[0]
    wanted = _canonical(source)
    for existing in _children(dst_container, record_local):
        if _canonical(existing) == wanted:
            return existing.get("id")
    new_id = str(_max_id(dst_container, record_local) + 1)
    clone = copy.deepcopy(source)
    clone.set("id", new_id)
    dst_container.append(clone)
    _update_count(dst_container, record_local)
    return new_id


def _append_record(dst_root, container_local, record_local, clone):
    container = dst_root.xpath('.//*[local-name()=$name]', name=container_local)[0]
    new_id = str(_max_id(container, record_local) + 1)
    clone.set("id", new_id)
    container.append(clone)
    _update_count(container, record_local)
    return new_id


def _clone_char(tpl_root, dst_root, source):
    clone = copy.deepcopy(source)
    font_ref = clone.find("hh:fontRef", NS)
    if font_ref is not None:
        for attr, lang in FONT_LANG.items():
            old = font_ref.get(attr)
            if old is not None:
                font_ref.set(attr, _ensure_font(tpl_root, dst_root, lang, old))
    border = clone.get("borderFillIDRef")
    if border is not None:
        clone.set(
            "borderFillIDRef",
            _import_record(tpl_root, dst_root, "borderFills", "borderFill", border),
        )
    return _append_record(dst_root, "charProperties", "charPr", clone)


def _clone_para(tpl_root, dst_root, source):
    clone = copy.deepcopy(source)
    tab = clone.get("tabPrIDRef")
    if tab is not None:
        clone.set(
            "tabPrIDRef",
            _import_record(tpl_root, dst_root, "tabProperties", "tabPr", tab),
        )
    border = clone.find("hh:border", NS)
    if border is not None and border.get("borderFillIDRef") is not None:
        border.set(
            "borderFillIDRef",
            _import_record(
                tpl_root,
                dst_root,
                "borderFills",
                "borderFill",
                border.get("borderFillIDRef"),
            ),
        )
    return _append_record(dst_root, "paraProperties", "paraPr", clone)


def _direct_text(run):
    text = run.find("hp:t", NS)
    return text is not None and "".join(text.itertext()) != ""


def _text_stream(section_roots):
    out = []
    for root in section_roots:
        for t in root.xpath('.//*[local-name()="t"]'):
            out.append("".join(t.itertext()))
    return out


def _semantic_signature(char_pr):
    tags = tuple(
        name for name in SEMANTIC_TAGS if char_pr.find("hh:" + name, NS) is not None
    )
    underline = char_pr.find("hh:underline", NS)
    strike = char_pr.find("hh:strikeout", NS)
    return (
        tags,
        char_pr.get("textColor", "#000000"),
        char_pr.get("shadeColor", "none"),
        etree.tostring(underline)
        if underline is not None and underline.get("type") != "NONE"
        else b"",
        etree.tostring(strike)
        if strike is not None and strike.get("shape") != "NONE"
        else b"",
    )


def _char_variant(dst_root, base, current, cache, style_name):
    signature = _semantic_signature(current)
    key = (style_name, signature)
    if key in cache:
        return cache[key]
    clone = copy.deepcopy(base)
    clone.set("textColor", signature[1])
    clone.set("shadeColor", signature[2])
    for name in SEMANTIC_TAGS:
        old = current.find("hh:" + name, NS)
        have = clone.find("hh:" + name, NS)
        if old is not None and have is None:
            anchor = clone.find("hh:underline", NS)
            clone.insert(
                clone.index(anchor) if anchor is not None else len(clone), copy.deepcopy(old)
            )
    if signature[3]:
        old = current.find("hh:underline", NS)
        have = clone.find("hh:underline", NS)
        if have is not None:
            clone.replace(have, copy.deepcopy(old))
    if signature[4]:
        old = current.find("hh:strikeout", NS)
        have = clone.find("hh:strikeout", NS)
        if have is not None:
            clone.replace(have, copy.deepcopy(old))
    new_id = _append_record(dst_root, "charProperties", "charPr", clone)
    cache[key] = new_id
    return new_id


def _break_flags(para_pr):
    setting = para_pr.find("hh:breakSetting", NS)
    if setting is None:
        return ("0", "0", "0")
    return tuple(
        setting.get(x, "0")
        for x in ("keepWithNext", "keepLines", "pageBreakBefore")
    )


def _heading_signature(para_pr):
    heading = para_pr.find("hh:heading", NS)
    if heading is None or heading.get("type", "NONE") == "NONE":
        return None
    return etree.tostring(heading)


def _margin_values(para_pr):
    case = para_pr.find("hp:switch/hp:case/hh:margin", NS)
    if case is None:
        return None
    values = []
    for name in ("intent", "left", "right"):
        item = case.find("hc:" + name, NS)
        values.append(item.get("value") if item is not None else "0")
    return tuple(values)


def _set_margin_values(clone, values):
    if values is None:
        return
    margins = clone.xpath('.//*[local-name()="margin"]')
    for index, margin in enumerate(margins):
        factor = 1 if index == 0 else 2
        for name, value in zip(("intent", "left", "right"), values):
            item = margin.find("hc:" + name, NS)
            if item is not None:
                item.set("value", str(int(value) * factor))


def _para_variant(dst_root, base, current, cache, style_name, table_cell=False):
    flags = _break_flags(current)
    heading = (
        _heading_signature(current) if style_name in {"본문", "표내용"} else None
    )
    margins = _margin_values(current) if heading is not None or table_cell else None
    align = None
    if table_cell:
        old_align = current.find("hh:align", NS)
        align = old_align.get("horizontal") if old_align is not None else None
    key = (style_name, flags, heading, margins, align)
    if key in cache:
        return cache[key]

    clone = copy.deepcopy(base)
    break_setting = clone.find("hh:breakSetting", NS)
    if break_setting is not None:
        for attr, value in zip(
            ("keepWithNext", "keepLines", "pageBreakBefore"), flags
        ):
            break_setting.set(attr, value)
    if heading is not None:
        old = clone.find("hh:heading", NS)
        if old is not None:
            clone.replace(old, etree.fromstring(heading))
        _set_margin_values(clone, margins)
    elif table_cell:
        _set_margin_values(clone, margins)
    if align is not None:
        target_align = clone.find("hh:align", NS)
        if target_align is not None:
            target_align.set("horizontal", align)

    new_id = _append_record(dst_root, "paraProperties", "paraPr", clone)
    cache[key] = new_id
    return new_id


def _inside(element, local):
    return any(etree.QName(x).localname == local for x in element.iterancestors())


def apply(path, keep, template_hwpx=None):
    """HWPX ``path``에 템플릿 스타일 정의와 실제 문단 서식을 함께 적용한다."""
    if not os.path.exists(TPL):
        raise FileNotFoundError("학회 템플릿을 찾지 못했다: %s" % TPL)

    tpl_hwpx = template_hwpx or os.path.join(BASE, "_스타일_템플릿.hwpx")
    made_template = template_hwpx is None
    if made_template:
        H.to_hwpx(TPL, tpl_hwpx)
    try:
        _, tpl_data = _read_hwpx(tpl_hwpx)
    finally:
        if made_template and os.path.exists(tpl_hwpx):
            os.remove(tpl_hwpx)

    names, data = _read_hwpx(path)
    parser = etree.XMLParser(remove_blank_text=False)
    tpl_root = etree.fromstring(tpl_data["Contents/header.xml"], parser)
    dst_root = etree.fromstring(data["Contents/header.xml"], parser)
    section_names = sorted(
        name for name in names if re.search(r"section\d+\.xml$", name)
    )
    section_roots = [etree.fromstring(data[name], parser) for name in section_names]
    before_text = _text_stream(section_roots)

    tpl_styles, tpl_styles_by_id = _style_maps(tpl_root)
    dst_styles, _ = _style_maps(dst_root)
    tpl_chars = _by_id(tpl_root, "charPr")
    tpl_paras = _by_id(tpl_root, "paraPr")

    matched = [name for name in keep if name in tpl_styles and name in dst_styles]
    base_ids = {}
    for name in sorted(matched):
        source_style = tpl_styles[name]
        char_id = _clone_char(
            tpl_root, dst_root, tpl_chars[source_style.get("charPrIDRef")]
        )
        para_id = _clone_para(
            tpl_root, dst_root, tpl_paras[source_style.get("paraPrIDRef")]
        )
        target_style = dst_styles[name]
        target_style.set("charPrIDRef", char_id)
        target_style.set("paraPrIDRef", para_id)
        for attr in ("engName", "type", "langId", "lockForm"):
            if source_style.get(attr) is None:
                target_style.attrib.pop(attr, None)
            else:
                target_style.set(attr, source_style.get(attr))
        base_ids[name] = (char_id, para_id)

    # 템플릿의 '다음 스타일'도 이름으로 다시 연결한다. 두 문서의 숫자 ID는 다르다.
    tpl_id_to_name = {
        sid: style.get("name") for sid, style in tpl_styles_by_id.items()
    }
    for name in matched:
        source_style = tpl_styles[name]
        next_name = tpl_id_to_name.get(source_style.get("nextStyleIDRef"))
        if next_name in dst_styles:
            dst_styles[name].set(
                "nextStyleIDRef", dst_styles[next_name].get("id")
            )

    dst_chars = _by_id(dst_root, "charPr")
    dst_paras = _by_id(dst_root, "paraPr")
    style_id_to_name = {
        style.get("id"): name for name, style in dst_styles.items()
    }
    char_cache = {}
    para_cache = {}
    counts = Counter()

    for root in section_roots:
        for paragraph in root.xpath('.//*[local-name()="p"]'):
            current_name = style_id_to_name.get(paragraph.get("styleIDRef"))
            table_cell = _inside(paragraph, "tc")
            footnote = _inside(paragraph, "footNote")
            style_name = (
                "표내용" if table_cell else "각주" if footnote else current_name
            )
            if style_name not in base_ids:
                continue
            paragraph.set("styleIDRef", dst_styles[style_name].get("id"))

            current_para = dst_paras.get(paragraph.get("paraPrIDRef"))
            base_para = _by_id(dst_root, "paraPr")[base_ids[style_name][1]]
            if current_para is not None:
                paragraph.set(
                    "paraPrIDRef",
                    _para_variant(
                        dst_root,
                        base_para,
                        current_para,
                        para_cache,
                        style_name,
                        table_cell=table_cell,
                    ),
                )

            # 문단 안의 직접 run만 바꾼다. 표·각주 안 문단은 자체 순회에서 처리한다.
            for run in paragraph.findall("hp:run", NS):
                if not _direct_text(run):
                    continue
                current_char = dst_chars.get(run.get("charPrIDRef"))
                if current_char is None:
                    continue
                base_char = _by_id(dst_root, "charPr")[base_ids[style_name][0]]
                run.set(
                    "charPrIDRef",
                    _char_variant(
                        dst_root, base_char, current_char, char_cache, style_name
                    ),
                )
                counts[style_name + ":run"] += 1
            counts[style_name + ":p"] += 1

    after_text = _text_stream(section_roots)
    if before_text != after_text:
        raise RuntimeError("스타일 동기화 중 본문 문자열이 바뀌었다")

    data["Contents/header.xml"] = _serialize_xml(dst_root)
    for name, root in zip(section_names, section_roots):
        data[name] = _serialize_xml(root)
    _write_hwpx(path, names, data)

    print("템플릿 스타일 정의 %d개 동기화" % len(matched))
    for name in sorted(matched):
        print(
            "  %-8s 문단 %d · 글자 run %d"
            % (name, counts[name + ":p"], counts[name + ":run"])
        )
    print("본문 문자열 %d개 동일" % len(before_text))
    return sorted(matched)
