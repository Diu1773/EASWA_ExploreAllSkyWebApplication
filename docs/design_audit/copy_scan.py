"""EASWA 한국어 UI 문구 계측 — '안내 문장' 층의 AI 지문 스캔.

대상: frontend/src 안의 ko: '...' / ko: "..." 리터럴 (i18n·config·컴포넌트 공통).
"""
import re, sys, io, json, pathlib, collections

ROOT = pathlib.Path(r"C:\Users\bmffr\Desktop\Result\EASWA_ExploringAllSkyWebApp\frontend\src")

# ko: '…' 또는 ko: "…" (JS 이스케이프 최소 처리) + '…' 형태의 lang==='ko' 삼항도 잡는다
KO_LITERAL = re.compile(r"ko:\s*(['\"])((?:\\.|(?!\1).)*)\1", re.S)
KO_TERNARY = re.compile(r"lang\s*===\s*'ko'\s*\?\s*(['\"])((?:\\.|(?!\1).)*)\1", re.S)
KO_TERNARY2 = re.compile(r"\bko\s*\?\s*(['\"])((?:\\.|(?!\1).)*)\1", re.S)

HANGUL = re.compile(r"[가-힣]")

rows = []
for p in sorted(ROOT.rglob("*.ts")) + sorted(ROOT.rglob("*.tsx")):
    if p.name.endswith(".test.ts") or p.name.endswith(".test.tsx"):
        continue
    src = p.read_text(encoding="utf-8")
    lines = src.split("\n")
    for rx in (KO_LITERAL, KO_TERNARY, KO_TERNARY2):
        for m in rx.finditer(src):
            s = m.group(2)
            if not HANGUL.search(s):
                continue
            line = src.count("\n", 0, m.start()) + 1
            rows.append({"file": str(p.relative_to(ROOT)).replace("\\", "/"), "line": line, "text": s})

# 중복 제거 (같은 파일/줄/문구)
seen, uniq = set(), []
for r in rows:
    k = (r["file"], r["line"], r["text"])
    if k in seen:
        continue
    seen.add(k)
    uniq.append(r)
rows = uniq

def has(pat, s):
    return re.search(pat, s) is not None

# --- 어미 분류 -------------------------------------------------------------
ENDINGS = [
    ("합쇼체 -ㅂ니다", r"(니다|습니다|입니다)[.!]?$"),
    ("해요체 -요",     r"(어요|아요|에요|예요|해요|세요|봐요|이에요)[.!]?$"),
    ("명령 -하세요",   r"(하세요|보세요|주세요|으세요|십시오)[.!]?$"),
    ("문어 -한다",     r"(한다|된다|이다|는다|았다|었다)[.!]?$"),
    ("의문",           r"[?？]$"),
    ("명사형 종결",    r"[가-힣A-Za-z0-9)\]]$"),
]

def classify(s):
    t = s.strip()
    for name, pat in ENDINGS:
        if has(pat, t):
            return name
    return "기타"

counts = collections.Counter(classify(r["text"]) for r in rows)

# --- 구두점 지문 -----------------------------------------------------------
emdash   = [r for r in rows if "—" in r["text"]]
middot   = [r for r in rows if "·" in r["text"]]
arrow    = [r for r in rows if re.search(r"[→←↑↓↔]", r["text"])]
emoji    = [r for r in rows if re.search(r"[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u2705\u2714\u26A0]", r["text"])]
paren    = [r for r in rows if re.search(r"\([^)]*\)", r["text"])]

# --- 길이 ------------------------------------------------------------------
def sentences(s):
    return [x for x in re.split(r"(?<=[.!?])\s+", s.strip()) if x]

long_rows = sorted([r for r in rows if len(r["text"]) >= 90], key=lambda r: -len(r["text"]))
multi_sent = [r for r in rows if len(sentences(r["text"])) >= 3]

# --- 상투 구문 반복 ---------------------------------------------------------
CLICHE = {
    "…를/을 확인합니다": r"확인합니다",
    "…를/을 비교합니다": r"비교합니다",
    "…해 보세요":        r"(해|어|아)\s?보세요",
    "…할 수 있습니다":   r"할 수 있습니다",
    "…하는 이유":        r"하는 이유",
    "먼저 …":            r"^먼저",
    "각 …마다":          r"각 [가-힣]+(마다|별)",
    "실제 …":            r"실제 ",
    "직접 …":            r"직접 ",
}
cliche_counts = {k: sum(1 for r in rows if re.search(v, r["text"])) for k, v in CLICHE.items()}

out = {
    "총 한국어 문구": len(rows),
    "어미 분포": counts.most_common(),
    "구두점": {
        "em-dash(—)": len(emdash),
        "가운뎃점(·)": len(middot),
        "화살표": len(arrow),
        "이모지": len(emoji),
        "괄호 보충설명": len(paren),
    },
    "90자 이상 문구": len(long_rows),
    "3문장 이상 문구": len(multi_sent),
    "상투 구문": {k: v for k, v in sorted(cliche_counts.items(), key=lambda x: -x[1]) if v},
}

buf = io.StringIO()
print(json.dumps(out, ensure_ascii=False, indent=1), file=buf)
print("\n=== em-dash 사용 전문 ===", file=buf)
for r in emdash:
    print(f"  {r['file']}:{r['line']}  {r['text'][:110]}", file=buf)
print("\n=== 90자 이상 상위 12 ===", file=buf)
for r in long_rows[:12]:
    print(f"  [{len(r['text'])}자] {r['file']}:{r['line']}\n      {r['text'][:190]}", file=buf)
print("\n=== 이모지 전문 ===", file=buf)
for r in emoji:
    print(f"  {r['file']}:{r['line']}  {r['text'][:80]}", file=buf)

sys.stdout.write(buf.getvalue())
