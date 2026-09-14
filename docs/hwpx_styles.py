# -*- coding: utf-8 -*-
"""스타일 이름 앞의 점을 떼어 학회 템플릿과 같게 만든다 (2026-09-11).

한글은 HTML 을 읽을 때 CSS 클래스 이름을 그대로 스타일 이름으로 쓴다. 그래서
`class="본문"` 은 `.본문` 이 된다 — 이름은 맞는데 점이 붙는다. 템플릿
(`논문템플릿.hwp`)의 스타일은 「본문」·「장제목」·「한글소속」처럼 점이 없다.

이 스크립트는 hwp 를 hwpx 로 바꾸고 header.xml 의 `<hh:style name=".본문">` 에서
앞 점을 떼어 다시 hwp 로 되돌린다. 조판 차례의 마지막에서 두 번째다.

    typeset_hwp.py → make_hwp.py → hwpx_styles.py → hwpx_headers.py → save_pdf.py
"""
import io
import os
import re
import shutil
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hwpx_headers as H                                   # noqa: E402
import hwpx_template_contract as T                          # noqa: E402

BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
HWP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, "EASWA_논문_v22_투고본.hwp")
HWPX = os.path.join(BASE, "_투고본_스타일.hwpx")
# 템플릿에 있는 이름만 점을 뗀다. 컨테이너용 클래스(GAP·FIG·TBL)는 그대로 둔다 —
# 템플릿에 대응이 없어서 이름을 만들면 오히려 낯선 스타일이 생긴다.
KEEP = {"한글제목", "한글이름", "한글소속", "영문제목", "영문이름", "영문소속",
        "요약타이틀", "국문초록", "주제어", "각주", "장제목", "소제목",
        "소제목3", "소제목4", "본문", "참고문헌", "표제목", "그림제목", "인용",
        "표내용"}


def strip_dots(path):
    z = zipfile.ZipFile(path)
    items = {n: z.read(n) for n in z.namelist()}
    z.close()
    hdr = items["Contents/header.xml"].decode("utf-8")
    hit = []

    def fix(m):
        nm = m.group(1)
        if nm.startswith(".") and nm[1:] in KEEP:
            hit.append(nm[1:])
            return 'name="%s"' % nm[1:]
        return m.group(0)

    hdr = re.sub(r'name="([^"]*)"', fix, hdr)
    # 컨테이너용 클래스는 이름만 지운다 — 스타일 목록에 「.GAP」 같은 것이
    # 남으면 템플릿과 다른 파일로 보인다.
    for junk in (".GAP", ".FIG", ".TBL", ".FIGP", ".HDTBL", ".PNLTBL"):
        hdr = hdr.replace('name="%s"' % junk, 'name="바탕글 %s"' % junk[1:].lower())
    items["Contents/header.xml"] = hdr.encode("utf-8")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as out:
        for n, b in items.items():
            out.writestr(n, b)
    return hit


def keep_word(path):
    """**쓰지 않는다.** hwpx 의 `breakNonLatinWord` 는 되돌릴 때 버려진다.

    줄 나눔을 어절 단위로 바꾸려고 이 속성을 고쳐 봤다(2026-09-12). 한글이 hwpx 를
    hwp 로 되돌리면서 그 값을 버린다 — 열한 군데를 고치고 PDF 를 다시 뽑았는데 갈린
    자리가 36 에서 하나도 줄지 않았다. 게다가 이름이 뜻과 거꾸로다: 한글이 내보낸
    파일에서 어절 단위 문단이 `BREAK_WORD`, 글자 단위 문단이 `KEEP_WORD` 로 찍힌다.

    실제로 바꾸는 것은 `make_hwp.py` 의 `break_korean_by_character(h)` 와
    `break_korean_by_character_cells(h)` 다.
    한글에게 직접 시킨다. 이 함수는 같은 길을 다시 시도하지 않도록 남겨 둔다.
    """
    raise NotImplementedError("make_hwp.py 의 break_korean_by_character(h) 를 쓴다")


def drop_gaps(path):
    """간격용 빈 문단을 지우고 그만큼을 다음 문단의 위 간격으로 옮긴다.

    한글이 CSS 여백을 버려서 빈 문단으로 간격을 만들었는데, 템플릿은 문단 모양의
    위 간격을 쓴다. 스타일 목록에 낯선 이름이 남지 않게 여기서 옮긴다.
    구역 정의(`secPr`)나 컨트롤을 품은 문단은 지우지 않는다 — 지우면 판형이 날아간다.
    """
    z = zipfile.ZipFile(path)
    items = {n: z.read(n) for n in z.namelist()}
    z.close()
    hdr = items["Contents/header.xml"].decode("utf-8")
    gid = re.search(r'<hh:style[^>]*?id="(\d+)"[^>]*?name="바탕글 gap"', hdr)
    if not gid:
        return 0, 0
    gid = gid.group(1)
    # 글자 크기(=간격)를 알려면 charPr 의 height 가 필요하다
    chh = {m.group(1): int(m.group(2))
           for m in re.finditer(r'<hh:charPr[^>]*?id="(\d+)"[^>]*?height="(\d+)"', hdr)}
    # 새 paraPr 을 만들 때 쓸 다음 번호
    nxt = max(int(m) for m in re.findall(r'<hh:paraPr[^>]*?id="(\d+)"', hdr)) + 1
    pool = {}                                   # (원본 paraPr, 더할 간격) → 새 id
    added = []
    dropped = moved = 0

    for name in [n for n in items if re.match(r"Contents/section\d+\.xml", n)]:
        sec = items[name].decode("utf-8")
        out, i = [], 0
        pend = 0                                # 다음 문단에 얹을 간격(HWPUNIT)
        for m in re.finditer(r'<hp:p[^>]*?>.*?</hp:p>', sec, re.S):
            out.append(sec[i:m.start()])
            i = m.end()
            blk = m.group(0)
            is_gap = 'styleIDRef="%s"' % gid in blk
            safe = not any(t in blk for t in ("<hp:secPr", "<hp:ctrl", "<hp:colPr"))
            if is_gap and safe:
                cp = re.search(r'charPrIDRef="(\d+)"', blk)
                pend += chh.get(cp.group(1), 0) if cp else 0
                dropped += 1
                continue                        # 빈 문단을 버린다
            if pend:
                pm = re.search(r'paraPrIDRef="(\d+)"', blk)
                if pm:
                    key = (pm.group(1), pend)
                    if key not in pool:
                        src = re.search(
                            r'<hh:paraPr[^>]*?id="%s".*?</hh:paraPr>' % pm.group(1),
                            hdr, re.S).group(0)
                        new = re.sub(r'(<hh:paraPr[^>]*?id=")\d+', r'\g<1>%d' % nxt, src, 1)
                        pv = re.search(r'<hh:prev value="(\d+)"', new)
                        if pv:
                            new = new.replace(pv.group(0),
                                              '<hh:prev value="%d"' % (int(pv.group(1)) + pend), 1)
                        else:
                            new = new.replace("<hh:margin>",
                                              '<hh:margin><hh:prev value="%d" unit="HWPUNIT"/>' % pend, 1)
                        pool[key] = nxt
                        added.append(new)
                        nxt += 1
                    blk = blk.replace('paraPrIDRef="%s"' % pm.group(1),
                                      'paraPrIDRef="%d"' % pool[key], 1)
                    moved += 1
                pend = 0
            out.append(blk)
        out.append(sec[i:])
        items[name] = "".join(out).encode("utf-8")

    if added:
        cnt = re.search(r'<hh:paraProperties itemCnt="(\d+)">', hdr)
        hdr = hdr.replace(cnt.group(0),
                          '<hh:paraProperties itemCnt="%d">'
                          % (int(cnt.group(1)) + len(added)), 1)
        hdr = hdr.replace("</hh:paraProperties>", "".join(added) + "</hh:paraProperties>", 1)
        items["Contents/header.xml"] = hdr.encode("utf-8")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as out:
        for n, b in items.items():
            out.writestr(n, b)
    return dropped, moved


def main():
    if not os.path.exists(HWP):
        sys.exit("투고본이 없다 — %s" % HWP)
    if os.path.exists(HWPX):
        os.remove(HWPX)
    n = H.to_hwpx(HWP, HWPX)
    hit = strip_dots(HWPX)
    d, mv = drop_gaps(HWPX)
    print("간격 문단 %d개를 지우고 %d곳을 문단 위 간격으로 옮겼다" % (d, mv))
    # 이름만 맞추면 스타일 편집 창과 실제 문단의 장평·자간·문단 여백이 템플릿과
    # 달라진다. 전체 charPr·paraPr 계약을 스타일 정의와 실제 문단에 함께 적용한다.
    synced = T.apply(HWPX, KEEP)
    print("템플릿과 실제 값까지 맞춘 스타일 %d개" % len(synced))
    print("%d쪽 · 점을 뗀 스타일 %d개: %s" % (n, len(hit), ", ".join(sorted(set(hit)))))
    out, n = H.to_hwp(HWPX, HWP)
    os.remove(HWPX)
    print("저장 완료 — %s · %d쪽" % (os.path.basename(out), n))


if __name__ == "__main__":
    main()
