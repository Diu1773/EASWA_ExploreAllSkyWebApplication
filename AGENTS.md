# EASWA — Codex 작업 가이드

## 프로젝트 개요

**EASWA (Exploring All-Sky Web App)**  
학생과 시민이 실제 천문 데이터를 직접 탐구하는 교육용 전천 웹플랫폼.  
외계행성 식현상, 변광성, 식쌍성 등의 탐구 활동을 코딩 없이 웹에서 바로 수행할 수 있도록 설계됨.  
장기적으로는 시민과학 기반 외계행성 집단 분석(Planet Hunters 방식)으로 확장 예정.

## 설계 원리 — 모든 UI/기능 결정의 기준

논문에서 도출된 **5개 설계 원리**:

1. **탐구 주제 중심 접근** — 천체명·좌표·자료 테이블보다 탐구 질문에서 출발하고, 질문에 적합한 대상과 자료로 연결.
2. **기술 실행 부담의 완화** — 학습 목표와 무관한 절차(검색·다운로드·전처리·코딩·반복계산)는 플랫폼이 흡수. 공공데이터 호출 자동화 / 차등측광·모델 피팅 자동 실행.
3. **분석 과정의 가시화** — 자동화하되 블랙박스 금지. 자료 출처·관측 정보·비교성 품질·분석 조건·모델 가정을 항상 노출.
4. **결과 해석은 학습자가 수행** — 산출값 단순 제시 금지. 문헌값 비교, 결과 기록·차이 원인 설명·해석 질문 영역 제공.
5. **수업 적용 가능성 지원** — 구조화·안내형 단계 흐름(Step 1–6), 입문/심화 분기, 교사용 자료·난이도 조절.

> UI 설계·기능 우선순위·트레이드오프 판단 시 항상 이 4방향을 기준으로 판단. 자주 발생하는 충돌(예: 시각 화려함 vs 가시화, 자동화 vs 블랙박스): 메모리의 [project_design_principles.md](../../.Codex/projects/C--Users-bmffr-Desktop-Result-EASWA-ExploringAllSkyWebApp/memory/project_design_principles.md) 참조 (10개 세부 원리 + 트레이드오프 가이드).

## 프로젝트 구조

```
EASWA_ExploringAllSkyWebApp/
├── backend/                  # Python (FastAPI/Starlette) 백엔드
│   ├── main.py               # 앱 진입점
│   ├── config.py             # 환경변수 설정 (_uses_dev_runtime_defaults 플래그)
│   ├── services/
│   │   └── transit_service.py  # TESS cutout 다운로드·캐시·광도측정·transit fit
│   ├── routes/               # API 엔드포인트
│   ├── .env                  # 로컬 개발용 (커밋 금지 — secrets 포함)
│   └── .env.example          # 환경변수 템플릿
├── frontend/                 # React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── sky/          # SkyExplorer, TopicSidebar (전천 탐색 화면)
│   │   │   └── lab/          # LabView, TransitLab, LightCurvePlot 등 (분석 화면)
│   │   ├── workflows/transit/ # Transit 워크플로우 전용 hooks, state, definition
│   │   ├── hooks/            # 공통 custom hooks (useLabData, useSkyTargets)
│   │   ├── stores/           # Zustand 전역 상태
│   │   ├── api/client.ts     # API 호출 함수
│   │   └── index.css         # 전체 스타일 (CSS 변수 + 컴포넌트별 섹션)
│   └── dist/                 # 빌드 결과물 (백엔드가 정적 서빙)
├── tests/                    # pytest 백엔드 테스트
├── Dockerfile
├── render.yaml               # Render 배포 설정
└── DEPLOY.md                 # 배포 가이드
```

## 개발 환경

```bash
# 백엔드 실행 (포트 5895)
cd backend && python -m uvicorn main:app --reload --port 5895

# 프론트엔드 빌드 (변경사항 반영)
cd frontend && npm run build

# 프론트엔드 dev 서버 (핫리로드, 포트 5173)
cd frontend && npm run dev
```

- **로컬 접속**: `http://localhost:5895` (빌드 후) 또는 `http://localhost:5173` (dev 서버)
- 프론트엔드 변경 후 `npm run build` 실행해야 5895에 반영됨
- `backend/.env`는 절대 커밋하지 말 것 (Google OAuth secret 포함)

## 주요 기술 결정사항

### TESS cutout 캐시 구조
- **메모리 캐시** (`_cutout_cache`): LRU, 200MB 한도 — 같은 sector 재요청 시 즉시 반환
- **디스크 캐시** (`backend/.cache/transit/cutouts/`): FITS 파일 1일 TTL — 로컬에서만 활성화
- **Render 프로덕션**: 디스크 캐시 비활성, 메모리만 사용 (`_uses_dev_runtime_defaults=False`)
- ZIP 다운로드·압축해제 모두 BytesIO 인메모리 처리 (디스크 I/O 없음)
- stall 감지: 30초 window에서 50KB 미만 수신 시 RuntimeError 발생

### 프론트엔드 상태 관리
- Zustand (`useAppStore`): 전역 UI 상태 (선택된 topic, sidebar 등)
- URL 파라미터: `?workflow=transit`, `?draftId=` — 새로고침/뒤로가기 안전
- Custom hooks: `useSkyTargets`, `useLabData` (데이터 레이어 분리)

### 스트리밍 진행 상황
- Transit 광도측정·fit 모두 SSE 스트리밍
- 프론트엔드에서 100ms throttle 적용 (useRef 기반)

## 코딩 규칙

- CSS는 `index.css`에 집중 관리, 인라인 스타일은 동적 위치값에만 사용
- 새 컴포넌트 추가 시 데이터 fetch 로직은 custom hook으로 분리
- 백엔드 수정 후 관련 pytest 테스트도 업데이트
- 프론트엔드 수정 후 항상 `npm run build`로 빌드 확인

---

# 하네스 프로토콜 (research-os)

> 제어층: `C:\Users\bmffr\Desktop\Main` — `NOW.md`, `PORTFOLIO.yaml`, `SESSION_BOOTSTRAP.md`
> (대시보드는 2026-07-28 보류. 작업면은 각 레포의 세션이고 프로토콜은 파일로 돈다)

## 세션 시작 동기화 — 작업 전에 한 번

Claude Code 는 전역 `SessionStart` hook 이 이걸 자동으로 넣어준다.
**Codex 는 자동으로 안 되므로 첫 행동으로 직접 한 번 실행한다.**
컨텍스트에 `SESSION_SYNC_V1` 블록이 이미 있으면 다시 돌리지 않는다.

```text
python -X utf8 C:/Users/bmffr/Desktop/Main/scripts/session_sync.py --cwd .
```

출력에는 이 레포의 트랙·최근 커밋·미커밋 변경·「사용자 판단 필요」가 들어 있다.
기존 미커밋 변경은 다른 세션의 작업일 수 있으니 임의로 지우거나 되돌리지 않는다.
공통 규약 원문은 `C:/Users/bmffr/Desktop/Main/SESSION_BOOTSTRAP.md`.

## 세션을 시작할 때

**TRACK.md 를 먼저 읽는다.** 이 트랙의 상태에 대한 유일한 진실이다.
사용자에게 "전에 뭘 했었죠"를 묻지 않는다. 파일에 다 있다.

**`## 사용자 의견` 절을 반드시 읽는다.** 사용자가 남긴 방향 지시가
거기 최신순으로 쌓인다. 그 방향과 다르게 가려면 먼저 물어본다.


## 세션을 끝내기 전에 (필수)

1. **오라클 실행**
   ```bash
   인용 무결성 + 본문 수치 ↔ 원자료 대조
   ```
   통과 기준: 추적가능성 확보. 실패하면 완료가 아니다 — 롤백하거나 원인을 TRACK.md에 남긴다.
2. **커밋 + 푸쉬.** 미푸쉬 커밋을 남기고 끝내지 않는다.
3. **TRACK.md 갱신** — `## 지금` / `## 다음 3개` / `## 함정` 세 절을 다시 쓴다.
   판단이 필요한 건 `## 사용자 판단 필요`에. 채팅에만 쓰면 세션과 함께 사라진다.

Stop hook (`Main/scripts/hook_track_freshness.py`) 이 이걸 검사한다. 차단하지는 않지만 경고한다.

## Codex 역할 — 검토자

이 하네스에서 Codex는 **구현자가 아니라 검토자**다. Claude가 만든 변경을 독립적으로 본다.
작성자와 검토자가 다른 공급자면 같은 오류를 공유할 확률이 줄고, Claude 사용 한도도 아낀다.

검토할 때 보는 것:

- 오라클이 실제로 돌았는가, 통과 기준을 만족했는가
- 회귀 — 기존 동작이 조용히 바뀌지 않았는가
- 수치 · 단위 · 시간대 · 좌표계 일관성
- 시계열 데이터라면 **미래 정보 누수**
- 하드코딩된 가변 값 (기기명 · 필터 · 경로 · 스텝값)

검토 결과는 PR 코멘트 또는 TRACK.md의 `## 함정`에 남긴다. **구현하지 말고 문제만 보고한다.**

## 이 레포의 함정

- **앱 코드 동결 중.** 예비 코호트 시연까지 `frontend/`·`backend/`를 건드리지 않는다.
  논문 §3.1이 코호트 간 동일 산출물을 주장하므로, 손대면 논문 문구도 바꿔야 한다.
- 발표 자료는 `발표_빌드/build.js`로만 만든다. pptx 직접 수정 금지.
- 배포 기준본은 `2956d24`. `docs/DEMO_VERSION_RECORD.md` 참조.

## Research OS 세션 브리지

연구 질문이나 실험 방향을 새로 잡을 때는 Main의 Research OS 제어층을 먼저 동기화한다.
컨텍스트에 `SESSION_SYNC_V1`이 없으면 작업 전에 한 번 실행한다.

```text
python -X utf8 C:/Users/bmffr/Desktop/Main/scripts/session_sync.py --cwd .
```

원시 아이디어는 `C:/Users/bmffr/Desktop/Main/RESEARCH_INBOX.md`에 남긴다.
하네스는 질문 후보 확장·문헌 검색·독립 비평·사람 승인을 분리한다. 자동으로 결론을 확정하거나
이 레포의 파일을 바꾸지 않는다. `ResearchCandidate` 검토용 또는 승인된 theory/experiment
handoff는 `.research-os/handoff/`의 최신 JSON을 먼저 읽는다.
