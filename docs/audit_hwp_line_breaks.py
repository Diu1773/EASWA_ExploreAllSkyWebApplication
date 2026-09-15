# -*- coding: utf-8 -*-
"""최종 HWP의 모든 보이는 문단에서 한글 줄 나눔 값을 전수 집계한다."""

from __future__ import annotations

import collections
import os
import sys
import tempfile

from check_hwp_template_contract import NS, load, paragraph_excerpt, to_hwpx


def main():
    if len(sys.argv) != 2:
        sys.exit("검사할 HWP 경로 하나를 지정한다")
    source = os.path.abspath(sys.argv[1])
    if not os.path.exists(source):
        sys.exit("HWP가 없다: %s" % source)

    with tempfile.TemporaryDirectory(prefix="easwa_break_audit_") as folder:
        hwpx = os.path.join(folder, "target.hwpx")
        pages = to_hwpx(source, hwpx)
        _, _, paras, styles, _, sections = load(hwpx)

    counts = collections.Counter()
    non_character_break = []
    visible = 0
    for root in sections:
        for paragraph in root.xpath('.//*[local-name()="p"]'):
            excerpt = paragraph_excerpt(paragraph)
            if excerpt == "<빈 문단>":
                continue
            visible += 1
            style = styles.get(paragraph.get("styleIDRef"))
            style_name = style.get("name") if style is not None else "<스타일 없음>"
            actual = paras.get(paragraph.get("paraPrIDRef"))
            setting = actual.find("hh:breakSetting", NS) if actual is not None else None
            value = setting.get("breakNonLatinWord") if setting is not None else "<없음>"
            counts[(style_name, value)] += 1
            if value != "KEEP_WORD":
                non_character_break.append((style_name, value, excerpt))

    print("%d쪽 · 보이는 문단 %d개" % (pages, visible))
    for (style_name, value), count in sorted(counts.items()):
        print("%s\t%s\t%d" % (style_name, value, count))
    print("글자 단위(KEEP_WORD) 아닌 보이는 문단 %d개" % len(non_character_break))
    for style_name, value, excerpt in non_character_break:
        print("  %s\t%s\t%s" % (style_name, value, excerpt))


if __name__ == "__main__":
    main()
