# -*- coding: utf-8 -*-
"""PDF 본문 줄의 실제 낱말 간격을 글자 크기로 나누어 큰 순서로 보고한다."""

from __future__ import annotations

import os
import sys

import fitz


def line_gaps(line):
    chars = []
    sizes = []
    for span in line.get("spans", []):
        size = float(span.get("size", 0) or 0)
        for char in span.get("chars", []):
            chars.append(char)
            sizes.append(size)
    records = []
    for index, char in enumerate(chars):
        if char.get("c") != " ":
            continue
        left = index - 1
        while left >= 0 and chars[left].get("c") == " ":
            left -= 1
        right = index + 1
        while right < len(chars) and chars[right].get("c") == " ":
            right += 1
        if left < 0 or right >= len(chars):
            continue
        gap = float(chars[right]["bbox"][0]) - float(chars[left]["bbox"][2])
        size = max(sizes[left], sizes[right], 1.0)
        records.append((gap / size, gap))
    return records


def main():
    if len(sys.argv) != 2:
        sys.exit("검사할 PDF 경로 하나를 지정한다")
    source = os.path.abspath(sys.argv[1])
    pdf = fitz.open(source)
    ranked = []
    for page_index, page in enumerate(pdf):
        data = page.get_text("rawdict")
        for block in data.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                text = "".join(
                    char.get("c", "")
                    for span in line.get("spans", [])
                    for char in span.get("chars", [])
                ).strip()
                gaps = line_gaps(line)
                if not text or not gaps:
                    continue
                ratio, points = max(gaps)
                ranked.append((ratio, points, page_index + 1, text))
    for ratio, points, page, text in sorted(ranked, reverse=True)[:60]:
        print("%02d쪽\t%.2f em\t%.2f pt\t%s" % (page, ratio, points, text[:160]))


if __name__ == "__main__":
    main()
