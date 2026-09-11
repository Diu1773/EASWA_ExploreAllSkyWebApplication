# -*- coding: utf-8 -*-
"""스타일 정의의 글꼴·크기·굵기·정렬·들여쓰기를 학회 템플릿 값으로 박는다 (2026-09-12).

글자마다는 `<font face>` 로 맞는 글꼴이 들어가지만 **스타일 정의**는 한글 기본값
(한컴바탕)으로 남는다. 한글에서 스타일 목록을 열면 템플릿과 달라 보인다
(소유자 지적: 「양식이 아예 똑같아야」). 문단은 저마다 문단 모양을 들고 있으므로
스타일 정의를 고쳐도 배치는 움직이지 않는다.

`docs/hwpx_styles.py` 가 점을 뗀 뒤에 이 단계를 부른다.
"""
import os
import re
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hwpx_headers as H                                   # noqa: E402

BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
TPL = r"C:\Users\bmffr\Downloads\논문템플릿.hwp"
FONT_TAIL = ('<hh:typeInfo familyType="FCAT_GOTHIC" weight="0" proportion="0" contrast="0"'
             ' strokeVariation="0" armStyle="0" letterform="0" midline="0" xHeight="0"/>')
# 표 칸은 짧은 값과 긴 문장이 섞여 있다. 스타일 정렬을 템플릿의 가운데로 바꾸면
# 문장이 든 칸까지 가운데가 되어 읽히지 않는다 — 정렬만 손대지 않는다.
NO_ALIGN = {"표내용"}


def _face_map(hdr):
    """lang -> {id: 글꼴 이름} 과 그 역"""
    fwd, rev = {}, {}
    for m in re.finditer(r'<hh:fontface[^>]*lang="(\w+)"[^>]*>(.*?)</hh:fontface>', hdr, re.S):
        lang = m.group(1)
        for f in re.finditer(r'<hh:font([^>]*)>', m.group(2)):
            a = f.group(1)
            i, n = re.search(r'id="(\d+)"', a), re.search(r'face="([^"]*)"', a)
            if i and n:
                fwd.setdefault(lang, {})[i.group(1)] = n.group(1)
                rev.setdefault(lang, {})[n.group(1)] = i.group(1)
    return fwd, rev


def template_styles(tpl_hwpx):
    """템플릿의 스타일 이름 -> (크기, 굵게, 한글글꼴, 영문글꼴, 정렬, 들여쓰기)"""
    z = zipfile.ZipFile(tpl_hwpx)
    hdr = z.read("Contents/header.xml").decode("utf-8")
    z.close()
    fwd, _ = _face_map(hdr)
    ch, pp = {}, {}
    for c in hdr.split("<hh:charPr ")[1:]:
        i = re.search(r'^id="(\d+)"', c)
        if not i:
            continue
        g = re.search(r'height="(\d+)"', c[:300])
        fr = re.search(r'<hh:fontRef([^>]*)/>', c)
        hg = re.search(r'hangul="(\d+)"', fr.group(1)) if fr else None
        lt = re.search(r'latin="(\d+)"', fr.group(1)) if fr else None
        ch[i.group(1)] = (int(g.group(1)) if g else None, "<hh:bold" in c[:900],
                          fwd.get("HANGUL", {}).get(hg.group(1) if hg else "", ""),
                          fwd.get("LATIN", {}).get(lt.group(1) if lt else "", ""))
    for c in hdr.split("<hh:paraPr ")[1:]:
        i = re.search(r'^id="(\d+)"', c)
        if not i:
            continue
        a = re.search(r'<hh:align [^>]*horizontal="(\w+)"', c[:900])
        t = re.search(r'<hc:intent [^>]*value="(-?\d+)"', c[:900])
        pp[i.group(1)] = (a.group(1) if a else None, int(t.group(1)) if t else 0)
    out = {}
    for m in re.finditer(r'<hh:style\b([^>]*)/>', hdr):
        a = m.group(1)
        nm = re.search(r'name="([^"]+)"', a)
        pi = re.search(r'paraPrIDRef="(\d+)"', a)
        ci = re.search(r'charPrIDRef="(\d+)"', a)
        if not (nm and pi and ci):
            continue
        h, b, hf, lf = ch.get(ci.group(1), (None, False, "", ""))
        al, ind = pp.get(pi.group(1), (None, 0))
        out[nm.group(1)] = (h, b, hf, lf, al, ind)
    return out


def _ensure_face(hdr, lang, face, rev):
    """글꼴이 그 언어 목록에 없으면 넣고 id 를 돌려준다."""
    if face in rev.get(lang, {}):
        return hdr, rev[lang][face]
    m = re.search(r'(<hh:fontface[^>]*lang="%s"[^>]*fontCnt="(\d+)"[^>]*>)(.*?)(</hh:fontface>)'
                  % lang, hdr, re.S)
    if not m:
        return hdr, None
    have = rev.get(lang) or {}
    nid = str(max([int(v) for v in have.values()] or [-1]) + 1)
    tag = ('<hh:font id="%s" face="%s" type="TTF" isEmbedded="0">%s</hh:font>'
           % (nid, face, FONT_TAIL))
    head = m.group(1).replace('fontCnt="%s"' % m.group(2), 'fontCnt="%d"' % (int(m.group(2)) + 1))
    hdr = hdr[:m.start()] + head + m.group(3) + tag + m.group(4) + hdr[m.end():]
    rev.setdefault(lang, {})[face] = nid
    return hdr, nid


def _clone(hdr, kind, pid):
    """`charPr`·`paraPr` 하나를 베껴 새 id 로 넣고 그 id 를 돌려준다.

    스타일 여럿이 같은 charPr 을 함께 쓴다. 그대로 고치면 한 스타일에 맞추는 순간
    다른 스타일이 틀어진다(2026-09-12: 「본문」을 맞추자 「요약타이틀」이 같이
    바뀌었다). 스타일마다 제 것을 갖게 한 뒤에 고친다.
    """
    tag = "hh:%s" % kind
    box = {"charPr": "hh:charProperties", "paraPr": "hh:paraProperties"}[kind]
    m = re.search(r'<%s id="%s"[^>]*>.*?</%s>' % (tag, pid, tag), hdr, re.S)
    if not m:
        return hdr, pid
    ids = [int(x) for x in re.findall(r'<%s id="(\d+)"' % tag, hdr)]
    nid = str(max(ids) + 1)
    dup = re.sub(r'^(<%s id=")\d+(")' % tag, lambda x: x.group(1) + nid + x.group(2),
                 m.group(0), count=1)
    hdr = hdr[:m.end()] + dup + hdr[m.end():]
    bm = re.search(r'<%s itemCnt="(\d+)"' % box, hdr)
    if bm:
        hdr = hdr[:bm.start()] + ('<%s itemCnt="%d"' % (box, int(bm.group(1)) + 1)) + hdr[bm.end():]
    return hdr, nid


def apply(path, keep):
    """`keep` 에 든 스타일에 템플릿 값을 박는다. 바꾼 이름 목록을 돌려준다."""
    if not os.path.exists(TPL):
        print("  ! 템플릿을 찾지 못해 스타일 값을 박지 않았다")
        return []
    tpl_hwpx = os.path.join(BASE, "_스타일_템플릿.hwpx")
    H.to_hwpx(TPL, tpl_hwpx)
    want = template_styles(tpl_hwpx)
    os.remove(tpl_hwpx)

    z = zipfile.ZipFile(path)
    items = {n: z.read(n) for n in z.namelist()}
    z.close()
    hdr = items["Contents/header.xml"].decode("utf-8")
    _, rev = _face_map(hdr)

    hit = []
    for name in sorted(want):
        if name not in keep:
            continue
        h, b, hf, lf, al, ind = want[name]
        m = re.search(r'<hh:style\b[^>]*name="%s"[^>]*/>' % re.escape(name), hdr)
        if not m:
            continue
        ci = re.search(r'charPrIDRef="(\d+)"', m.group(0))
        pi = re.search(r'paraPrIDRef="(\d+)"', m.group(0))
        if not (ci and pi):
            continue
        # 스타일마다 제 charPr·paraPr 을 갖게 한다
        hdr, cid = _clone(hdr, "charPr", ci.group(1))
        pid = pi.group(1)
        if al and name not in NO_ALIGN:
            hdr, pid = _clone(hdr, "paraPr", pi.group(1))
        sm = re.search(r'<hh:style\b[^>]*name="%s"[^>]*/>' % re.escape(name), hdr)
        new_tag = sm.group(0)
        new_tag = re.sub(r'(charPrIDRef=")\d+(")', lambda x: x.group(1) + cid + x.group(2), new_tag)
        new_tag = re.sub(r'(paraPrIDRef=")\d+(")', lambda x: x.group(1) + pid + x.group(2), new_tag)
        hdr = hdr[:sm.start()] + new_tag + hdr[sm.end():]
        # 글꼴 id 는 **언어 목록마다 따로** 센다. 한글 목록의 번호를 한자·일본어
        # 칸에 그대로 쓰면 그 목록에 없는 번호가 되어 파일이 깨진다.
        ids = {}
        for lang, face in (("HANGUL", hf), ("HANJA", hf), ("JAPANESE", hf),
                           ("OTHER", hf), ("SYMBOL", hf), ("USER", hf), ("LATIN", lf)):
            if face:
                hdr, fid = _ensure_face(hdr, lang, face, rev)
                if fid:
                    ids[lang] = fid
        cm = re.search(r'(<hh:charPr id="%s"[^>]*>)(.*?)(</hh:charPr>)' % cid, hdr, re.S)
        if cm:
            head, body = cm.group(1), cm.group(2)
            if h:
                head = re.sub(r'height="\d+"', 'height="%d"' % h, head)
            for lang, key in (("HANGUL", "hangul"), ("LATIN", "latin"), ("HANJA", "hanja"),
                              ("JAPANESE", "japanese"), ("OTHER", "other"),
                              ("SYMBOL", "symbol"), ("USER", "user")):
                if not ids.get(lang):
                    continue
                body = re.sub(r'(<hh:fontRef[^>]* %s=")\d+(")' % key,
                              lambda x, v=ids[lang]: x.group(1) + v + x.group(2), body)
            has_bold = "<hh:bold" in body
            if b and not has_bold:
                body = "<hh:bold/>" + body
            elif has_bold and not b:
                body = body.replace("<hh:bold/>", "", 1)
            hdr = hdr[:cm.start()] + head + body + cm.group(3) + hdr[cm.end():]
        if al and name not in NO_ALIGN:
            pm = re.search(r'(<hh:paraPr id="%s"[^>]*>)(.*?)(</hh:paraPr>)' % pid, hdr, re.S)
            if pm:
                body = re.sub(r'(<hh:align [^>]*horizontal=")\w+(")',
                              lambda x: x.group(1) + al + x.group(2), pm.group(2))
                body = re.sub(r'(<hc:intent [^>]*value=")-?\d+(")',
                              lambda x: x.group(1) + str(ind) + x.group(2), body)
                hdr = hdr[:pm.start()] + pm.group(1) + body + pm.group(3) + hdr[pm.end():]
        hit.append(name)

    items["Contents/header.xml"] = hdr.encode("utf-8")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as out:
        for n, x in items.items():
            out.writestr(n, x)
    return hit
