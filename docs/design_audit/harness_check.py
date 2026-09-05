# -*- coding: utf-8 -*-
"""DESIGN_HARNESS_EASWA.md §2 — 기계로 재는 항목만 검사한다."""
import re, sys, colorsys, pathlib

# 16px 이하는 2px 격자, 그보다 크면 4의 배수. 표·괘선 조판은 행 높이가 4px 격자로
# 떨어지지 않아 2px 격자를 쓴다 (2026-09-06, DESIGN_HARNESS_EASWA.md §7).
SCALE = {0,1,2,4,6,8,10,12,14,16,20,24,32,40,48,64,80,96}
# 너비·높이·글자크기·행간은 간격 규칙 대상이 아니다
SIZE_PROPS = re.compile(r"(width|height|max-width|min-width|max-height|min-height|"
                        r"font-size|line-height|letter-spacing|flex-basis|top|left|right|bottom)\s*:", re.I)

def rgb(h):
    h = h.lstrip("#")
    if len(h) == 3: h = "".join(c*2 for c in h)
    return tuple(int(h[i:i+2],16) for i in (0,2,4))

def lum(c):
    def f(v):
        v /= 255
        return v/12.92 if v <= .03928 else ((v+.055)/1.055)**2.4
    r,g,b = c
    return .2126*f(r)+.7152*f(g)+.0722*f(b)

def ratio(a,b):
    la,lb = lum(rgb(a)), lum(rgb(b))
    hi,lo = max(la,lb), min(la,lb)
    return (hi+.05)/(lo+.05)

target = pathlib.Path(sys.argv[1])
raw = target.read_text(encoding="utf-8")
# CSS 선언만 모은다. 예전 판은 HTML 본문까지 긁어 인라인 style 하나가 문서 끝까지
# 삼키는 오탐을 냈다 (2026-09-06).
_styles = re.findall(r"<style[^>]*>(.*?)</style>", raw, re.S)
# 같은 폴더의 외부 스타일시트도 읽는다. 링크로 빼 두면 검사가 통째로 비어
# 「위반 0건」이 되던 구멍을 막는다 (2026-09-06).
if target.suffix.lower() in (".html", ".htm"):
    for href in re.findall(r'<link[^>]+rel\s*=\s*"stylesheet"[^>]*>', raw, re.I):
        m = re.search(r'href\s*=\s*"([^"]+)"', href)
        if not m or m.group(1).startswith(("http:", "https:", "//", "data:")):
            continue
        css = (target.parent / m.group(1)).resolve()
        if css.is_file():
            _styles.append(css.read_text(encoding="utf-8"))
        else:
            print(f"  ! 스타일시트를 찾지 못했다: {m.group(1)}")
_inline = re.findall(r'style\s*=\s*"([^"]*)"', raw)
_joined = ("\n").join(_styles)
_inl = ("\n").join("x{" + v + "}" for v in _inline)
src = raw if not (_styles or _inline) else (_joined + ("\n") + _inl)
# 이모지·대문자 라벨·감속모션 검사는 원문에서 본다
full = raw
fails, notes = [], []

# 1) 간격 스케일
off = []
for m in re.finditer(r"([a-z-]+)\s*:\s*([^;{}]*?)(?=[;}])", src, re.I):
    prop, val = m.group(1), m.group(2)
    if SIZE_PROPS.match(prop + ":"): continue
    if not re.search(r"(margin|padding|gap|inset)", prop, re.I): continue
    for px in re.findall(r"(\d+)px", val):
        if int(px) not in SCALE: off.append(f"{prop}:{val.strip()}")
if off: fails.append(f"간격 스케일 밖: {sorted(set(off))}")

# 2) 그라디언트 / 그림자 / 글로우
g = re.findall(r"(linear|radial|conic)-gradient", src)
if g: fails.append(f"그라디언트 {len(g)}개")
sh = [s for s in re.findall(r"box-shadow\s*:\s*([^;}]+)", src) if "none" not in s]
if sh: fails.append(f"그림자 {len(sh)}개: {sh}")
glow = re.findall(r"box-shadow\s*:[^;}]*?0\s+0\s+[1-9]\d*px", src)
if glow: fails.append(f"글로우 {len(glow)}개")

# 3) 모서리 종류
tokens_px = dict(re.findall(r"--([\w-]+)\s*:\s*(\d+)px", src))
def resolve(v):
    return re.sub(r"var\(--([\w-]+)\)", lambda m: tokens_px.get(m.group(1), m.group(0)) + "px"
                  if m.group(1) in tokens_px else m.group(0), v)
rad_raw = [resolve(v) for v in re.findall(r"border-radius\s*:\s*([^;}]+)", src)]
rad = sorted({int(x) for v in rad_raw for x in re.findall(r"(\d+)px", v)})
if len(rad) > 4: fails.append(f"모서리 {len(rad)}종: {rad}")
else: notes.append(f"모서리 {rad or '없음'} + 원형/알약 별도")

# 4) 이모지
emo = re.findall(r"[\U0001F300-\U0001FAFF☀-➿]", src)
if emo: fails.append(f"이모지 {len(emo)}개: {set(emo)}")

# 5) 감속 모션 선언 — transition/animation 이 있을 때만 요구한다.
#    움직임이 하나도 없는 문서에까지 선언을 요구하면 통과용 빈 블록만 늘어난다.
_moves = re.search(r"(transition|animation)\s*:", src)
if _moves and "prefers-reduced-motion" not in full:
    fails.append("움직임이 있는데 prefers-reduced-motion 없음")

# 6) 스크롤 등장
if re.search(r"reveal|animate-on-scroll|IntersectionObserver", full): fails.append("스크롤 등장 흔적")

# 7) 화면 문구의 영문 대문자 라벨 (고유명사 제외)
#    한글 문장 안에 섞인 약어(STD·DSS·ROI)나 카탈로그 이름(HAT-P-32)은 장식 라벨이
#    아니다. 요소 하나가 통째로 대문자 영문일 때만 잡는다 (2026-09-06).
PROPER = {"EASWA","NASA","ESA","TESS","MAST","KASI","KMTNET","STSCI","AURA",
          "ASWA","CCD","WASP","DSS","ROI","RMS","STD","FWHM","FITS","API","EN","KO"}
caps = []
for t in re.findall(r">([^<>{}]{2,60})<", full):
    t = t.strip()
    if not t or re.search(r"[가-힣]", t):   # 한글이 섞이면 문장이다
        continue
    letters = re.sub(r"[^A-Za-z]", "", t)
    if len(letters) < 3 or letters != letters.upper():
        continue
    if re.sub(r"[^A-Z]", "", t) in PROPER:
        continue
    caps.append(t)
if caps: fails.append(f"영문 대문자 라벨: {sorted(set(caps))}")

# 8) 명암비 — :root 토큰끼리
tok = dict(re.findall(r"--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})", full))
if "bg" in tok:
    for name in ("body","sec","muted","heading"):
        if name in tok:
            r = ratio(tok[name], tok["bg"])
            (notes if r >= 4.5 else fails).append(f"명암비 {name}/bg = {r:.2f}")

print("="*62)
print("통과 못 한 항목" if fails else "§2 전 항목 통과")
for f in fails: print("  [불통과]", f)
for n in notes: print("  [기록]  ", n)
print("="*62)
sys.exit(1 if fails else 0)
