"""홈 화면 시안 빌더.

--dump-dom 으로 뜬 실제 렌더 DOM을 정적 스냅샷으로 고정하고, CSS만 얹어 시안을 만든다.
마크업은 한 글자도 바꾸지 않는다 — 앱 코드 동결 상태에서 "CSS만으로 어디까지 되나"를 보는 것이 목적.
"""
import re, pathlib

HERE = pathlib.Path(__file__).parent
RAW = HERE / "home_raw.html"

# 스냅샷 공통 처리 -----------------------------------------------------------
# .reveal 은 스크롤 진입 시 보이는 연출이라 정적 스냅샷에서는 2·3번 카드가 투명하게 남는다.
# 비교의 공정을 위해 baseline 을 포함한 모든 시안에서 똑같이 강제로 보이게 한다.
COMMON = """
.reveal, .reveal-visible { opacity: 1 !important; transform: none !important; transition: none !important; }
* { animation: none !important; }
"""

BASE = ""  # 현재 = 아무것도 얹지 않음

# 홈 화면에서 실제로 0px 아닌 모서리를 갖는 블록 전수(2026-08-03 실측).
# 토큰(:root --radius-*)만 바꿔서는 안 된다 — 스타일시트의 71%가 px 를 하드코딩하고 있다.
BLOCKS = """.home-hero, .home-feature-item, .inquiry-module-card, .inquiry-question-box,
.inquiry-module-tags li, .inquiry-module-card-meta span, .inquiry-module-card-source,
.inquiry-module-card-media img, .btn-primary, .btn-sm, .navbar-lang-toggle,
.navbar-login, .navbar a.active, .home-hero-bg-credit"""

# 한글에 걸린 uppercase 는 아무 일도 하지 않는다. 영문 라벨(navbar-subtitle,
# home-hero-brand-sub)은 실제로 작동하므로 건드리지 않는다.
KO_LABELS = """.home-hero-kicker, .home-modules-label, .inquiry-module-card-chip,
.inquiry-question-box > span"""

# ── 시안 A — 규칙만 정리 ────────────────────────────────────────────────────
A = """
/* 1. 모서리를 한 값으로. 알약(999px)·원(50%)은 "동그랗게" 규칙이라 건드리지 않는다. */
:root { --radius-sm: 4px; --radius-md: 4px; --radius-lg: 4px; }
%BLOCKS% { border-radius: 4px !important; }

/* 2. 컬러 글로우 제거 — 레퍼런스 4곳 전부 0개 */
:root { --shadow-glow: none; --accent-glow: transparent; }
.btn-primary { box-shadow: none !important; }
.inquiry-module-card { box-shadow: 0 1px 2px rgba(0,0,0,.4) !important; }

/* 3. kicker 의 uppercase 는 한글에서 아무 일도 하지 않는다. 자간만 과하게 벌어져 있었다. */
%KO_LABELS% { text-transform: none !important; letter-spacing: .01em !important; }
"""

# ── 시안 B — 레퍼런스 정렬 ──────────────────────────────────────────────────
B = """
/* 1. 모서리 0px — NASA Science · JPL · Zooniverse 방식 */
:root { --radius-sm: 0px; --radius-md: 0px; --radius-lg: 0px; }
%BLOCKS% { border-radius: 0 !important; }

/* 2. 구분 수단은 하나만 — 배경 톤만 남기고 테두리를 뺀다 */
.home-feature-item { border: 0 !important; }
.inquiry-module-card { border: 0 !important; box-shadow: none !important; }

/* 3. 이모지 아이콘 제거 — 레퍼런스 4곳 전부 0개 */
.home-feature-icon { display: none !important; }

/* 4. kicker: 대문자·주황 → 소문자·회색. 눈이 제목에 먼저 가게 한다. */
%KO_LABELS% {
  text-transform: none !important; letter-spacing: .01em !important;
  color: var(--text-muted) !important; font-weight: 600 !important;
}

/* 5. 태그·출처 알약 → 인라인 텍스트. 정보는 같고 모양만 뺀다. */
.inquiry-module-tags li, .inquiry-module-card-meta span {
  border: 0 !important; background: none !important; padding: 0 !important;
  min-height: 0 !important;
}
.inquiry-module-tags li + li::before,
.inquiry-module-card-meta span + span::before { content: "·"; margin: 0 7px 0 0; color: var(--text-muted); }

/* 6. 질문 상자: 주황 상자 → 왼쪽 세로줄 하나 */
.inquiry-question-box {
  border: 0 !important; border-left: 2px solid var(--accent) !important;
  background: none !important; padding: 2px 0 2px 13px !important;
}

/* 7. 글로우 제거 */
:root { --shadow-glow: none; --accent-glow: transparent; }
.btn-primary { box-shadow: none !important; }
"""

# ── 시안 C — 카드 해체 (JPL Education) ──────────────────────────────────────
C = """
/* B 의 모든 규칙 + 카드 자체를 없앤다. 배경도 테두리도 없이 페이지 위에 그냥 놓는다. */
:root { --radius-sm: 0px; --radius-md: 0px; --radius-lg: 0px;
        --shadow-glow: none; --accent-glow: transparent; }
%BLOCKS% { border-radius: 0 !important; }

.home-feature-item { border: 0 !important; background: none !important; padding: 0 !important; }
.home-feature-list { gap: 34px !important; }
.home-feature-icon { display: none !important; }

.inquiry-module-card {
  border: 0 !important; background: none !important; box-shadow: none !important;
  min-height: 0 !important; gap: 26px;
}
.inquiry-module-card-body { padding: 0 !important; gap: 12px !important; }
.inquiry-module-card-media { min-height: 210px !important; }

/* 배지는 딱 한 종류만 남긴다 — JPL 의 Lesson / Student Project 자리 */
.inquiry-module-card-chip {
  text-transform: none !important; letter-spacing: .01em !important;
  background: rgba(232,114,42,.14) !important; color: var(--accent) !important;
  padding: 3px 9px !important; border-radius: 999px !important; font-size: .74rem !important;
}
.home-hero-kicker, .home-modules-label, .inquiry-question-box > span {
  text-transform: none !important; letter-spacing: .01em !important;
  color: var(--text-muted) !important; font-weight: 600 !important;
}

.inquiry-module-tags li, .inquiry-module-card-meta span
{ border: 0 !important; background: none !important; padding: 0 !important; min-height: 0 !important; }
.inquiry-module-tags li + li::before,
.inquiry-module-card-meta span + span::before { content: "·"; margin: 0 7px 0 0; color: var(--text-muted); }

/* 카드를 없앤 만큼 모듈 사이 여백이 구분을 대신한다 */
.inquiry-module-selector { gap: 46px !important; }

.inquiry-question-box {
  border: 0 !important; border-left: 2px solid var(--border-light) !important;
  background: none !important; padding: 2px 0 2px 13px !important;
}
.btn-primary { box-shadow: none !important; width: fit-content !important; }
"""

# ── T 레이어 — 타이포 ───────────────────────────────────────────────────────
# 홈 화면 실측(2026-08-03): 텍스트 59개에 크기 16종 · 굵기 5종 · 줄간격 18종 · 자간 9종.
# 계단을 13/15/17/21/27/48 여섯 단으로 스냅한다. 본문 17px 는 2026-07 연수 현장
# 피드백으로 :root 16→17px 올린 값이라 그대로 둔다(commit 2956d24). 오히려 가장 작은
# 글씨(히어로 크레딧 10.54px)를 13px 로 올린다.
T = """
/* 13 — 캡션·크레딧·태그·칩 */
.home-hero-bg-credit, .navbar-subtitle, .home-hero-brand-sub, .inquiry-module-card-source,
.inquiry-module-card-chip, .inquiry-module-tags li, .inquiry-module-card-meta span,
.navbar-lang-toggle, .inquiry-question-box > span { font-size: 13px !important; }

/* 15 — 보조 설명·네비 */
.home-feature-item span, .navbar-login-label, .navbar-login-provider,
.navbar-links a { font-size: 15px !important; }

/* 17 — 본문·버튼·3칸 제목 (연수 피드백으로 올린 값, 유지) */
.inquiry-module-card-head p, .home-feature-item strong, .btn-primary,
.inquiry-question-box strong { font-size: 17px !important; }

/* 21 — 히어로 설명·워드마크 */
.home-hero-desc, .home-hero-brand-name, .navbar-title { font-size: 21px !important; }

/* 27 — 모듈 제목 */
.inquiry-module-card-head h2 { font-size: 27px !important; }

/* 48 — 히어로 제목 */
.home-hero-title { font-size: 48px !important; }

/* 굵기 5종 → 3종 (400 / 600 / 700) */
.navbar-subtitle, .navbar-links a, .navbar-login-label, .navbar-login-provider
{ font-weight: 400 !important; }
.home-hero-title, .home-hero-brand-name { font-weight: 700 !important; }

/* 자간 — 한글에 붙은 양수 자간은 가독성을 깎는다. 영문 워드마크만 남긴다. */
.home-hero-kicker, .home-modules-label, .inquiry-module-card-chip, .navbar-lang-toggle,
.inquiry-question-box > span { letter-spacing: normal !important; }
.home-hero-brand-name { letter-spacing: 2px !important; }
.home-hero-brand-sub, .navbar-subtitle { letter-spacing: 1px !important; }

/* 줄간격 18종 → 3단 */
.home-hero-title, .inquiry-module-card-head h2, .home-hero-brand-name
{ line-height: 1.3 !important; }
.home-hero-desc, .inquiry-module-card-head p, .inquiry-question-box strong
{ line-height: 1.6 !important; }
.home-feature-item strong, .home-feature-item span, .inquiry-module-tags li,
.inquiry-module-card-meta span, .inquiry-module-card-source, .home-hero-bg-credit
{ line-height: 1.45 !important; }
"""

# ── K 레이어 — 색감 ─────────────────────────────────────────────────────────
# 실측: 글자색 9종, 그중 반투명 3종. 가장 많이 쓰이는 --text-muted(#6b7585)가
# 카드 위 명암비 3.49 로 WCAG AA 본문 기준(4.5) 미달이고, 히어로 크레딧의
# rgba(255,255,255,.3)은 2.70 으로 큰 글씨 기준(3.0)에도 못 미친다.
K = """
/* 회색 4단 + 반투명 3종 → 3단. muted 를 secondary 에 합쳐 대비를 6.31 로 올린다. */
:root { --text-muted: #98a2b3; --text-secondary: #98a2b3; }

/* 반투명 글자 제거 — 배경이 바뀌면 색이 바뀌어 예측할 수 없다 */
.home-hero-bg-credit { color: #98a2b3 !important; }        /* 2.70 → 6.31 */
.home-hero-brand-sub { color: #98a2b3 !important; }        /* 5.60 → 6.31 */
.inquiry-module-card-source { color: #d4dae5 !important; } /* 9.25 → 11.57 */

/* 본문은 본문색으로. 설명글이 보조색이면 화면 전체가 흐릿해 보인다. */
.inquiry-module-card-head p, .home-hero-desc { color: var(--text-primary) !important; }

/* 주황은 액션(버튼·링크)의 색으로 고정. 로고는 브랜드라 남긴다.
   kicker 의 주황은 시안 B 에서 이미 회색으로 내렸다. */
.inquiry-question-box { border-left-color: var(--accent) !important; }

/* ★ 이건 시안이 아니라 접근성 결함 수정이다.
   주황 #e8722a 위의 흰 글자는 명암비 3.06 — WCAG AA 본문 기준(4.5) 미달이고
   현재·A·B·C 모든 화면의 주요 버튼 4개가 여기 걸린다. 글자를 어둡게 하면 6.19.
   (대안: 배경을 #b4551a 로 낮추고 흰 글자를 유지하면 4.94. 주황이 탁해진다.) */
.btn-primary { color: #0d1117 !important; border-color: rgba(0,0,0,.25) !important; }
"""

# ── S 레이어 — 제목 세리프 (옵션) ───────────────────────────────────────────
# Our World in Data 방식(본문 산세리프 / 제목 세리프). 웹폰트가 하나 늘어난다.
S_LINK = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
          'family=Noto+Serif+KR:wght@600;700&display=swap">')
S = """
.home-hero-title, .inquiry-module-card-head h2 {
  font-family: 'Noto Serif KR', serif !important;
  letter-spacing: -.01em !important;
}
"""

PROBE = r"""
(()=>{const cs=e=>getComputedStyle(e),V=[...document.querySelectorAll('body *')].filter(e=>{const c=cs(e);return c.display!=='none'&&c.visibility!=='hidden'&&e.getBoundingClientRect().width>0}),bb=cs(document.body).backgroundColor;
const t=e=>(e.textContent||'').trim().replace(/\s+/g,' ');
const R={};V.forEach(e=>{const r=cs(e).borderRadius;if(r&&r!=='0px'){const v=r.split(' ')[0];R[v]=(R[v]||0)+1}});
const PILLY=/^(50%|100%|999px|1584px|9999px)$/;
const mid=Object.keys(R).filter(k=>!PILLY.test(k));
const tinted=e=>{const c=cs(e);return c.backgroundColor!=='rgba(0, 0, 0, 0)'&&c.backgroundColor!==bb};
const cand=V.filter(e=>{const r=e.getBoundingClientRect();
  return (tinted(e)||parseFloat(cs(e).borderTopWidth)>0)&&r.height>=14&&r.height<=40&&r.width<=320&&t(e).length>0&&t(e).length<=32});
const badges=cand.filter(e=>!cand.some(o=>o!==e&&e.contains(o)));
const B=['DIV','SECTION','ARTICLE','LI','ASIDE','UL','DL','NAV','HEADER','FOOTER','LABEL','DETAILS','FIGURE','FORM','TABLE'];
const cards=V.filter(e=>{const r=e.getBoundingClientRect();const c=cs(e);
  return B.includes(e.tagName)&&r.height>60&&r.width>120&&(tinted(e)||(c.borderTopStyle!=='none'&&parseFloat(c.borderTopWidth)>0))});
const both=cards.filter(e=>{const c=cs(e);return c.borderTopStyle!=='none'&&parseFloat(c.borderTopWidth)>0&&parseFloat(c.borderRadius)>0}).length;
const EMOJI=/\p{Extended_Pictographic}/u;
// ── 타이포·색 계측 ──────────────────────────────────────────────────────
const own=e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
const txt=V.filter(e=>own(e).length>0);
const uniq=f=>[...new Set(txt.map(f))];
const num=s=>(s.match(/[\d.]+/g)||[0]).map(Number);
// 실효 배경(투명이면 위로 올라가며 찾는다)
const bgOf=e=>{let p=e;while(p&&p!==document.documentElement){const b=cs(p).backgroundColor;
  if(b&&b!=='rgba(0, 0, 0, 0)'&&!/,\s*0\)$/.test(b))return b;p=p.parentElement;}return cs(document.body).backgroundColor;};
const rgb=s=>{const m=s.match(/[\d.]+/g).map(Number);return m.length>3&&m[3]<1?null:[m[0],m[1],m[2]];};
const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const lum=v=>0.2126*lin(v[0])+0.7152*lin(v[1])+0.0722*lin(v[2]);
const cr=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)};
let worst=99, fails=0, alphaText=0; const failList=[];
txt.forEach(e=>{const c=cs(e); const f=rgb(c.color); const bb2=rgb(bgOf(e));
  if(!f){alphaText++;
    const m=c.color.match(/[\d.]+/g).map(Number), g=rgb(bgOf(e));
    if(g){const bl=[0,1,2].map(i=>m[i]*m[3]+g[i]*(1-m[3]));
      const r=cr(bl,g); if(r<worst)worst=r; if(r<4.5)fails++;}
    return;}
  if(!bb2)return; const r=cr(f,bb2); if(r<worst)worst=r;
  if(r<4.5){fails++;failList.push(((e.className||'').toString().slice(0,26)||e.tagName)+' '+Math.round(r*100)/100+' "'+own(e).slice(0,14)+'"');}});
document.title=JSON.stringify({midRadius:mid.length,midList:mid.sort(),cards:cards.length,bothBorderRound:both,
  fontSizes:uniq(e=>cs(e).fontSize).length, fontWeights:uniq(e=>cs(e).fontWeight).length,
  textColors:uniq(e=>cs(e).color).length, letterSpacings:uniq(e=>cs(e).letterSpacing).length,
  lineHeights:uniq(e=>cs(e).lineHeight).length, alphaText:alphaText,
  worstContrast:Math.round(worst*100)/100, contrastFails:fails, failList:failList, textNodes:txt.length,
  badges:badges.length,badgeText:badges.map(e=>t(e).slice(0,20)),uppercase:V.filter(e=>cs(e).textTransform==='uppercase'&&e.children.length===0&&t(e).length>0).length,
  glow:V.filter(e=>{const b=cs(e).boxShadow;return b!=='none'&&!/rgba?\(0,\s*0,\s*0/.test(b)}).length,
  emoji:V.filter(e=>EMOJI.test([...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(''))).length,
  elements:V.length});})();
"""

VARIANTS = {
    "now": BASE,          # 현재
    "a": A,               # 규칙 정리
    "b": B,               # 레퍼런스 정렬
    "c": C,               # 카드 해체
    "bt": B + T,          # B + 타이포
    "bk": B + K,          # B + 색감
    "btk": B + T + K,     # B + 타이포 + 색감
    "btks": B + T + K + S,  # + 제목 세리프(옵션)
    "ctk": C + T + K,     # C + 타이포 + 색감
}


def build(raw: str, css: str, probe: bool) -> str:
    h = raw
    # 정적 스냅샷: SPA 스크립트를 떼어 DOM 을 그대로 고정한다
    h = re.sub(r"<script\b[^>]*\bsrc=[^>]*>\s*</script>", "", h, flags=re.I)
    h = re.sub(r"<script\b[^>]*>.*?</script>", "", h, flags=re.I | re.S)
    # 상대 경로 자산을 실제 서버로
    h = h.replace("<head>", '<head><base href="http://localhost:5895/">', 1)
    css = css.replace("%BLOCKS%", BLOCKS).replace("%KO_LABELS%", KO_LABELS)
    if S.strip() and S.strip() in css:
        h = h.replace("<head>", "<head>" + S_LINK, 1)
    inject = f"<style>{COMMON}\n{css}</style>"
    if probe:
        inject += f"<script>window.addEventListener('load',()=>setTimeout(()=>{{{PROBE}}},300))</script>"
    h = h.replace("</body>", inject + "</body>", 1)
    return h


def main() -> None:
    raw = RAW.read_text(encoding="utf-8")
    for name, css in VARIANTS.items():
        (HERE / f"home_{name}.html").write_text(build(raw, css, False), encoding="utf-8")
        (HERE / f"probe_{name}.html").write_text(build(raw, css, True), encoding="utf-8")
    print("built:", ", ".join(f"home_{k}.html" for k in VARIANTS))


if __name__ == "__main__":
    main()
