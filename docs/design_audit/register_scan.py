"""한 문구(=한 화면에 한 덩어리로 보이는 텍스트) 안에서 어미가 섞이는 지점만 뽑는다."""
import re, sys, pathlib, json

ROOT = pathlib.Path(r"C:\Users\bmffr\Desktop\Result\EASWA_ExploringAllSkyWebApp\frontend\src")
KO = [
    re.compile(r"ko:\s*(['\"])((?:\\.|(?!\1).)*)\1", re.S),
    re.compile(r"lang\s*===\s*'ko'\s*\?\s*(['\"])((?:\\.|(?!\1).)*)\1", re.S),
    re.compile(r"\bko\s*\?\s*(['\"])((?:\\.|(?!\1).)*)\1", re.S),
]
HANGUL = re.compile(r"[가-힣]")

REG = [
    ("합쇼체", r"(습니다|입니다|ㅂ니다|합니다|됩니다|납니다|립니다|집니다|칩니다|킵니다|십니다|줍니다|옵니다|봅니다|둡니다)[.!]?$"),
    ("해요체", r"(어요|아요|에요|예요|해요|워요|와요|이에요|져요|녀요|셔요)[.!]?$"),
    ("명령형", r"(하세요|보세요|주세요|으세요|가세요|십시오|하십시오)[.!]?$"),
    ("문어체", r"(한다|된다|이다|는다|았다|었다|린다|难다|온다|난다|낸다|본다|든다)[.!]?$"),
]

def reg_of(sent):
    s = sent.strip()
    for name, pat in REG:
        if re.search(pat, s):
            return name
    return None

rows = []
for p in sorted(ROOT.rglob("*.ts")) + sorted(ROOT.rglob("*.tsx")):
    if ".test." in p.name:
        continue
    src = p.read_text(encoding="utf-8")
    for rx in KO:
        for m in rx.finditer(src):
            s = m.group(2)
            if not HANGUL.search(s):
                continue
            sents = [x for x in re.split(r"(?<=[.!?])\s+", s.strip()) if x.strip()]
            if len(sents) < 2:
                continue
            regs = [(x, reg_of(x)) for x in sents]
            kinds = {r for _, r in regs if r}
            if len(kinds) >= 2:
                line = src.count("\n", 0, m.start()) + 1
                rows.append({
                    "file": str(p.relative_to(ROOT)).replace("\\", "/"),
                    "line": line,
                    "kinds": sorted(kinds),
                    "sents": [(r or "-", x) for x, r in regs],
                })

seen, uniq = set(), []
for r in rows:
    k = (r["file"], r["line"])
    if k in seen:
        continue
    seen.add(k)
    uniq.append(r)

print(f"한 덩어리 안에서 어미가 섞이는 문구: {len(uniq)}건\n")
for r in uniq:
    print(f"{r['file']}:{r['line']}   [{' + '.join(r['kinds'])}]")
    for reg, sent in r["sents"]:
        print(f"    ({reg}) {sent[:96]}")
    print()
