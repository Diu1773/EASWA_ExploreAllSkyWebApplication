# -*- coding: utf-8 -*-
"""HN Algolia 로 'AI 티 나는 웹디자인' 관련 댓글을 모은다. 표본 = 공개 아카이브 전수."""
import json, time, urllib.parse, urllib.request, pathlib, html, re

QUERIES = [
    "AI generated website design", "vibe coded", "AI slop website",
    "looks AI generated", "shadcn", "AI website all look the same",
    "purple gradient", "AI generated UI", "AI design tell",
    "generic landing page AI", "tailwind default look",
]
BASE = "https://hn.algolia.com/api/v1/search_by_date"
out = {}
for q in QUERIES:
    for page in range(0, 4):
        url = (f"{BASE}?query={urllib.parse.quote(q)}&tags=comment"
               f"&hitsPerPage=100&page={page}&numericFilters=created_at_i>1672531200")
        try:
            with urllib.request.urlopen(url, timeout=45) as r:
                d = json.load(r)
        except Exception as e:
            print("ERR", q, page, e); break
        hits = d.get("hits", [])
        for h in hits:
            out[h["objectID"]] = h
        if len(hits) < 100:
            break
        time.sleep(0.35)
    print(f"{q:34s}누적 {len(out)}")

pathlib.Path("hn_corpus.json").write_text(
    json.dumps(list(out.values()), ensure_ascii=False), encoding="utf-8")
print("총 댓글", len(out))
