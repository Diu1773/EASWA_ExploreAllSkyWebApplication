import { Link } from 'react-router-dom';
import { ImageWithFallback } from '../layout/ImageWithFallback';
import { ASTRO_FALLBACK_IMAGE, KMT_SITE_IMAGES } from '../../data/imageSources';
import { buildExplorerHref } from '../../utils/explorerNavigation';
import { useLangStore } from '../../i18n';

const OBSERVATORIES = [
  {
    id: 'ctio',
    code: 'CTIO',
    country: { ko: '칠레', en: 'Chile' },
    location: { ko: '세로 톨롤로, 칠레 북부 · 해발 2,207 m', en: 'Cerro Tololo, northern Chile · 2,207 m' },
    description: { ko: '남미 구간 담당. 은하 벌지가 하늘 높이 뜨는 최적 위치.', en: 'Covers the South American window with an excellent view of the Galactic bulge.' },
    image: KMT_SITE_IMAGES.ctio as string | null,
  },
  {
    id: 'saao',
    code: 'SAAO',
    country: { ko: '남아프리카', en: 'South Africa' },
    location: { ko: '서덜랜드, 남아프리카공화국 · 해발 1,760 m', en: 'Sutherland, South Africa · 1,760 m' },
    description: { ko: 'CTIO와 SSO 사이의 관측 공백을 잇는 핵심 거점.', en: 'Bridges the observing gap between CTIO and SSO.' },
    image: KMT_SITE_IMAGES.saao as string | null,
  },
  {
    id: 'sso',
    code: 'SSO',
    country: { ko: '호주', en: 'Australia' },
    location: { ko: '사이딩 스프링, 뉴사우스웨일스 · 해발 1,165 m', en: 'Siding Spring, New South Wales · 1,165 m' },
    description: { ko: '아시아-태평양 시간대를 커버하며 24시간 연속망을 완성.', en: 'Covers the Asia-Pacific window and completes the near-continuous network.' },
    image: KMT_SITE_IMAGES.sso as string | null,
  },
];

export function ObservatorySelectPage() {
  const lang = useLangStore((s) => s.lang);

  return (
    <div className="edu-page">
      <div className="edu-page-inner">

        <header className="edu-header">
          <Link to="/kmtnet" className="back-link">
            <svg className="back-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            {lang === 'ko' ? 'KMTNet 소개' : 'KMTNet Introduction'}
          </Link>
          <span className="page-chip">
            KMTNet · {lang === 'ko' ? '관측소 선택' : 'Observatory Selection'}
          </span>
          <h1>{lang === 'ko' ? '관측소를 선택하세요' : 'Choose an observatory'}</h1>
          <p>
            {lang === 'ko'
              ? '세 관측소는 경도 약 120° 간격으로 배치되어 은하 벌지를 24시간 연속으로 감시합니다. 탐구를 시작할 관측소를 고르세요.'
              : 'The three observatories are spaced by about 120° in longitude to monitor the Galactic bulge nearly continuously. Choose a site to begin.'}
          </p>
        </header>

        <div className="obs-select-grid">
          {OBSERVATORIES.map((site) => (
            <article key={site.id} className="obs-select-card">
              {/* 사진 영역 */}
              <div className="edu-site-photo-wrap">
                {site.image ? (
                  <ImageWithFallback
                    src={site.image}
                    fallbackSrc={ASTRO_FALLBACK_IMAGE}
                    alt={`KMTNet ${site.code} ${lang === 'ko' ? '관측소' : 'observatory'}`}
                    className="edu-site-photo"
                    loading="lazy"
                  />
                ) : (
                  <div className="edu-site-photo-placeholder">
                    <span className="edu-site-placeholder-code">{site.code}</span>
                    <span className="edu-site-placeholder-hint">
                      {lang === 'ko' ? '사진 추가 예정' : 'Image pending'}
                    </span>
                  </div>
                )}
                <span className="edu-site-country-badge">{site.country[lang]}</span>
              </div>

              {/* 정보 */}
              <div className="obs-select-body">
                <strong className="edu-site-code">{site.code}</strong>
                <span className="edu-site-location">{site.location[lang]}</span>
                <p className="edu-site-detail">{site.description[lang]}</p>
                <Link
                  to={buildExplorerHref({
                    moduleId: 'kmtnet',
                    topicId: null,
                    siteId: site.id,
                  })}
                  className="btn-primary obs-select-cta"
                >
                  {lang === 'ko' ? `${site.code}에서 탐구 시작 →` : `Start at ${site.code} →`}
                </Link>
              </div>
            </article>
          ))}
        </div>

      </div>
    </div>
  );
}
