# EASWA — Claude Code 작업 가이드

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

> UI 설계·기능 우선순위·트레이드오프 판단 시 항상 이 4방향을 기준으로 판단. 자주 발생하는 충돌(예: 시각 화려함 vs 가시화, 자동화 vs 블랙박스): 메모리의 [project_design_principles.md](../../.claude/projects/C--Users-bmffr-Desktop-Result-EASWA-ExploringAllSkyWebApp/memory/project_design_principles.md) 참조 (10개 세부 원리 + 트레이드오프 가이드).

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
