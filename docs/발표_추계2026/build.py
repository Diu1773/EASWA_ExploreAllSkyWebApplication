# -*- coding: utf-8 -*-
"""한국지구과학회 추계 AS2(천문) 구두발표 — 15분 슬롯(발표 12 · 질의 3).

v2 (2026-09-10 밤) — 사장님 지시로 구성을 바꿨다.
  늘림 : 왜 만들었나(동기) · 웹 기능 셋 · 바이브 코딩과 그래서 한 검증 · 검토 결과
  줄임 : 사례분석 절차와 설계 원리 도출 같은 «방법» 서술

  python deck/build.py

흰 바탕이다. 2026-09-10 밤에 EASWA 다크 서식으로도 만들어 봤으나 사장님이
「눈에 안 들어온다」고 물리셨다. 강의실 프로젝터에서는 흰 바탕이 맞다.
"""
import os
from pptx import Presentation
from pptx.util import Inches as I, Pt, Emu
from pptx.dml.color import RGBColor as C
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image

FIG = r"C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos/원고_그림"
HERE = os.path.dirname(os.path.abspath(__file__))
DEST = r"C:/Users/bmffr/Desktop/Me/ERP2026_Cosmos/추계학술발표회"

OUT = os.path.join(DEST, "EASWA_지구과학회_구두발표_2026-09-18.pptx")

BG = C(0xFF, 0xFF, 0xFF)
ACC = C(0x1F, 0x4E, 0x79)
ACC2 = C(0x2E, 0x75, 0xB6)
GREY = C(0x70, 0x70, 0x70)
WARN = C(0xC0, 0x00, 0x00)
BODY = C(0x1A, 0x1A, 0x1A)
HEAD = C(0x1F, 0x4E, 0x79)
TBLHEAD = C(0x1F, 0x4E, 0x79)
TBLTEXT = C(0x1A, 0x1A, 0x1A)
RULEC = C(0xD9, 0xD9, 0xD9)
WHITE = C(0xFF, 0xFF, 0xFF)

F = "맑은 고딕"
W, H = 13.333, 7.5
M = 0.62

prs = Presentation()
prs.slide_width, prs.slide_height = I(W), I(H)
BLANK = prs.slide_layouts[6]


def S():
    return prs.slides.add_slide(BLANK)


def tb(sl, x, y, w, h, align=PP_ALIGN.LEFT):
    s = sl.shapes.add_textbox(I(x), I(y), I(w), I(h))
    f = s.text_frame
    f.word_wrap = True
    f.margin_left = f.margin_right = f.margin_top = f.margin_bottom = 0
    f.paragraphs[0].alignment = align
    return f


def put(f, text, size, color=None, bold=False, space_after=0, first=False,
        align=None, line=1.25):
    p = f.paragraphs[0] if first else f.add_paragraph()
    if align is not None:
        p.alignment = align
    p.line_spacing = line
    p.space_after = Pt(space_after)
    r = p.add_run()
    r.text = text
    r.font.size, r.font.bold, r.font.name = Pt(size), bold, F
    r.font.color.rgb = color if color is not None else BODY
    return p


def title(sl, text, sub=None):
    """행동 제목 — 요지를 문장으로 적는다."""
    f = tb(sl, M, 0.42, W - 2 * M, 1.0)
    put(f, text, 25, HEAD, True, first=True, line=1.15)
    if sub:
        g = tb(sl, M, 1.42, W - 2 * M, 0.4)
        put(g, sub, 16, C(0x44, 0x44, 0x44), first=True)
        return 2.00
    return 1.68


def cite(sl, text):
    f = tb(sl, M, H - 0.54, W - 2 * M, 0.34)
    put(f, text, 12, GREY, first=True)


def pic(sl, name, x, y, maxw, maxh, root=FIG, top=False):
    p = os.path.join(root, name)
    iw, ih = Image.open(p).size
    sc = min(maxw / iw, maxh / ih)
    w, h = iw * sc, ih * sc
    dy = 0 if top else (maxh - h) / 2
    sl.shapes.add_picture(p, I(x + (maxw - w) / 2), I(y + dy), I(w), I(h))


# 화면 캡처를 통째로 넣으면 강의실 뒤에서 글자가 안 읽힌다(2026-09-10 확인).
# 내비게이션과 제목 영역을 잘라내고 내용만 남긴다. 원본은 2880×2300 이다.
CROP = {
    "step0_entry.png":     (225, 730, 2700, 1700),   # 탐구 질문 + 시뮬레이션 + 광도곡선
    "step3_conditions.png": (255, 800, 2700, 2300),  # Step 3 머리부터 구경·배경 카드까지
}


def crop(name):
    """잘라 둔 사본을 만들고 그 이름을 준다. 이미 있으면 그대로 쓴다."""
    box = CROP.get(name)
    if not box:
        return name
    out = "_crop_" + name
    dst = os.path.join(HERE, out)
    if not os.path.exists(dst):
        Image.open(os.path.join(FIG, name)).crop(box).save(dst)
    return out


def bullets(sl, x, y, w, items, size=19, gap=13):
    f = tb(sl, x, y, w, H - y - 0.85)
    for i, (t, c, b) in enumerate(items):
        put(f, t, size, c, b, space_after=gap, first=(i == 0))


def rule(sl, y, x=M, w=None, color=None):
    w = w if w else W - 2 * M
    s = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, I(x), I(y), I(w), Emu(12700))
    s.fill.solid()
    s.fill.fore_color.rgb = color if color is not None else RULEC
    s.line.fill.background()
    s.shadow.inherit = False


# ═════ 1. 표제 ════════════════════════════════════════════════════════
sl = S()
f = tb(sl, M, 2.20, W - 2 * M, 1.7)
put(f, "천문 탐구 웹 플랫폼 EASWA의", 36, HEAD, True, first=True, line=1.2)
put(f, "개발과 현장 적용 방안", 36, HEAD, True, line=1.2)
rule(sl, 4.18, M, 3.2, ACC)
f = tb(sl, M, 4.48, W - 2 * M, 1.5)
put(f, "박민준 · 손정주", 20, BODY, True, first=True, space_after=6)
put(f, "한국교원대학교 지구과학교육과", 16, GREY, space_after=18)
put(f, "2026년 한국지구과학회 추계학술발표회 · AS2 천문 · 9월 18일 11:15", 14, GREY)

# ═════ 2. 왜 만들었나 ═════════════════════════════════════════════════
sl = S()
y = title(sl, "연구 배경",
          "자료는 공개되어 있으나 수업에서 쓰려면 준비 절차가 앞섬")
bullets(sl, M, y, W - 2 * M, [
    ("MAST · Gaia · KMTNet 등 공개 아카이브가 영상·시계열 측광·측성 카탈로그를 상시 제공 — "
     "자료는 이미 충분함 (Fitzgerald et al., 2014; Hasan and Hasan, 2021)", BODY, False),
    ("그러나 수업에서 쓰려면 검색 → 내려받기 → 형식 변환 → 코딩 → 반복 계산을 먼저 지나야 함. "
     "학습 목표와 무관한 절차임", BODY, False),
    ("교사 조사에서도 수업에 적합한 자료에 접근하는 일(53%)과 자료를 수업에 통합하는 "
     "일(47%)이 가장 큰 어려움으로 보고됨 (Wong et al., 2026)", BODY, False),
    ("코딩 기반 교사교육에서도 현직·예비교사 모두 파이썬 코딩을 학교 적용의 "
     "가장 큰 어려움으로 꼽았음 (조훈·손정주, 2022; 공병민 외, 2023)", BODY, False),
    ("", BODY, False),
    ("→ 준비는 도구가 지고, 자료 확인·조건 선택·해석은 학습자가 하도록 설계함",
     ACC, True),
], size=18, gap=11)
cite(sl, "교육부 (2022) 과학과 교육과정 [별책 9]")

# ═════ 3. 기존 웹의 지형 — 두 갈래 ════════════════════════════════════
sl = S()
y = title(sl, "기존 웹 환경",
          "자료 제공 서비스는 탐구 흐름이 없고, 교육 지향 환경은 자료와 주제가 미리 정해져 있음")

CW = 5.95
LX, RX = M, M + CW + 0.25


def col(x, head, note, items, tail):
    f = tb(sl, x, y + 0.02, CW, 0.4)
    put(f, head, 17, ACC, True, first=True, space_after=2)
    put(f, note, 12, GREY)
    g = tb(sl, x, y + 0.82, CW, 3.3)
    for k, t in enumerate(items):
        put(g, t, 13, BODY, space_after=9, first=(k == 0), line=1.18)
    h = tb(sl, x, y + 3.74, CW, 0.85)
    put(h, tail, 14, ACC, True, first=True, line=1.2)


col(LX, "자료 제공 서비스", "네 곳을 학교 활용 관점에서 워크스루 (사례분석 대상)", [
    "SIMBAD — 천체명·좌표로 식별 정보와 문헌 확인 (Wenger et al., 2000). "
    "탐구 분석용 원자료는 따로 구해야 함",
    "VizieR — 카탈로그·표를 조건 검색 (Ochsenbein et al., 2000). 항목·단위 선택이 부담",
    "WorldWide Telescope — 하늘 지도 위 시각 탐색 (Rosenfield et al., 2018). "
    "정량 분석은 외부로 위임",
    "ESASky — 미션·파장별 통합 탐색과 내려받기 (Baines et al., 2017). "
    "자료 판단과 탐구 연계는 학습자 몫",
], "→ 질문에서 출발하는 진입 경로는 없었음")

col(RX, "교육 지향 환경", "탐구 흐름은 이미 갖추고 있어 사례분석에서는 제외", [
    "Agent Exoplanet (LCO) — 공개 외계행성 자료로 웹에서 측광·광도곡선. "
    "2026년 9월 확인 시 운영 종료",
    "DIY Planet Search — 위 후속. 학습자가 원격 망원경으로 직접 얻은 영상을 사용",
    "Planet Hunters · Galaxy Zoo — 대중이 관측자료를 분류·검토 "
    "(Fischer et al., 2012; Raddick et al., 2019)",
    "WWT 기반 교육 프로그램 (Guo et al., 2024; Udomprasert et al., 2012) · "
    "SDSS Voyages · ESA CESAR · Rubin Observatory 온라인 탐구활동 "
    "(Herrold and Prather, 2023)",
], "→ 학습 주제와 자료 유형이 미리 정해져 있음")

rule(sl, H - 1.30)
f = tb(sl, M, H - 1.12, W - 2 * M, 0.7)
put(f, "EASWA 의 자리 — 공개 아카이브 자료를 쓰면서, 자료 구조가 다른 세 주제를 "
       "같은 탐구 흐름에 둠", 17, ACC, True, first=True)
cite(sl, "목록과 판정은 논문 1.2 · 3.2 · 표 3. 네 서비스의 진입 화면과 교사 장벽 응답은 부록 2.")

# ═════ 4. EASWA 개요 ══════════════════════════════════════════════════
sl = S()
y = title(sl, "EASWA의 구조",
          "자료가 다른 세 모듈에 같은 일곱 단계를 적용함")
f = tb(sl, M, y - 0.08, W - 2 * M, 0.34)
put(f, "탐구 주제 소개 → 대상 선택 → 자료 확인 → 분석 준비 → 분석·시각화 → "
       "기준값 비교 → 해석·기록", 13, GREY, first=True)
y += 0.30
rows = [
    ("모듈", "공공 자료", "분석 구조", "학습자가 정하는 것"),
    ("TESS 외계행성 식현상", "TESS FFI 컷아웃", "구경·차등측광 → 식현상 모델 적합", "측광 구경 · 배경 · 비교성"),
    ("KMTNet 미시중력렌즈", "관측소별 공개 측광표", "다지점 병합 → 점렌즈 모델 적합", "적합 대상 · 조건 확인"),
    ("Gaia 성단 색등급도", "Gaia DR3 카탈로그", "구성원 선별 → 색등급도 → 등시선 맞춤", "선별 엄격도 · 나이 · 거리 · 소광"),
]
tw = W - 2 * M
tbl = sl.shapes.add_table(4, 4, I(M), I(y + 0.10), I(tw), I(2.4)).table
for c, wd in zip(range(4), (3.05, 2.85, 4.30, 3.90)):
    tbl.columns[c].width = I(tw * wd / 14.1)
for r, row in enumerate(rows):
    tbl.rows[r].height = I(0.60 if r else 0.44)
    for c, v in enumerate(row):
        cell = tbl.cell(r, c)
        cell.text = v
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        cell.margin_left = cell.margin_right = I(0.10)
        cell.fill.solid()
        cell.fill.fore_color.rgb = TBLHEAD if r == 0 else BG
        p = cell.text_frame.paragraphs[0]
        p.line_spacing = 1.1
        for run in p.runs:
            run.font.size = Pt(14)
            run.font.name = F
            run.font.bold = (r == 0)
            run.font.color.rgb = WHITE if r == 0 else TBLTEXT
f = tb(sl, M, y + 2.72, tw, 1.1)
put(f, "설치·로그인 없이 브라우저에서 바로 열림", 17, BODY, first=True, space_after=8)
put(f, "다만 세부 구현과 검토 범위는 같지 않음 — 사용자 검토를 받은 것은 식현상 모듈뿐임",
    17, WARN, True)

# ═════ 5. 웹 기능 ① ═══════════════════════════════════════════════════
sl = S()
y = title(sl, "웹 기능 ① 탐구 질문 진입",
          "천체명·좌표가 아닌 질문에서 대상과 자료로 이어짐")
pic(sl, crop("step0_entry.png"), M, y, 7.75, H - y - 0.75, root=HERE)
bullets(sl, M + 8.15, y + 0.2, W - M - 8.15 - M + 0.45, [
    ("첫 화면에 세 모듈을 대표 탐구 질문·사용 자료와 함께 제시", BODY, False),
    ("「행성 크기를 어떻게 알아낼 수 있을까」에서 출발해 대상과 자료로 연결", BODY, False),
    ("자료 확인 단계에서 섹터·케이던스·관측 기간을 먼저 읽게 함", BODY, False),
    ("자료를 고르는 일 자체가 탐구의 일부임", ACC, True),
], size=17, gap=15)

# ═════ 6. 웹 기능 ② ═══════════════════════════════════════════════════
sl = S()
y = title(sl, "웹 기능 ② 분석 조건 설정",
          "구경·배경·비교성을 학습자가 정함")
pic(sl, crop("step3_conditions.png"), M, y, 7.75, H - y - 0.75, root=HERE, top=True)
bullets(sl, M + 8.15, y + 0.2, W - M - 8.15 - M + 0.45, [
    ("구경 반지름·배경 고리·비교성을 학습자가 정함 (기본 2.5픽셀 · 4.0~6.0픽셀)", BODY, False),
    ("측광·모델 적합은 자동이나 조건과 품질 지표는 가리지 않음", BODY, False),
    ("조건이 값을 바꾼다는 것 자체가 학습 내용임", ACC, True),
], size=17, gap=15)

# ═════ 7. 웹 기능 ③ ═══════════════════════════════════════════════════
sl = S()
y = title(sl, "웹 기능 ③ 기준값 비교와 기록",
          "산출값을 카탈로그 값과 나란히 두고 해석을 남김")
pic(sl, "_panel_step5_reference-step6_record.png", M, y + 0.05, W - 2 * M, 3.95)
bullets(sl, M, y + 4.12, W - 2 * M, [
    ("왼쪽 — 위상 접기 광도곡선에 적합 모델과 카탈로그 기대 모델을 겹치고 잔차를 함께 제시. "
     "기준 반지름비는 아카이브 수록값을 받아 옴", BODY, False),
    ("오른쪽 — 해석 질문과 서술형 기록 칸. 과제는 값 맞히기가 아니라 차이 설명임",
     ACC, True),
], size=16, gap=9)
cite(sl, "대상 WASP-6 b · 자료 MAST TESScut · 기준값 NASA Exoplanet Archive")

# ═════ 8. 바이브 코딩 ═════════════════════════════════════════════════
sl = S()
y = title(sl, "개발 방식과 검증",
          "AI가 쓴 코드는 실행되어도 값이 틀릴 수 있음")
bullets(sl, M, y, W - 2 * M, [
    ("수업 맥락을 아는 연구자가 자연어로 의도를 적고 생성된 코드를 실행해 확인하는 방식으로 직접 구현함",
     BODY, False),
    ("사용 범위는 프론트엔드·백엔드 코드 초안·오류 수정·반복 구현. "
     "탐구 구조와 단계 설계, 개방할 분석 조건, 천문 모델과 가정은 연구자가 정함", BODY, False),
    ("생성된 코드는 오류 없이 실행되면서도 산출값이 틀릴 수 있음 — "
     "화면이 돌아간다고 값을 믿을 수 없음", WARN, True),
    ("", BODY, False),
    ("→ 산출값은 문헌값과 대조, 화면 안내 문장은 사용자 검토로 점검",
     ACC, True),
    ("같은 자료·같은 설정을 반복 실행하면 WASP-6 b 반지름비가 0.14534로 재현됨. "
     "처리 조건을 바꾼 민감도 점검 결과는 부록에 둠", BODY, False),
    ("개발 방식 간 비교는 하지 않았음. 시간·비용을 기록하지 않아 빨랐다고 말할 수 없음", GREY, False),
], size=18, gap=13)
cite(sl, "Michels et al. (2026) · Song et al. (2026) · Uddin (2026)")

# ═════ 11. 결과 ③ 사용자 검토 ═════════════════════════════════════════
# 그림 둘은 다른 세션이 논문용으로 만든 정본이다(docs/make_survey_figs.py).
# 발표와 논문이 같은 그림을 쓰도록 그것을 그대로 가져온다. 다크판은 색만 바꾼 사본이다.
sl = S()
y = title(sl, "사용자 검토 결과",
          "실행 부담은 낮고 기준값 해석이 최하위였음")
pic(sl, "fig_survey_likert.png", M, y - 0.02, W - 2 * M, H - y - 0.62, root=HERE)
cite(sl, "1차 현직교사 중심 13명 (2026-07-24) · 2차 예비교사 13명 (2026-09-06~07). "
         "5점 척도. * 는 역채점한 부정 진술.")

# ═════ 12. 현장 적용 ══════════════════════════════════════════════════
sl = S()
y = title(sl, "보완 요구",
          "용어·그래프 해석과 수업용 자료에 몰림")
pic(sl, "fig_survey_needs.png", M, y - 0.05, W - 2 * M, H - y - 0.58, root=HERE)
cite(sl, "(a) 2차 예비교사 13명 · (b) 두 조사의 보완 요구(복수선택).")

# ═════ 11. 후속 과제 ══════════════════════════════════════════════════
sl = S()
y = title(sl, "후속 과제",
          "학생 적용과 수업 자료가 먼저, 나머지 두 모듈 검토가 그다음임")
bullets(sl, M, y + 0.05, W - 2 * M, [
    ("① 고등학생이 직접 수행하는 조건에서 탐구 과정과 자료 기반 설명을 분석 — "
     "이번 검토는 교사 대상이었고 학생 수행 자료는 없음", BODY, False),
    ("② 수업 시나리오와 학생용 활동지·교사용 안내 자료를 함께 개발 — "
     "두 조사에서 가장 많이 요구된 항목임", BODY, False),
    ("③ KMTNet·성단 색등급도 모듈에도 산출값 점검과 사용자 검토를 식현상 모듈과 "
     "같은 수준으로 수행", BODY, False),
    ("④ 변광성·H-R도·태양활동·은하 스펙트럼 등 다른 자료 유형과 외부 개발자가 모듈을 "
     "추가하는 조건에서 공통 흐름의 재사용 가능성을 검토", BODY, False),
    ("⑤ 학습자의 숙련에 따라 안내와 분석 조건의 개방 정도를 조절하는 설계", BODY, False),
    ("", BODY, False),
    ("→ ①②가 먼저임. 해석 지원이 남은 과제로 확인된 이상 학생이 실제로 어디서 "
     "막히는지부터 봐야 함", ACC, True),
], size=17, gap=11)

# ═════ 13. 결론 ═══════════════════════════════════════════════════════
sl = S()
y = title(sl, "결론",
          "조건을 드러내야 차이를 설명하는 활동이 성립함")
bullets(sl, M, y + 0.15, W - 2 * M, [
    ("공개 천문 아카이브 세 자료를 같은 일곱 단계 흐름에 올려 코딩 없이 웹에서 "
     "분석하도록 구현함", BODY, False),
    ("AI 코딩 도구로 만들었기에 산출값을 따로 검증함 — 반복 실행에서 재현되었고 "
     "문헌값과 대조하였음", BODY, False),
    ("교사 26명 검토에서 실행 부담 완화는 확인, 기준값 비교 화면의 해석 지원이 "
     "다음 과제로 남음", BODY, False),
    ("", BODY, False),
    ("실행을 돕는 일과 해석을 돕는 일은 다른 과제임", ACC, True),
], size=18, gap=14)
rule(sl, H - 1.38)
f = tb(sl, M, H - 1.20, W - 2 * M, 0.9)
put(f, "https://easwa-webapp.onrender.com", 18, ACC, True, first=True, space_after=5)
put(f, "박민준 · 한국교원대학교 지구과학교육과 · pmj3265@gmail.com", 13, GREY)

# ═════ 14. 참고문헌 ═══════════════════════════════════════════════════
sl = S()
y = title(sl, "참고문헌")
refs = [
    "Baines D et al. (2017) Visualization of multi-mission astronomical data with ESASky. PASP 129: 028001.",
    "Fitzgerald M T, Hollow R, Rebull L M, Danaia L and McKinnon D H (2014) A review of high school level astronomy student research projects over the last two decades. PASA 31: e037.",
    "Gaia Collaboration, Vallenari A, Brown A G A, et al. (2023) Gaia Data Release 3. A&A 674: A1.",
    "Hasan P and Hasan S N (2021) Astronomy data, virtual observatory and education. Proc. IAU 15(S367): 151-154.",
    "Kreidberg L (2015) batman: BAsic Transit Model cAlculatioN in Python. PASP 127: 1161-1165.",
    "Mandel K and Agol E (2002) Analytic light curves for planetary transit searches. ApJ 580: L171-L175.",
    "Michels D L, Abu Ghazaleh M, Lazzari F, Kassem N and Klein J (2026) Vibe coding: Practice, performance, productivity, and risk. arXiv:2608.20446.",
    "Ochsenbein F, Bauer P and Marcout J (2000) The VizieR database of astronomical catalogues. A&AS 143: 23-32.",
    "Paczynski B (1986) Gravitational microlensing by the galactic halo. ApJ 304: 1-5.",
    "Rosenfield P, Fay J, Gilchrist R K, et al. (2018) AAS WorldWide Telescope. ApJS 236: 22.",
    "Song Y, Choi S, Kim J, Kim Y, Weisberg L and Moon J (2026) A guiding framework for K-12 teachers in creating AI-powered learning technologies through vibe coding. arXiv:2607.05406.",
    "Uddin S M J (2026) Is vibe coding the future? An empirical assessment of LLM generated codes for construction safety. arXiv:2604.12311.",
    "Wenger M, Ochsenbein F, Egret D, et al. (2000) The SIMBAD astronomical database. A&AS 143: 9-22.",
    "Wong N, Elsayed R, Perez L R, Nilsen K, Daehler K R and Darche S (2026) Data-rich science instruction. Education Sciences 16: 171.",
    "공병민, 공민규, 이현정, 임호성, 심현진 (2023) 우주 망원경 영상 데이터를 활용한 코딩 기반 천문 교육 프로그램의 개발과 적용. 현장과학교육 17(3): 331-345.",
    "조훈, 손정주 (2022) 고등학교 천문학 수업에서 코딩을 활용한 데이터 기반 탐구활동의 활성화 방안 탐색. 현장과학교육 16(5): 602-618.",
    "교육부 (2022) 과학과 교육과정. 교육부 고시 제2022-33호 [별책 9].",
]
f = tb(sl, M, y, W - 2 * M, H - y - 0.6)
for i, r in enumerate(refs):
    put(f, r, 11.5, BODY, space_after=4, first=(i == 0), line=1.08)

# ═════ 부록. 질문이 나오면 넘긴다 ═════════════════════════════════════
sl = S()
y = title(sl, "부록 · WASP-121 b 처리 조건별 결과",
          "-12.8%가 -2.8%까지 좁혀짐")
f = tb(sl, M, y - 0.08, W - 2 * M, 0.34)
put(f, "다섯 조건은 서로 다른 처리를 여러 개 함께 포함 — 순서대로 누적되지 않고 "
       "한 요인의 효과로도 읽을 수 없음", 13, GREY, first=True)
y += 0.30
pic(sl, "fig_table7.png", M, y - 0.02, W - 2 * M, H - y - 0.62, root=HERE)
cite(sl, "Daylan et al. (2021)과 같은 자료(TESS 섹터 7 · 2분 케이던스)를 별도 스크립트로 분석. "
         "플랫폼의 전체 실행 경로와는 다름. 남은 -2.8%와 비교성 효과는 나누지 못함.")

# ═════ 부록 2. 네 서비스의 진입 화면 ══════════════════════════════════
sl = S()
y = title(sl, "부록 · 자료 제공 서비스 네 곳의 진입 화면",
          "네 곳 모두 천체명·좌표·카탈로그·하늘 영역에서 시작함")
pic(sl, "case_stage1_entry.png", M, y, W - 2 * M, (H - 1.30) - y - 0.12)
f = tb(sl, M, H - 1.18, W - 2 * M, 0.7)
put(f, "교사에게 예시 화면을 보이고 예상 장벽을 물은 결과 — 학생 수준 재구성 11명(84.6%), "
       "영어 인터페이스·전문 용어 10명(76.9%)", 16, ACC2, True, first=True)
cite(sl, "학교 활용 관점의 연구자 워크스루 · 분석 기준과 결과는 논문 표 2·3. "
         "장벽 응답은 1차 현직 중심 N=13.")

os.makedirs(DEST, exist_ok=True)
prs.save(OUT)
print("저장 — %s" % OUT)
print("  %d장 · %.1f MB" % (len(prs.slides._sldIdLst), os.path.getsize(OUT) / 1e6))
