/**
 * EASWA 경량 i18n — 라이브러리 없이 직접 구현
 * 사용: const t = useT();  t('nav.home')
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Lang = 'ko' | 'en';

// ─── 문자열 맵 ────────────────────────────────────────────────

export const strings: Record<Lang, Record<string, string>> = {
  ko: {
    // 내비게이션
    'nav.home': '홈',
    'nav.explorer': 'Explorer',
    'nav.tess': 'TESS',
    'nav.kmtnet': 'KMTNet',
    'nav.myAnalyses': '내 분석 기록',
    'nav.settings': '설정',
    'nav.signIn': 'Google로 로그인',
    'nav.signOut': '로그아웃',
    'nav.menuLabel': '탐색 메뉴',

    // 홈
    'home.subtitle': 'Exploring All-Sky Web Application',
    'home.tagline': '공공 천문자료로 직접 탐구하는 교육 플랫폼',
    'home.startExploring': '탐구 시작하기',
    'home.learnMore': '자세히 보기',
    'home.liveStats.title': '실시간 데이터 현황',
    'home.liveStats.targets': '탐구 대상',
    'home.liveStats.analyses': '누적 분석',
    'home.liveStats.sites': '관측소',

    // Sky Explorer
    // 모듈마다 대상이 다르다(외계행성·미시중력렌즈 이벤트·산개성단). 한 모듈의
    // 예시를 공용 문구에 박아 두면 성단 화면에서 «예: WASP-6 b»가 뜬다.
    'explorer.searchPlaceholder': '대상 이름으로 검색',
    'explorer.searchNoMatch': '일치하는 대상이 없어요. 이름이나 별자리로 다시 검색해 보세요.',
    'explorer.searchClear': '검색어 지우기',
    'explorer.loading': '대상 불러오는 중…',
    'explorer.noTransitTargets': '현재 필터에 맞는 식 대상이 없습니다. 필터를 초기화하거나 최소 깊이를 낮춰보세요.',
    'explorer.magLegend': '등급',
    'explorer.openPanel': '▼  탐구 활동 열기',
    'explorer.closePanel': '▲',
    'explorer.filterTitle': '필터 설정',
    'explorer.filter.maxTargets': 'Max Targets',
    'explorer.filter.minDepth': 'Min Depth (%)',
    'explorer.filter.maxPeriod': 'Max Period (d)',
    'explorer.filter.maxHostV': 'Max Host V',
    'explorer.filter.reset': '초기화',
    'explorer.filter.apply': '적용',

    // TargetPopup
    'popup.goto': '대상으로 이동',
    'popup.gotoUnlock': '클릭해서 잠금 해제',
    'popup.alreadyThere': '이미 대상에 와있다.',
    'popup.close': '닫기',
    'popup.type': '유형',
    'popup.constellation': '별자리',
    'popup.magnitude': '등급',
    'popup.period': '주기',
    'popup.days': '일',
    'popup.depth': '깊이',
    'popup.source': '출처',
    'popup.gotoSlewing': 'GOTO: 이동 중…',
    'popup.viewDetails': '상세 보기 & 관측',
    'popup.gotoHint': 'GOTO를 먼저 실행하세요. 이동 완료 후 상세 버튼이 활성화됩니다.',
    'popup.detailUnlocked': '상세 보기가 활성화되었습니다.',
    'popup.slewFailed': '대상으로 이동하지 못했습니다.',

    // 대상 상세 화면 (TargetDetail)
    'detail.loading': '대상 데이터를 불러오는 중…',
    'detail.ra': '적경',
    'detail.dec': '적위',
    'detail.mag': '등급',
    'detail.period': '주기',
    'detail.source': '출처',
    'detail.vHost': 'V 등급 (주성)',
    'detail.type.transitPlanet': '식현상 행성',
    'detail.source.nasaArchive': 'NASA 외계행성 아카이브',
    'detail.source.curatedFallback': '큐레이션 대체 데이터',

    // TESS 소개 페이지
    'tess.pageChip': 'NASA TESS · Transit Photometry',
    'tess.title': '별빛이 살짝 어두워질 때 — 외계행성 식현상',
    'tess.startExploring': '전천 탐색 시작 →',
    'tess.backHome': '홈으로',
    'tess.backLink': '← 홈',

    // KMTNet 소개 페이지
    'kmt.pageChip': 'KMTNet · Microlensing',
    'kmt.title': '별빛이 일시적으로 밝아질 때 — 미시중력렌즈',
    'kmt.startExploring': '미시중력렌즈 탐구 시작 →',
    'kmt.backHome': '홈으로',
    'kmt.backLink': '← 홈',

    // 공통 버튼
    'btn.close': '닫기',
    'btn.reset': '초기화',
    'btn.apply': '적용',
    'btn.cancel': '취소',
    'btn.save': '저장',
    'btn.download': '다운로드',
    'btn.retry': '다시 시도',
    'btn.back': '뒤로',
    'btn.next': '다음',
    'btn.confirm': '확인',

    // 탐구 활동 (StepGuide)
    'guide.toggle': '생각해보기',
    'guide.type.ox': 'O/X',
    'guide.type.choice': '객관식',
    'guide.type.open': '서술',
    'guide.status.pending': '진행 중',
    'guide.status.correct': '✓ 정답',
    'guide.status.wrong': '오답',
    'guide.feedback.correct': '정답!',
    'guide.feedback.wrong': '오답 — 정답:',
    'guide.placeholder': '여기에 생각을 적어보세요...',

    // 분석 기록
    'record.title': '내 분석 기록',
    'record.empty': '저장된 분석 기록이 없습니다.',
    'record.delete': '삭제',
    'record.share': '공유',
    'record.download': 'CSV 다운로드',

    // 오류
    'error.notFound': '페이지를 찾을 수 없습니다.',
    'error.generic': '오류가 발생했습니다.',
    'error.retry': '다시 시도',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.explorer': 'Explorer',
    'nav.tess': 'TESS',
    'nav.kmtnet': 'KMTNet',
    'nav.myAnalyses': 'My Analyses',
    'nav.settings': 'Settings',
    'nav.signIn': 'Sign in with Google',
    'nav.signOut': 'Sign out',
    'nav.menuLabel': 'Navigation menu',

    // Home
    'home.subtitle': 'Exploring All-Sky Web Application',
    'home.tagline': 'An educational platform for hands-on astronomy with real data',
    'home.startExploring': 'Start Exploring',
    'home.learnMore': 'Learn More',
    'home.liveStats.title': 'Platform Overview',
    'home.liveStats.targets': 'Targets',
    'home.liveStats.analyses': 'Total Analyses',
    'home.liveStats.sites': 'Observatories',

    // Sky Explorer
    'explorer.searchPlaceholder': 'Search by target name',
    'explorer.searchNoMatch': 'No matching target. Try a name or constellation.',
    'explorer.searchClear': 'Clear search',
    'explorer.loading': 'Loading targets…',
    'explorer.noTransitTargets': 'No transit targets matched the current filters. Reset filters or lower Min Depth.',
    'explorer.magLegend': 'Mag',
    'explorer.openPanel': '▼  Open Activity Panel',
    'explorer.closePanel': '▲',
    'explorer.filterTitle': 'Filter Settings',
    'explorer.filter.maxTargets': 'Max Targets',
    'explorer.filter.minDepth': 'Min Depth (%)',
    'explorer.filter.maxPeriod': 'Max Period (d)',
    'explorer.filter.maxHostV': 'Max Host V',
    'explorer.filter.reset': 'Reset',
    'explorer.filter.apply': 'Apply',

    // TargetPopup
    'popup.goto': 'Go to Target',
    'popup.gotoUnlock': 'Click to unlock',
    'popup.alreadyThere': 'Already at this target.',
    'popup.close': 'Close',
    'popup.type': 'Type',
    'popup.constellation': 'Constellation',
    'popup.magnitude': 'Magnitude',
    'popup.period': 'Period',
    'popup.days': 'days',
    'popup.depth': 'Depth',
    'popup.source': 'Source',
    'popup.gotoSlewing': 'GOTO: Slewing & Zooming…',
    'popup.viewDetails': 'View Details & Observations',
    'popup.gotoHint': 'Run GOTO first. The detail button unlocks after slew and zoom finish.',
    'popup.detailUnlocked': 'Detail view is unlocked.',
    'popup.slewFailed': 'Failed to slew to target.',

    // Target detail screen
    'detail.loading': 'Loading target data…',
    'detail.ra': 'RA',
    'detail.dec': 'Dec',
    'detail.mag': 'Mag',
    'detail.period': 'P',
    'detail.source': 'Source',
    'detail.vHost': 'V host',
    'detail.type.transitPlanet': 'Transit Planet',
    'detail.source.nasaArchive': 'NASA Exoplanet Archive',
    'detail.source.curatedFallback': 'Curated fallback',

    // TESS intro page
    'tess.pageChip': 'NASA TESS · Transit Photometry',
    'tess.title': 'When Starlight Fades — Exoplanet Transits',
    'tess.startExploring': 'Start Sky Explorer →',
    'tess.backHome': 'Back to Home',
    'tess.backLink': '← Home',

    // KMTNet intro page
    'kmt.pageChip': 'KMTNet · Microlensing',
    'kmt.title': 'When Starlight Brightens — Gravitational Microlensing',
    'kmt.startExploring': 'Start Microlensing Explorer →',
    'kmt.backHome': 'Back to Home',
    'kmt.backLink': '← Home',

    // Common buttons
    'btn.close': 'Close',
    'btn.reset': 'Reset',
    'btn.apply': 'Apply',
    'btn.cancel': 'Cancel',
    'btn.save': 'Save',
    'btn.download': 'Download',
    'btn.retry': 'Retry',
    'btn.back': 'Back',
    'btn.next': 'Next',
    'btn.confirm': 'Confirm',

    // Step guide
    'guide.toggle': 'Think About It',
    'guide.type.ox': 'True/False',
    'guide.type.choice': 'Multiple Choice',
    'guide.type.open': 'Open Answer',
    'guide.status.pending': 'In Progress',
    'guide.status.correct': '✓ Correct',
    'guide.status.wrong': 'Incorrect',
    'guide.feedback.correct': 'Correct!',
    'guide.feedback.wrong': 'Incorrect — Answer:',
    'guide.placeholder': 'Write your thoughts here…',

    // Records
    'record.title': 'My Analyses',
    'record.empty': 'No saved analyses yet.',
    'record.delete': 'Delete',
    'record.share': 'Share',
    'record.download': 'Download CSV',

    // Errors
    'error.notFound': 'Page not found.',
    'error.generic': 'An error occurred.',
    'error.retry': 'Retry',
  },
};

// ─── Lang 스토어 ──────────────────────────────────────────────

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'ko',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((s) => ({ lang: s.lang === 'ko' ? 'en' : 'ko' })),
    }),
    {
      name: 'easwa-lang',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─── useT 훅 ─────────────────────────────────────────────────

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (key: string, fallback?: string): string =>
    strings[lang][key] ?? strings.ko[key] ?? fallback ?? key;
}

/** 훅 없이 현재 언어 문자열 직접 얻기 (컴포넌트 외부용) */
export function getT(lang: Lang) {
  return (key: string, fallback?: string): string =>
    strings[lang][key] ?? strings.ko[key] ?? fallback ?? key;
}
