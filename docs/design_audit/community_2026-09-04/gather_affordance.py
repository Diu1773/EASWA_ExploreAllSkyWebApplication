# -*- coding: utf-8 -*-
"""「눌리는 것처럼 안 보인다 · 경계가 없다」 계열 불만을 HN 에서 모은다."""
import json, time, urllib.parse, urllib.request, pathlib, html, re, collections

QUERIES = [
 "looks clickable", "not obvious clickable", "affordance button",
 "flat design usability", "borderless button", "cards without borders",
 "ghost button", "低 contrast button", "invisible buttons UI",
 "hard to tell what is a button", "clickability signifiers",
 "card design boundaries", "outline button accessibility",
]
BASE = "https://hn.algolia.com/api/v1/search"
out = {}
for q in QUERIES:
    for page in range(0, 3):
        url = (f"{BASE}?query={urllib.parse.quote(q)}&tags=comment"
               f"&hitsPerPage=100&page={page}")
        try:
            with urllib.request.urlopen(url, timeout=45) as r:
                d = json.load(r)
        except Exception as e:
            print("ERR", q, e); break
        hits = d.get("hits", [])
        for h in hits: out[h["objectID"]] = h
        if len(hits) < 100: break
        time.sleep(0.3)
    print(f"{q:34s}누적 {len(out)}")

def clean(h):
    t = h.get("comment_text") or ""
    return re.sub(r"\s+"," ", re.sub(r"<[^>]+>"," ", html.unescape(t)))

UI = re.compile(r"\b(button|link|card|ui|ux|interface|website|web ?page|design|clickable|tappable)\b", re.I)
SIG = {
 "눌리는지 모르겠다": r"\b(looks? (like a )?(link|button)|(is|isn'?t|not) (obviously )?clickable|"
        r"can'?t tell (what|if).{0,24}(click|button)|no affordance|lacks? affordance|"
        r"don'?t look clickable|didn'?t (know|realize).{0,20}clickable)\b",
 "경계·테두리가 없다": r"\b(no (visible )?(border|outline|boundary|edges)|borderless|"
        r"where (one|a) (card|section) ends|blend(s)? (in)?to the background|no separation)\b",
 "플랫 디자인 자체": r"\bflat design\b",
 "고스트·외곽선 버튼": r"\b(ghost button|outline(d)? button|text button|link-?styled button)\b",
 "대비가 낮다": r"\b(low[- ]contrast|too (light|faint|subtle)|hard to (see|read))\b",
 "여백만으로 구분": r"\b(whitespace|white space)\b.{0,40}\b(separat|group|divid)",
}
raw = list(out.values())
on = [(h, clean(h)) for h in raw if len(clean(h))>40 and UI.search(clean(h))]
print(f"\n수집 {len(raw)}건 → UI 관련 {len(on)}건")
yrs = collections.Counter(h["created_at"][:4] for h,_ in on)
print("연도별:", dict(sorted(yrs.items())))
print()
rows=[]
for name,pat in SIG.items():
    rx=re.compile(pat, re.I)
    n=sum(1 for _,t in on if rx.search(t))
    rows.append((n, n/len(on)*100, name))
rows.sort(reverse=True)
print(f"{'항목':<24}{'건수':>6}{'비율':>9}")
for n,p,name in rows: print(f"{name:<24}{n:>6}{p:>8.1f}%")
json.dump([{"id":h["objectID"],"date":h["created_at"],"url":h.get("story_url"),"text":t}
           for h,t in on], open("hn_affordance.json","w",encoding="utf-8"), ensure_ascii=False)
