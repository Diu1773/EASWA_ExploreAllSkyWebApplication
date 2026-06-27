import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from '../layout/ImageWithFallback';
import { ASTRO_FALLBACK_IMAGE, TESS_BANNER_IMAGE } from '../../data/imageSources';
import { buildExplorerHref } from '../../utils/explorerNavigation';
import { useLangStore } from '../../i18n';

const Transit3DScene = lazy(() => import('../sky/Transit3DScene'));

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

const TESS_EXPLORER_GUIDED = buildExplorerHref({
  moduleId: 'tess',
  topicId: 'exoplanet_transit',
  siteId: null,
  learningMode: 'guided',
});

const TESS_EXPLORER_ADVANCED = buildExplorerHref({
  moduleId: 'tess',
  topicId: 'exoplanet_transit',
  siteId: null,
  learningMode: 'advanced',
});

function TransitDiagram() {
  const lang = useLangStore((s) => s.lang);
  // 상단: 별을 중심으로 행성이 수평으로 횡단.
  // 하단: x축이 시간축과 동일하게 정렬된 광도곡선.
  // 행성이 별 앞에 있을 때 깊이 감소가 같은 x 위치에서 일어남을 한눈에 보이게 함.
  const STAR_CX = 220;
  const STAR_CY = 90;
  const STAR_R = 44;
  const ORBIT_Y = STAR_CY;

  const INGRESS_X = STAR_CX - STAR_R;
  const EGRESS_X = STAR_CX + STAR_R;

  const BASE_Y = 200;
  const DIP_Y = 228;

  return (
    <svg viewBox="0 0 440 290" className="edu-svg" aria-hidden="true">
      <defs>
        <radialGradient id="tess-star" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="55%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <marker id="tl-arr" markerWidth="7" markerHeight="5" refX="6.5" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#64748b" />
        </marker>
      </defs>

      {/* ── 상단: 별과 행성 궤도 ───────────────────────── */}

      {/* 궤도(수평 경로) */}
      <line x1="40" y1={ORBIT_Y} x2="400" y2={ORBIT_Y}
        stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="355" y1={ORBIT_Y} x2="395" y2={ORBIT_Y}
        stroke="#64748b" strokeWidth="1.2" markerEnd="url(#tl-arr)" />

      {/* 별 glow + 본체 */}
      <circle cx={STAR_CX} cy={STAR_CY} r={STAR_R + 22}
        fill="url(#tess-star)" opacity="0.22" />
      <circle cx={STAR_CX} cy={STAR_CY} r={STAR_R} fill="url(#tess-star)" />

      {/* 행성 3단계: 접근 → 별 앞(transit) → 통과 후 */}
      <circle cx="110" cy={ORBIT_Y} r="8"
        fill="#0f172a" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.35" />
      <circle cx={STAR_CX} cy={STAR_CY} r="8"
        fill="#0f172a" stroke="#7dd3fc" strokeWidth="2" />
      <circle cx="330" cy={ORBIT_Y} r="8"
        fill="#0f172a" stroke="#7dd3fc" strokeWidth="1.5" opacity="0.35" />

      {/* 라벨 */}
      <text x={STAR_CX} y={STAR_CY + STAR_R + 18} textAnchor="middle"
        fill="#fbbf24" fontSize="12" fontFamily="system-ui, sans-serif">
        {lang === 'ko' ? '별 (항성)' : 'Star'}
      </text>
      <text x="110" y={ORBIT_Y - 14} textAnchor="middle"
        fill="#7dd3fc" fontSize="11" fontFamily="system-ui, sans-serif">
        {lang === 'ko' ? '행성' : 'Planet'}
      </text>
      <text x={STAR_CX} y={STAR_CY - 4} textAnchor="middle"
        fill="#e0f2fe" fontSize="10" fontFamily="IBM Plex Mono, monospace">transit</text>

      {/* 상·하 영역 구분 */}
      <line x1="20" y1="165" x2="420" y2="165" stroke="#1e293b" strokeWidth="1" />

      {/* ── 하단: 광도곡선 (x축이 상단 궤도와 동일 스케일) ── */}

      {/* 축 */}
      <line x1="40" y1="260" x2="400" y2="260"
        stroke="#475569" strokeWidth="1.3" markerEnd="url(#tl-arr)" />
      <line x1="40" y1="260" x2="40" y2="180"
        stroke="#475569" strokeWidth="1.3" markerEnd="url(#tl-arr)" />
      <text x="220" y="278" textAnchor="middle" fill="#94a3b8"
        fontSize="11" fontFamily="system-ui, sans-serif">{lang === 'ko' ? '시간' : 'Time'}</text>
      <text x="24" y="220" textAnchor="middle" fill="#94a3b8"
        fontSize="11" fontFamily="system-ui, sans-serif"
        transform="rotate(-90 24 220)">{lang === 'ko' ? '밝기' : 'Brightness'}</text>

      {/* 광도곡선: 평탄 → 딥(별 앞 통과 구간) → 평탄 */}
      <path
        d={`M45,${BASE_Y} L${INGRESS_X - 14},${BASE_Y} L${INGRESS_X},${DIP_Y} L${EGRESS_X},${DIP_Y} L${EGRESS_X + 14},${BASE_Y} L400,${BASE_Y}`}
        fill="none" stroke="#e8722a" strokeWidth="2.5" strokeLinejoin="round" />

      {/* 별 앞 통과 구간을 상·하로 연결하는 가이드 라인 */}
      <line x1={INGRESS_X} y1={ORBIT_Y + STAR_R - 10} x2={INGRESS_X} y2={BASE_Y}
        stroke="#475569" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
      <line x1={EGRESS_X} y1={ORBIT_Y + STAR_R - 10} x2={EGRESS_X} y2={BASE_Y}
        stroke="#475569" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />

      {/* 깊이 브래킷 */}
      <line x1={EGRESS_X + 30} y1={BASE_Y} x2={EGRESS_X + 30} y2={DIP_Y}
        stroke="#94a3b8" strokeWidth="1" />
      <line x1={EGRESS_X + 26} y1={BASE_Y} x2={EGRESS_X + 34} y2={BASE_Y}
        stroke="#94a3b8" strokeWidth="1" />
      <line x1={EGRESS_X + 26} y1={DIP_Y} x2={EGRESS_X + 34} y2={DIP_Y}
        stroke="#94a3b8" strokeWidth="1" />
      <text x={EGRESS_X + 40} y={(BASE_Y + DIP_Y) / 2 + 4} fill="#cbd5f5"
        fontSize="10" fontFamily="IBM Plex Mono, monospace">
        {lang === 'ko' ? '깊이' : 'Depth'} ∝ (R_p / R_★)²
      </text>

      {/* transit 구간 표시 */}
      <text x={STAR_CX} y={DIP_Y + 14} textAnchor="middle" fill="#e8722a"
        fontSize="10" fontFamily="IBM Plex Mono, monospace">
        {lang === 'ko' ? 'transit 구간' : 'transit interval'}
      </text>
    </svg>
  );
}

function TransitVisual() {
  const lang = useLangStore((s) => s.lang);
  const [use3D, setUse3D] = useState(false);
  useEffect(() => {
    setUse3D(supportsWebGL());
  }, []);

  if (!use3D) {
    return (
      <>
        <TransitDiagram />
        <p className="edu-diagram-caption">
          {lang === 'ko'
            ? '행성이 별 앞을 통과(transit)하는 동안 광도곡선에 특징적인 딥이 나타납니다.'
            : 'A characteristic dip appears in the light curve while a planet transits its star.'}
        </p>
      </>
    );
  }

  return (
    <Suspense
      fallback={
        <>
          <TransitDiagram />
          <p className="edu-diagram-caption">
            {lang === 'ko' ? '3D 시뮬레이션 로딩 중…' : 'Loading 3D simulation…'}
          </p>
        </>
      }
    >
      <Transit3DScene />
    </Suspense>
  );
}

const TESS_FACTS = [
  {
    value: '~400,000',
    label: { ko: '관측 대상 별', en: 'Target stars' },
    sub: { ko: '밝고 가까운 별 우선', en: 'Prioritizes bright, nearby stars' },
  },
  {
    value: '96° × 24°',
    label: { ko: 'Sector 크기', en: 'Sector size' },
    sub: { ko: '전천을 26개 Sector로 분할', en: 'Sky divided into 26 sectors' },
  },
  {
    value: '27 days',
    label: { ko: 'Sector당 관측 기간', en: 'Duration per sector' },
    sub: { ko: '2분 간격 연속 측광', en: 'Continuous 2-minute photometry' },
  },
  {
    value: '~200 ppm',
    label: { ko: '광도 정밀도', en: 'Photometric precision' },
    sub: { ko: '목성 크기 행성 검출 가능', en: 'Can detect Jupiter-size planets' },
  },
];

export function TessIntroPage() {
  const lang = useLangStore((s) => s.lang);

  return (
    <div className="edu-page">
      <div className="edu-page-inner">

        {/* 헤더 */}
        <header className="edu-header">
          <Link to="/" className="back-link">
            &larr; {lang === 'ko' ? '홈' : 'Home'}
          </Link>
          <span className="page-chip">NASA TESS · Transit Photometry</span>
          <h1>
            {lang === 'ko'
              ? '별빛이 살짝 어두워질 때 — 외계행성 식현상'
              : 'When Starlight Fades — Exoplanet Transits'}
          </h1>
          <p>
            {lang === 'ko'
              ? '행성이 별과 지구 사이를 지나가면 별빛의 일부가 가려져 밝기가 미세하게 감소합니다. TESS는 이 순간을 우주에서 포착해 수십만 개 별의 광도곡선을 기록합니다.'
              : 'When a planet passes between its star and Earth, it blocks part of the starlight and causes a slight decrease in brightness. TESS records these moments as light curves for hundreds of thousands of stars.'}
          </p>
        </header>

        {/* 페이지 배너 이미지 */}
        <div className="edu-page-banner-wrap">
          <ImageWithFallback
            src={TESS_BANNER_IMAGE}
            fallbackSrc={ASTRO_FALLBACK_IMAGE}
            alt={lang === 'ko'
              ? 'ESA/Hubble — 외계행성 HD 189733b 대기 관측 아티스트 인상화'
              : 'ESA/Hubble artist impression of exoplanet HD 189733b'}
            className="edu-page-banner-img"
            loading="lazy"
          />
          <span className="edu-page-banner-credit">ESA / Hubble &amp; NASA · HD 189733b</span>
        </div>

        <section className="edu-inquiry-section" aria-labelledby="tess-inquiry-title">
          <span className="edu-inquiry-kicker">
            {lang === 'ko' ? '대표 탐구 질문' : 'Inquiry question'}
          </span>
          <h2 id="tess-inquiry-title">
            {lang === 'ko'
              ? '관측된 밝기 감소만으로 행성의 상대적 크기를 얼마나 신뢰성 있게 추정할 수 있을까?'
              : 'How reliably can we estimate a planet’s relative size from the observed decrease in brightness?'}
          </h2>
          <p>
            {lang === 'ko'
              ? 'MAST 기반 TESS 공개 관측자료에서 직접 만든 광도곡선과 모델 적합값을 NASA Exoplanet Archive의 기준값과 비교하고, 차이가 생긴 원인을 자료 품질과 분석 조건을 근거로 설명합니다.'
              : 'Build a light curve and fit a transit model from public TESS observations served through MAST. Compare the result with NASA Exoplanet Archive values and explain differences using data quality and analysis conditions.'}
          </p>
          <div className="edu-class-meta">
            <span>
              <strong>{lang === 'ko' ? '권장 시간' : 'Suggested time'}</strong>{' '}
              {lang === 'ko' ? '1~2차시, 45~90분' : '1–2 sessions, 45–90 minutes'}
            </span>
            <span>
              <strong>{lang === 'ko' ? '학습 결과물' : 'Learning output'}</strong>{' '}
              {lang === 'ko'
                ? '그래프 근거, 기준값 비교, 차이 원인 설명'
                : 'Graph evidence, reference comparison, and explanation of differences'}
            </span>
          </div>
        </section>

        <section className="edu-mode-section" aria-labelledby="tess-mode-title">
          <div>
            <span className="edu-inquiry-kicker">
              {lang === 'ko' ? '수업 적용 방식' : 'Learning mode'}
            </span>
            <h2 id="tess-mode-title">
              {lang === 'ko'
                ? '학습 수준에 맞는 탐구 흐름을 선택하세요'
                : 'Choose an investigation flow for your learning level'}
            </h2>
          </div>
          <div className="edu-mode-grid">
            <article className="edu-mode-card">
              <span>{lang === 'ko' ? '안내형 탐구' : 'Guided investigation'}</span>
              <h3>{lang === 'ko' ? '핵심 절차와 해석 질문 중심' : 'Core procedures and interpretation questions'}</h3>
              <p>
                {lang === 'ko'
                  ? '단계별 안내와 권장 설정을 따라 광도측정, 품질 점검, 모델 적합, 결과 기록을 수행합니다.'
                  : 'Follow step-by-step guidance and recommended settings for photometry, quality checks, model fitting, and recording results.'}
              </p>
              <Link to={TESS_EXPLORER_GUIDED} className="btn-primary">
                {lang === 'ko' ? '안내형으로 시작' : 'Start guided mode'}
              </Link>
            </article>
            <article className="edu-mode-card edu-mode-card--advanced">
              <span>{lang === 'ko' ? '심화형 탐구' : 'Advanced investigation'}</span>
              <h3>{lang === 'ko' ? '분석 조건과 모델 가정까지 점검' : 'Inspect analysis conditions and model assumptions'}</h3>
              <p>
                {lang === 'ko'
                  ? 'ROI, 비교성 품질, 전처리 조건, 모델 입력과 잔차를 확인하며 결과의 신뢰도를 검토합니다.'
                  : 'Review the ROI, comparison-star quality, preprocessing, model inputs, and residuals to evaluate the reliability of the result.'}
              </p>
              <Link to={TESS_EXPLORER_ADVANCED} className="btn-secondary">
                {lang === 'ko' ? '심화형으로 시작' : 'Start advanced mode'}
              </Link>
            </article>
          </div>
        </section>

        {/* 현상 설명: 다이어그램 + 텍스트 */}
        <section className="edu-explain">
          <div className="edu-diagram-wrap">
            <TransitVisual />
          </div>
          <div className="edu-explain-text">
            <h2>
              {lang === 'ko'
                ? '식현상(Transit)으로 행성 크기를 알 수 있다'
                : 'A transit reveals a planet’s relative size'}
            </h2>
            <p>
              {lang === 'ko'
                ? '빛의 감소 깊이는 행성 반지름과 별 반지름의 비로 결정됩니다. 지구 크기 행성은 약 0.01%, 목성 크기 행성은 약 1%의 밝기 감소를 만듭니다.'
                : 'The transit depth is determined by the ratio of the planet radius to the stellar radius. An Earth-size planet produces about a 0.01% decrease, while a Jupiter-size planet produces about 1%.'}
            </p>
            <ul className="edu-bullet-list">
              <li>
                <strong>{lang === 'ko' ? 'transit 깊이' : 'Transit depth'}</strong> —{' '}
                {lang === 'ko' ? '행성 크기 추정:' : 'estimate planet size from'}{' '}
                <code>(R<sub>p</sub> / R<sub>★</sub>)²</code>
              </li>
              <li>
                <strong>{lang === 'ko' ? 'transit 주기' : 'Transit period'}</strong> —{' '}
                {lang === 'ko' ? '반복 관측으로 공전 주기 결정' : 'determine the orbital period from repeated events'}
              </li>
              <li>
                <strong>{lang === 'ko' ? 'transit 지속 시간' : 'Transit duration'}</strong> —{' '}
                {lang === 'ko' ? '궤도 반경과 별의 크기에 의존' : 'depends on orbital distance and stellar size'}
              </li>
            </ul>
            <p>
              {lang === 'ko'
                ? 'TESS는 각 Sector를 약 27일 연속 관측하므로, 수일 이내 주기의 행성은 여러 번의 transit을 기록할 수 있습니다.'
                : 'TESS observes each sector continuously for about 27 days, so planets with periods of a few days can produce multiple recorded transits.'}
            </p>
          </div>
        </section>

        {/* TESS 주요 사양 */}
        <section className="edu-facts-section">
          <h2 className="edu-section-title">
            {lang === 'ko' ? 'TESS 주요 사양' : 'Key TESS specifications'}
          </h2>
          <div className="edu-facts-grid">
            {TESS_FACTS.map((f) => (
              <div key={f.label.en} className="edu-fact-card">
                <span className="edu-fact-value">{f.value}</span>
                <strong className="edu-fact-label">{f.label[lang]}</strong>
                <span className="edu-fact-sub">{f.sub[lang]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 탐구 흐름 안내 (CTA) */}
        <section className="edu-cta-section">
          <div className="edu-cta-text">
            <h2>{lang === 'ko' ? '이제 직접 대상을 골라보세요' : 'Choose a target and investigate it'}</h2>
            <p>
              {lang === 'ko'
                ? '전천 탐색 화면에서 실제 TESS 관측 대상을 선택하고, Sector 자료를 불러와 광도곡선과 식현상 모델 적합(transit fit)을 직접 수행할 수 있습니다.'
                : 'Select an observed TESS target in the all-sky explorer, load its sector data, build a light curve, and fit a transit model.'}
            </p>
          </div>
          <div className="edu-cta-actions">
            <Link to={TESS_EXPLORER_GUIDED} className="btn-primary">
              {lang === 'ko' ? '전천 탐색 시작 →' : 'Open Sky Explorer →'}
            </Link>
            <Link to="/" className="btn-secondary">
              {lang === 'ko' ? '홈으로' : 'Back to Home'}
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
