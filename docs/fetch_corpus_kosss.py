# -*- coding: utf-8 -*-
"""현장과학교육 학회지의 권호를 통째로 내려받아 문체 기준선 코퍼스를 만든다.

**투고처 자신의 게재본이다.** 지금 기준선 12편은 여러 학회지가 섞였고 그중 셋이
학위논문·교육과정 보고서였다(2026-09-13 확인). 같은 학회지 논문으로 재면 판정이
훨씬 또렷해진다.

경로는 JAMS 의 「전체논문다운로드」 버튼이 쓰는 것과 같다. 로그인이 필요 없다.

    POST /co/download/popup/poDownLoadAll.kci   {insiId, sereId, learConfId, volIsseId}
      → {"storFileVO": {orteDirePath, orteFileId, orteFileExteNm}}
    GET  /co/download/popup/downloadAndDelete.kci?orteDirePath=…&orteFileId=…

**두 가지를 지켜야 받아진다** (2026-09-13, 처음에 0바이트가 왔다).

1. **세션 쿠키.** 목록 페이지를 먼저 열어 `JSESSIONID` 를 받고 같은 opener 로 이어 간다.
2. **이중 인코딩.** 화면 코드가 `escape(encodeURIComponent(x))` 를 쓴다. `%` 가 `%25`
   가 되어야 한다. 한 겹만 하면 서버가 빈 파일을 돌려준다.

    python -X utf8 docs/fetch_corpus_kosss.py            내려받기
    python -X utf8 docs/fetch_corpus_kosss.py --unzip    이미 받은 ZIP 만 풀기
"""
import http.cookiejar
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile

BASE = "https://kosss.jams.or.kr"
LIST = (BASE + "/co/com/EgovMenu.kci?s_url=/sj/search/sjSereClasList.kci"
             "&s_MenuId=MENU-000000000053000&accnId=")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")
OUT = r"C:/Users/bmffr/Desktop/Research/코퍼스_현장과학교육"
INS, SER = "INS000008164", "SER000000001"

# 권호 목록. 화면의 fncGoVolIsseList(insiId, sereId, volIsseId) 에서 뽑았다.
# 제2권 1호(2008) ~ 제16권 3호(2022). 목록에 없는 번호는 학회가 안 올린 호다.
VOLS = [
    ("16-3", "000000000045"), ("16-2", "000000000044"), ("16-1", "000000000043"),
    ("15-5", "000000000042"), ("15-4", "000000000041"), ("15-3", "000000000040"),
    ("15-2", "000000000039"), ("15-1", "000000000038"),
    ("14-4", "000000000037"), ("14-3", "000000000036"), ("14-2", "000000000035"),
    ("14-1", "000000000034"),
    ("12-4", "000000000029"), ("12-3", "000000000028"), ("12-2", "000000000027"),
    ("12-1", "000000000026"),
    ("10-3", "000000000022"), ("10-1", "000000000020"),
    ("9-3", "000000000019"), ("9-2", "000000000018"), ("9-1", "000000000017"),
    ("8-3", "000000000016"), ("8-2", "000000000015"), ("8-1", "000000000014"),
    ("7-3", "000000000013"), ("7-2", "000000000012"), ("7-1", "000000000011"),
    ("6-3", "000000000010"), ("6-2", "000000000009"), ("6-1", "000000000008"),
    ("5-2", "000000000007"), ("5-1", "000000000006"),
    ("4-2", "000000000005"), ("4-1", "000000000004"),
    ("3-2", "000000000003"), ("3-1", "000000000002"),
    ("2-2", "000000000001"), ("2-1", "000000000000"),
]

GAP = 20        # 권호 사이 쉬는 시간(초). 서두를 이유가 없다.


def js_escape(s):
    """JS 의 escape(). A-Za-z0-9 와 @*_+-./ 만 남기고 바이트마다 %XX."""
    out = []
    for ch in s:
        if (ch.isascii() and ch.isalnum()) or ch in "@*_+-./":
            out.append(ch)
        else:
            for b in ch.encode("utf-8"):
                out.append("%%%02X" % b)
    return "".join(out)


def enc(s):
    """화면과 같은 이중 인코딩 — escape(encodeURIComponent(s))."""
    return js_escape(urllib.parse.quote(s, safe="!'()*-._~"))


def opener():
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    op.open(urllib.request.Request(LIST, headers={"User-Agent": UA}), timeout=40).read()
    return op


def grab(op, label, vol_id, zdir):
    path = os.path.join(zdir, "%s.zip" % label)
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        print("  %-6s 이미 있음 (%.1f MB)" % (label, os.path.getsize(path) / 1e6), flush=True)
        return True
    d = urllib.parse.urlencode({"insiId": INS, "sereId": SER,
                                "learConfId": "", "volIsseId": vol_id}).encode()
    h = {"User-Agent": UA, "Referer": LIST, "X-Requested-With": "XMLHttpRequest",
         "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
    try:
        raw = op.open(urllib.request.Request(BASE + "/co/download/popup/poDownLoadAll.kci",
                                             data=d, headers=h), timeout=120).read()
        vo = json.loads(raw.decode("utf-8", "replace")).get("storFileVO") or {}
        if not vo.get("orteDirePath"):
            print("  %-6s 파일 정보 없음 — 그 호는 원문이 안 올라와 있다" % label, flush=True)
            return False
        time.sleep(2)
        q = ("orteDirePath=" + enc(vo["orteDirePath"])
             + "&orteFileId=" + enc(vo["orteFileId"])
             + "&orteFileExteNm=" + enc(vo["orteFileExteNm"]))
        r = op.open(urllib.request.Request(
            BASE + "/co/download/popup/downloadAndDelete.kci?" + q,
            headers={"User-Agent": UA, "Referer": LIST}), timeout=600)
        data = r.read()
    except Exception as e:
        print("  %-6s 실패 — %s" % (label, str(e)[:70]), flush=True)
        return False
    if data[:2] != b"PK":
        print("  %-6s ZIP 이 아니다 (%d 바이트)" % (label, len(data)), flush=True)
        return False
    with open(path, "wb") as f:
        f.write(data)
    print("  %-6s %.1f MB" % (label, len(data) / 1e6), flush=True)
    return True


def unzip(zdir, pdir):
    """ZIP 을 풀어 «권호_번호.pdf» 로 편다. 한글 파일명은 cp437→cp949 로 되돌린다."""
    n = 0
    for z in sorted(os.listdir(zdir)):
        if not z.endswith(".zip"):
            continue
        label = z[:-4]
        try:
            zf = zipfile.ZipFile(os.path.join(zdir, z))
        except zipfile.BadZipFile:
            print("  %s 깨진 ZIP" % label, flush=True)
            continue
        for i, name in enumerate(zf.namelist(), 1):
            if not name.lower().endswith(".pdf"):
                continue
            out = os.path.join(pdir, "%s_%02d.pdf" % (label, i))
            if os.path.exists(out):
                n += 1
                continue
            with open(out, "wb") as f:
                f.write(zf.read(name))
            n += 1
        zf.close()
    return n


def main():
    zdir = os.path.join(OUT, "zip")
    pdir = os.path.join(OUT, "pdf")
    os.makedirs(zdir, exist_ok=True)
    os.makedirs(pdir, exist_ok=True)

    if "--unzip" not in sys.argv:
        print("현장과학교육 %d개 권호를 내려받는다. 권호 사이 %d초씩 쉰다.\n"
              % (len(VOLS), GAP), flush=True)
        op = opener()
        ok = 0
        for i, (label, vid) in enumerate(VOLS, 1):
            print("[%2d/%d]" % (i, len(VOLS)), end=" ", flush=True)
            if grab(op, label, vid, zdir):
                ok += 1
            if i < len(VOLS):
                time.sleep(GAP)
        print("\n받은 권호 %d/%d" % (ok, len(VOLS)), flush=True)

    n = unzip(zdir, pdir)
    print("PDF %d편 → %s" % (n, pdir), flush=True)


if __name__ == "__main__":
    main()
