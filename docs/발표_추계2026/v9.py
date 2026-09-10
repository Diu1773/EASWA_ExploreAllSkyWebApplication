# -*- coding: utf-8 -*-
"""v9 — 사장님 지시 셋 (2026-09-11).

  ① 개발 방식을 웹 기능 «앞»으로 옮긴다
  ② 개발 방식에 바이브 코딩 레퍼런스와 «그걸로 만든 것들»을 넣는다 → 두 장으로 나눈다
  ③ 사용자 검토 결과·보완 요구는 그래프를 줄이고 결과를 글로 적는다

새로 넣은 문헌 넷은 2026-09-11 에 arXiv 초록을 직접 열어 확인했다. 지어내지 않는다.
  Michels et al. (2026)   arXiv:2608.20446  바이브 코딩 리뷰 (논문에 이미 있음)
  Song et al. (2026)      arXiv:2607.05406  K-12 교사가 학습 도구를 만드는 틀 (이미 있음)
  Taveter and Lepp (2026) arXiv:2607.24757  IDE 기록으로 학습 과정 시각화 웹을 며칠 만에
  Ong et al. (2026)       arXiv:2604.22604  임상의가 자기 진료 도구를 직접 만든다
  Uddin (2026)            arXiv:2604.12311  생성 코드는 돌아가도 값이 틀릴 수 있다 (이미 있음)
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "build.py")
s = io.open(P, encoding="utf-8").read()

# ── 옛 「개발 방식과 검증」을 떼어 낸다 ────────────────────────────
i = s.index("# ═════ 개발 방식과 검증 ═") if "# ═════ 개발 방식과 검증 ═" in s \
    else s.index('y = title(sl, "개발 방식과 검증",')
i = s.rindex("# ═════", 0, i)
j = s.index("# ═════", i + 10)
s = s[:i] + s[j:]

NEW = '''# ═════ 개발 방식 ① 바이브 코딩 ═══════════════════════════════════════
sl = S()
y = title(sl, "개발 방식 ① 바이브 코딩",
          "자연어로 의도를 적고 생성된 코드를 실행해 확인하는 방식이 전문 개발자 밖으로 퍼짐")
bullets(sl, M, y + 0.05, W - 2 * M, [
    ("전문 개발자가 아니어도 웹 응용을 구성할 수 있는 범위가 넓어졌음 — 실행·생산성·위험을 "
     "함께 정리한 리뷰가 나옴 (Michels et al., 2026)", BODY, False),
    ("K-12 교사가 이 방식으로 수업용 학습 도구를 직접 만드는 과정을 다룬 연구 — 8주 워크숍, "
     "교사 3명·멘토 4명 (Song et al., 2026)", BODY, False),
    ("프로그래밍 수업의 IDE 활동 기록을 읽어 학습 과정을 보여 주는 웹 응용을 며칠 만에 만들어 "
     "수강생 160명 수업에 시범 적용 (Taveter and Lepp, 2026)", BODY, False),
    ("코딩 배경이 없는 임상의가 진료 현장의 문제를 푸는 도구를 직접 만드는 사례 "
     "(Ong et al., 2026)", BODY, False),
    ("", BODY, False),
    ("→ 도메인을 아는 사람이 «자기 문제를 푸는 도구»를 직접 만드는 흐름. 이 연구도 그 자리에 있음",
     ACC, True),
], size=17, gap=12)
cite(sl, "arXiv:2608.20446 · 2607.05406 · 2607.24757 · 2604.22604. 2026-09-11 초록 확인.")

# ═════ 개발 방식 ② 그래서 값을 따로 검증했음 ══════════════════════════
sl = S()
y = title(sl, "개발 방식 ② 그래서 값을 따로 검증했음",
          "화면이 돌아가는 것과 값이 맞는 것은 별개임")
bullets(sl, M, y + 0.05, W - 2 * M, [
    ("수업 맥락을 아는 연구자가 직접 구현. 사용 범위는 프론트엔드·백엔드 코드 초안·오류 "
     "수정·반복 구현", BODY, False),
    ("탐구 구조와 단계 설계, 학습자에게 개방할 분석 조건, 천문 모델과 가정은 연구자가 정함",
     BODY, False),
    ("생성된 코드는 오류 없이 실행되면서도 산출값이 틀릴 수 있음 (Uddin, 2026)",
     WARN, True),
    ("", BODY, False),
    ("→ 산출값은 문헌값과 대조하고, 화면의 안내 문장은 사용자 검토로 점검함", ACC, True),
    ("같은 자료·같은 설정을 반복 실행하면 WASP-6 b 반지름비가 0.14534 로 재현됨. "
     "처리 조건을 바꾼 민감도 점검은 부록 1", BODY, False),
    ("개발 방식 간 비교는 하지 않았음. 시간·비용을 기록하지 않아 빨랐다고 말할 수 없음",
     GREY, False),
], size=17, gap=11)

'''

# ── 웹 기능 ① 바로 앞에 끼워 넣는다 ───────────────────────────────
k = s.index("# ═════ 5. 웹 기능 ① ═") if "# ═════ 5. 웹 기능 ① ═" in s \
    else s.index('y = title(sl, "웹 기능 ① 탐구 질문 진입",')
k = s.rindex("# ═════", 0, k)
s = s[:k] + NEW + s[k:]

# ── 검토 결과·보완 요구를 그림 왼쪽 + 글 오른쪽으로 ───────────────
old = '''sl = S()
y = title(sl, "사용자 검토 결과",
          "실행 부담은 낮고 기준값 해석이 최하위였음")
pic(sl, "fig_survey_likert.png", M, y - 0.02, W - 2 * M, H - y - 0.62, root=HERE)
cite(sl, "1차 현직교사 중심 13명 (2026-07-24) · 2차 예비교사 13명 (2026-09-06~07). "
         "5점 척도. * 는 역채점한 부정 진술.")'''
new = '''sl = S()
y = title(sl, "사용자 검토 결과",
          "실행 부담은 낮고 기준값 해석이 최하위였음")
pic(sl, "fig_survey_likert.png", M, y, 6.55, H - y - 0.75, root=HERE)
bullets(sl, M + 6.95, y + 0.10, W - M - 6.95 - M + 0.4, [
    ("코딩 환경 없이 분석 과정을 따라간다 — 두 조사 최고 (4.54 · 4.75)", BODY, False),
    ("자료 출처·관측 정보 제시와 분석 조건을 직접 조정하는 기능도 상위", BODY, False),
    ("기준값 비교 화면에서 무엇을 해석할지 어렵다 — 두 조사 모두 최하위 (3.46 · 3.23)",
     WARN, True),
    ("화면이 복잡해 흐름 파악이 어렵다도 하위 (3.54 · 3.92)", BODY, False),
    ("→ 실행 부담은 낮아졌고 해석 지원이 남음", ACC, True),
], size=14, gap=11)
cite(sl, "1차 현직교사 중심 13명 (2026-07-24) · 2차 예비교사 13명 (2026-09-06~07). 5점 척도. "
         "* 는 역채점한 부정 진술. 두 조사는 참여 집단과 플랫폼 버전이 함께 달라 차이를 "
         "보완의 효과로 읽지 않았음.")'''
assert s.count(old) == 1
s = s.replace(old, new)

old = '''sl = S()
y = title(sl, "보완 요구",
          "용어·그래프 해석과 수업용 자료에 몰림")
pic(sl, "fig_survey_needs.png", M, y - 0.05, W - 2 * M, H - y - 0.58, root=HERE)
cite(sl, "(a) 2차 예비교사 13명 · (b) 두 조사의 보완 요구(복수선택).")'''
new = '''sl = S()
y = title(sl, "보완 요구",
          "용어·그래프 해석과 수업용 자료에 몰림")
pic(sl, "fig_survey_needs.png", M, y, 6.55, H - y - 0.75, root=HERE)
bullets(sl, M + 6.95, y + 0.10, W - M - 6.95 - M + 0.4, [
    ("안내 문장의 뜻은 11명이 화면만 보고 파악함 (2차 N=13)", BODY, False),
    ("용어·기호와 그래프 읽기는 5명이 사람의 도움을 받음", WARN, True),
    ("보완 요구 최다는 수업용 활동지·교사용 안내 자료 (1차 6명 · 2차 10명)", BODY, False),
    ("그래프·분석 결과 해석 도움말 (8 · 6), 기준값 비교·차이 원인 설명 강화 (7 · 6)",
     BODY, False),
    ("→ 자동화로 덮이지 않는 자리가 용어와 해석임", ACC, True),
], size=14, gap=11)
cite(sl, "(a) 이해·수행에 필요했던 도움, 2차 예비교사 13명 · (b) 두 조사의 보완 요구(복수선택).")'''
assert s.count(old) == 1
s = s.replace(old, new)

# ── 참고문헌 둘 추가 ──────────────────────────────────────────────
old = '    "Paczynski B (1986) Gravitational microlensing by the galactic halo. ApJ 304: 1-5.",'
new = ('    "Ong A Y, Livingstone I, Kilduff C, et al. (2026) Vibe coding for clinicians: '
       'democratising bespoke software development for digital health innovation. arXiv:2604.22604.",\n'
       '    "Paczynski B (1986) Gravitational microlensing by the galactic halo. ApJ 304: 1-5.",')
assert s.count(old) == 1
s = s.replace(old, new)

old = '    "Uddin S M J (2026) Is vibe coding the future?'
new = ('    "Taveter H and Lepp M (2026) From idea to classroom in days: Using vibe coding to create '
       'a programming process visualizer from IDE activity logs. arXiv:2607.24757.",\n'
       '    "Uddin S M J (2026) Is vibe coding the future?')
assert s.count(old) == 1
s = s.replace(old, new)

# 열아홉 건이라 더 줄인다
s = s.replace("put(f, r, 11.5, BODY, space_after=4, first=(i == 0), line=1.08)",
              "put(f, r, 10.5, BODY, space_after=3, first=(i == 0), line=1.06)")

io.open(P, "w", encoding="utf-8", newline="\n").write(s)
print("개발 방식을 웹 기능 앞으로 · 두 장으로 · 검토 결과와 보완 요구에 글 추가")
