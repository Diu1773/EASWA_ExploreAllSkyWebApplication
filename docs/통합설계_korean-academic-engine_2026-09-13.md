# 한국어 학술 편집 스킬 통합 설계 — 검토와 수정안 (2026-09-13)

외부 모델이 낸 `korean-academic-engine` 설계를 검토했다. **뼈대는 맞다.** 고칠 것 다섯,
빠진 것 둘, 그리고 제안이 놓친 저장소 하나가 있다.

---

## 0. 왜 급한가 — 문제가 이미 현실이다

지금 `~/.claude/skills/` 에 열 개가 있다.

```
academic-pptx  create-academic-poster  humanize  humanize-korean
humanize-redo  make-poster  paper-kr  paper-proofread  retrospective  textbook
```

`humanize-korean` 은 v2.3.2 오케스트레이터로 「10대 카테고리 70개 AI 티 패턴」을 가지고
있고 전용 에이전트가 넷(`humanize-diagnostician`·`finalizer`·`monolith`·
`korean-ai-tell-taxonomist`) 붙어 있다. 2026-09-13 에 `paper-proofread` 를 하나 더 얹었다.

**「교정해줘」라고 하면 무엇이 뜰지 예측할 수 없다.** 통합은 취향이 아니라 정리다.

---

## 1. 맞는 것 — 그대로 간다

| | 왜 맞나 |
|---|---|
| 최상위 스킬 하나 + 나머지는 라이브러리 | 위 0절이 그 근거다 |
| `vendor/` 에 원본 고정 (submodule 또는 commit 고정) | upstream 이 바뀌어도 하네스가 안 무너진다 |
| 모든 지적을 하나의 `Issue[]` 스키마로 | 누가 냈든 `debate`·`revise` 가 같은 것을 받는다 |
| humanizer 는 AUDIT 만, 자동 적용 금지 | 2절 실측이 이것을 강하게 뒷받침한다 |
| 분쟁 있는 문장만 토론 | 값이 든다. 다만 6절 단서 |
| `harness` + `corpus` + `tests` 가 진짜 자산 | 오픈소스는 대체되고 이건 안 된다 |

---

## 2. humanizer 를 낮추라는 판단은 맞다 — 실측하면 더 심하다

게재 논문 267편(현장과학교육 2008~2022, 34,028문장)에 humanizer 계열이 「AI 티」로 잡는
꼴을 대 봤다.

| 패턴 | 게재 논문이 쓰는 비율 | 판정 |
|---|---|---|
| **~적(的)** | **267편 100.0%** | 지우면 안 된다 |
| **~고 있다** | **243편 91.0%** | 〃 |
| **이러한** | **232편 86.9%** | 〃 |
| **본 연구에서는** | **177편 66.3%** | 〃 |
| 분석 결과 | 82편 30.7% | 흔하다 |
| ~에 있어서 | 63편 23.6% | 흔하다 |
| ~라 할 수 있다 | 30편 11.2% | 드물다 |
| 시사한다 | 25편 9.4% | 드물다 |

「논리 표지가 사라진다」는 우려가 맞다. **「~적」은 267편이 전부 쓴다.**

---

## 3. 고칠 것 다섯

### 3-1. `nyjin/humanizer-ko` 는 라이선스가 없다 — vendor 에 담으면 안 된다

`LICENSE` 404, GitHub API 의 `license` 도 `None`. 라이선스가 없으면 저작권이 유보된다.
참고만 하거나 저자에게 문의한다. **제안은 이것을 `vendor/humanizer-ko/` 로 넣으라고 했다.**

### 3-2. `rule_priority` 를 출처별로 매기면 안 된다 — 가장 중요하다

`paper_proofread: 60` 으로 두면 이렇게 된다.

| 규칙 | 출처 | 제안의 우선순위 | 실제 (게재 논문 사용률) |
|---|---|---|---|
| 시켜지다 | paper-proofread | 60 | **0.0%** — 최고 신호 |
| 되어지다 | paper-proofread | 60 | 3.0% — 좋은 신호 |
| 를 통하여 | paper-proofread | 60 | 40.4% — 잡음 |
| **함으로써** | paper-proofread | 60 | **56.6% — 규칙이 틀렸다** |
| **매우** | paper-proofread | 60 | **76.0% — 규칙이 틀렸다** |

**같은 60이다.** 출처는 규칙의 출신지일 뿐이고 무게는 실측이 정해야 한다.

```yaml
# 제안 (쓰지 않는다)
rule_priority:
  paper_proofread: 60
  humanizer: 40

# 수정
rule_weight:
  corpus: corpus/published/현장과학교육267/어휘색인.json
  formula: "게재 논문 사용 편수 비율이 낮을수록 무겁다"
  auto_drop: ">= 20%"        # 다섯에 하나가 쓰면 규칙에서 뺀다
  review_band: "5~20%"       # 사람이 판정
  # 출처(paper_proofread·humanizer·자체)는 provenance 로만 남기고 무게에 안 쓴다
```

**출처별 우선순위가 필요한 자리는 따로 있다** — 규칙이 아니라 **판정이 충돌할 때**다.
「이 문장을 고칠까」에 두 도구가 반대로 답하면 그때 원문 보존 > 사용자 지시 >
프로젝트 하네스 순으로 푼다. 제안의 1~7 순위는 그쪽에만 쓴다.

### 3-3. Agent Skills 인용이 틀렸다

`SKILL.md` 와 Agent Skills 형식은 **Anthropic** 것이다. 제안이 든 OpenAI academy 링크는
근거가 되지 않는다.

### 3-4. `vendor/` 와 `references/external_rules/` 가 이중화다

`vendor/paper-proofread/references/rules_ko.md` 가 원본인데 `references/external_rules/
paper_proofread.md` 에 손으로 요약본을 또 두면 어긋난다. **adapter 가 vendor 에서 직접
읽고, 우리가 더한 것(실측 편수·폐기 표시)만 따로 둔다.**

```text
references/external_rules/paper_proofread.measured.json   ← 규칙별 267편 실측만
vendor/paper-proofread/references/rules_ko.md             ← 규칙 원문 (건드리지 않음)
```

### 3-5. `regression` 이 다른 두 가지를 같은 이름으로 부른다

| 무엇 | 묻는 것 | 어디에 |
|---|---|---|
| **스킬 회귀 시험** | 스킬을 고쳤더니 예전 사례를 아직 잡나 | `tests/regression.jsonl` |
| **원고 회귀 대조** | 문체를 고쳤더니 **원고의 뜻이 움직였나** | `audit/meaning_drift.py` |

둘은 완전히 다르다. 후자는 실제 사고가 난 자리다 — 2026-09-13 에 「일반화할 수 없다」가
원고에서 통째로 사라졌고 같은 날 다른 자리에서 「시사한다」가 「해야 한다」로 세졌다.

---

## 4. 빠진 것 둘

### 4-1. 게재 논문 코퍼스 자리가 없다

제안의 `corpus/` 는 bad↔good pairs 용이다. **규칙을 반증하는 근거**가 들어갈 데가 없다.

```text
corpus/
├─ published/                       ← 없던 것. 이 시스템의 근거다
│   └─ 현장과학교육267/
│       ├─ txt/                     34,028문장
│       ├─ 어휘색인.json            어절 83,002 · 어간 15,715 (편수 기준)
│       └─ 기준선_{리듬,빈도,번역체}.json
├─ bad_good_pairs.jsonl
├─ accepted_edits.jsonl
├─ rejected_edits.jsonl
└─ model_failures.jsonl
```

**쉰 편은 넘겨야 한다.** 열두 편으로 만들었을 때 평균 문장 길이가 11.4~43.1 어절로
벌어졌고 그중 셋이 학술지 논문이 아니었다. 267편에서는 14.6~33.4 다.

### 4-2. 절대 역치를 쓰면 안 되는 자리가 있다

`paper-proofread` 의 「60자 초과 → 분리 권고」를 우리 원고에 대니 216건(61%)이 걸렸다.
267편에 대니 **70%가 걸린다.** 중앙값이 80자다.

| 역치 | 게재 논문 | 우리 원고 |
|---|---|---|
| 60자 | 70.0% | 60.5% |
| 80자 | 49.5% | 47.1% |
| 100자 | 32.5% | 33.6% |
| 120자 | 20.8% | 21.0% |

**절대 역치는 학술지마다 틀린다. 분포 백분위로 바꾼다.**

---

## 5. 제안이 놓친 저장소 — 여기 맞춤법 검사가 있다

| 저장소 | 별 | 라이선스 | 마지막 | 가진 것 |
|---|---|---|---|---|
| **DaleSeo/korean-skills** | **196** | MIT | 2026-05-05 | **grammar-checker** · humanizer |
| amondnet/yoonmoon | 13 | MIT | 2026-09-11 | 윤문 + AI 작성 탐지 |
| parkjui92/paper-proofread | 5 | MIT | 2026-07-20 | 청킹 · 4축 · 서지 실재 검증 |
| YoungsikMoon/humanizer-korean | 0 | MIT | 2026-02-24 | blader/humanizer 한국어판 |
| nyjin/humanizer-ko | 0 | **없음** | 2026-07-16 | 문서·문단·문장 3층위 |

`DaleSeo/korean-skills` 의 `skills/grammar-checker/` 에 `references/common-errors.md`
(10KB)·`rules.md`(8.8KB)가 있다. **우리가 없다고 한 맞춤법 검사가 이것이다**
(「바까지만」을 놓친 자리).

---

## 6. 다중모델 토론은 아직 근거가 없다

제안의 「분쟁 있는 문장만 토론」은 값 아끼는 법으로는 맞다. 다만 **토론이 필요하다는
증거가 없다.**

2026-09-13 에 서지 검증에서 22건 오탐을 냈다. 원인은 「모델이 하나라서」가 아니라
**「방법이 틀렸는데 안 재서」**였다.

| 오탐 | 원인 |
|---|---|
| 연도 불일치 11건 | Crossref `issued` 는 온라인 공개 연도인데 print 로 착각 |
| 못 찾음 11건 | 서지 파서가 제목을 첫 마침표에서 잘랐다 |

**Codex 가 옆에 있어도 똑같이 났을 것이다.** 토론보다 앞에 두어야 하는 것은
**자기 오탐률 측정**이다. 도구마다 「이 검사가 재지 못하는 것」과 실측 오탐률을 함께 낸다.

토론은 v0.2 로 미룬다. v0.1 은 단일 모델 + 실측으로 충분한지 먼저 본다.

---

## 7. 수정한 구조

```text
korean-academic-engine/
├─ SKILL.md                       유일하게 Skill 로 등록되는 것
├─ config/
│   ├─ default.yaml               rule_weight (출처별 아님) · 충돌 해소 순위
│   └─ projects/easwa.yaml
├─ harness/                       00_priority · 10_korean · 20_logic · 30_section · 40_style
│   └─ projects/easwa.md
├─ corpus/
│   ├─ published/현장과학교육267/  ← 규칙을 반증하는 근거
│   ├─ bad_good_pairs.jsonl
│   └─ model_failures.jsonl       ← OPERATOR.md·FAILURES.md 에서 옮긴다
├─ references/
│   ├─ terminology.md
│   └─ external_rules/*.measured.json   ← 실측만. 규칙 원문은 vendor 에
├─ scripts/
│   ├─ lint/          cadence · wording · translationese · sentence_stats · terminology
│   ├─ structure/     chapter_roles · circularity · intro_chain · tables_figures
│   ├─ refs/          exist_check (print우선+제목전체+arXiv폴백) · kci
│   ├─ build/         style_baseline · wording_index · measure_rules
│   ├─ audit/         meaning_drift.py   ← 원고 회귀 대조. tests/ 와 다르다
│   └─ adapters/      paper_proofread.py · humanizer.py · grammar_checker.py
├─ vendor/            paper-proofread/ · korean-skills/ · yoonmoon/   (commit 고정, MIT만)
├─ tests/             regression.jsonl  ← 스킬 회귀 시험
└─ runs/
```

**`vendor/` 에 `humanizer-ko` 는 넣지 않는다** (3-1).

---

## 8. v0.1 범위

```text
harness (있음)
+ 기존 py 11개 (있음) — 출력만 Issue[] 로 통일
+ corpus/published/267편 (있음)
+ paper-proofread 규칙 → 실측으로 걸러 10개
+ grammar-checker (DaleSeo) → 맞춤법
+ humanizer AUDIT (제안만, 자동 적용 없음)
+ meaning_drift.py (없음. 새로 만든다)
+ model_failures.jsonl 초기 적재
```

토론·벡터DB·파인튜닝은 넣지 않는다. JSONL + Python + CLI 로 충분하다.

**model_failures 는 지어내지 않는다.** `Main/OPERATOR.md` 의 교정 대장과
`Main/FAILURES.md` 248건에 이미 쌓여 있다. 그것을 옮기는 것이 첫 적재다.

---

## 9. Issue[] 스키마

```json
{
  "id": "WORDING-003",
  "file": "EASWA_논문_v18.md",
  "span": [12403, 12410],
  "text": "떠안는다",
  "category": "RARE_VERB",
  "severity": 2,
  "provenance": "static/check_wording",
  "evidence": {"corpus": "현장과학교육267", "편수": 0, "비율": 0.0},
  "message": "게재 논문 267편에 이 뿌리가 없다",
  "proposals": [
    {"text": "떠맡는다", "evidence": {"편수": 2, "비율": 0.7}},
    {"text": "수행한다", "evidence": {"편수": 191, "비율": 71.5}}
  ],
  "confidence": 0.9
}
```

**`evidence` 가 필수다.** 근거 없는 지적은 이 시스템에 들어오지 못한다. 이것이
`paper-proofread`·humanizer 와 갈리는 자리다 — 저쪽은 규칙이 많고 잰 적이 없다.
