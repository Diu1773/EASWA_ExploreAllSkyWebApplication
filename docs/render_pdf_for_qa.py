# -*- coding: utf-8 -*-
"""PDF 전쪽 PNG와 8쪽 단위 contact sheet를 만들어 시각 검수한다."""

from __future__ import annotations

import os
import sys

import fitz
from PIL import Image, ImageDraw, ImageFont


def main():
    if len(sys.argv) != 3:
        sys.exit("PDF와 출력 폴더를 지정한다")
    source = os.path.abspath(sys.argv[1])
    out_dir = os.path.abspath(sys.argv[2])
    os.makedirs(out_dir, exist_ok=True)

    pdf = fitz.open(source)
    page_paths = []
    matrix = fitz.Matrix(1.8, 1.8)
    for index, page in enumerate(pdf):
        target = os.path.join(out_dir, "page-%02d.png" % (index + 1))
        page.get_pixmap(matrix=matrix, alpha=False).save(target)
        page_paths.append(target)

    thumb_w, thumb_h = 280, 380
    gap, label_h = 18, 28
    sheet_w = gap + 4 * (thumb_w + gap)
    sheet_h = gap + 2 * (thumb_h + label_h + gap)
    font = ImageFont.load_default()
    for start in range(0, len(page_paths), 8):
        sheet = Image.new("RGB", (sheet_w, sheet_h), "#d9d9d9")
        draw = ImageDraw.Draw(sheet)
        for offset, path in enumerate(page_paths[start : start + 8]):
            row, col = divmod(offset, 4)
            x = gap + col * (thumb_w + gap)
            y = gap + row * (thumb_h + label_h + gap)
            page = Image.open(path).convert("RGB")
            page.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
            px = x + (thumb_w - page.width) // 2
            py = y + label_h + (thumb_h - page.height) // 2
            sheet.paste(page, (px, py))
            label = "PAGE %d" % (start + offset + 1)
            draw.text((x, y + 6), label, fill="black", font=font)
        sheet.save(os.path.join(out_dir, "contact-%02d.png" % (start // 8 + 1)))

    print("%d쪽 렌더링 · contact sheet %d장 · %s" % (len(pdf), (len(pdf) + 7) // 8, out_dir))


if __name__ == "__main__":
    main()
