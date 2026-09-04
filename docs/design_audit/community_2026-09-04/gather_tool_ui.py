# -*- coding: utf-8 -*-
"""분석·도구 화면(대시보드·단계 마법사·플롯 UI)에 대한 실무자 의견을 HN 에서 모은다."""
import json, time, urllib.parse, urllib.request, pathlib, html, re, collections

QUERIES = [
 "dashboard design bad", "too many charts dashboard", "data dense interface",
 "multi step form usability", "wizard UI steps", "progressive disclosure UI",
 "scientific software UI", "analysis tool interface design",
 "jupyter notebook UI complaints", "settings panel too many options",
 "control panel design", "plot interface zoom pan", "form wizard abandonment",
 "information density UI", "power user interface design",
]
BASE = "https://hn.algolia.com/api/v1/search"
out = {}
for q in QUERIES:
    for page in range(0, 3):
        url = f"{BASE}?query={urllib.parse.quote(q)}&tags=comment&hitsPerPage=100&page={page}"
        try:
            with urllib.request.urlopen(url, timeout=45) as r: d = json.load(r)
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

TOOL = re.compile(r"\b(dashboard|interface|ui|ux|tool|panel|form|wizard|chart|plot|graph|"
                  r"workflow|notebook|app)\b", re.I)
SIG = {
 "한 화면에 너무 많다": r"\b(too (much|many)|overwhelm|cluttered|information overload|"
      r"kitchen sink|too dense|firehose)\b",
 "단계로 쪼개라 / 마법사": r"\b(step[- ]by[- ]step|multi[- ]step|wizard|one (question|thing) (at a time|per (page|screen))|"
      r"progressive disclosure|break it (up|down) into steps)\b",
 "숨기지 말고 보여라": r"\b(hidden (behind|in) (a )?(menu|modal|hamburger)|buried|hard to (find|discover)|"
      r"discoverab|why (is|was) (this|that) hidden)\b",
 "기본값이 중요하다": r"\b(sensible defaults?|good defaults?|default (should|matters)|"
      r"opinionated defaults?)\b",
 "되돌리기·실수 복구": r"\b(undo|revert|recover from|destructive action|confirm(ation)? dialog)\b",
 "지금 뭐가 일어나는지": r"\b(loading (state|indicator)|progress (bar|indicator)|spinner|"
      r"no feedback|what('|’)?s happening|feels? (broken|frozen|stuck))\b",
 "전문가는 밀도를 원한다": r"\b(power users?|dense (is|but) (good|fine)|bloomberg terminal|"
      r"i want (more|all) (the )?(data|info)|(too much )?whitespace (is )?waste)\b",
 "차트가 정보를 안 준다": r"\b(useless chart|pretty but useless|vanity metric|"
      r"chartjunk|junk chart|(chart|graph) (that )?(tells|says) nothing)\b",
}
raw = list(out.values())
on = [(h, clean(h)) for h in raw if len(clean(h))>60 and TOOL.search(clean(h))]
print(f"\n수집 {len(raw)}건 → 도구 UI 관련 {len(on)}건")
print("연도별:", dict(sorted(collections.Counter(h["created_at"][:4] for h,_ in on).items())))
print()
rows=[]
for name,pat in SIG.items():
    rx=re.compile(pat, re.I); n=sum(1 for _,t in on if rx.search(t))
    rows.append((n, n/len(on)*100, name))
rows.sort(reverse=True)
print(f"{'무엇을 말하나':<24}{'건수':>6}{'비율':>9}")
for n,p,name in rows: print(f"{name:<24}{n:>6}{p:>8.1f}%")
json.dump([{"id":h["objectID"],"date":h["created_at"],"url":h.get("story_url"),"text":t}
           for h,t in on], open("hn_tool_ui.json","w",encoding="utf-8"), ensure_ascii=False)
