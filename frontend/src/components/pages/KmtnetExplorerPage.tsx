import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchTargets } from '../../api/client';
import type { Target } from '../../types/target';
import {
  buildLabHref,
  getExplorerContext,
} from '../../utils/explorerNavigation';
import { KmtnetSkyMap } from '../sky/KmtnetSkyMap';
import { useLangStore } from '../../i18n';
import { buildTargetDescription, formatConstellation } from '../../utils/targetFormat';

const SITE_LABELS: Record<string, { ko: string; en: string }> = {
  ctio: { ko: 'CTIO — 칠레', en: 'CTIO — Chile' },
  saao: { ko: 'SAAO — 남아프리카', en: 'SAAO — South Africa' },
  sso:  { ko: 'SSO — 호주', en: 'SSO — Australia' },
};

const TYPE_LABEL: Record<string, { ko: string; en: string }> = {
  'ML':    { ko: '단일 렌즈', en: 'Single lens' },
  'ML-HM': { ko: '고증폭', en: 'High magnification' },
  'ML-P':  { ko: '행성 이상신호', en: 'Planetary anomaly' },
};

const TYPE_COLOR: Record<string, string> = {
  'ML':    '#60a5fa',
  'ML-HM': '#fb923c',
  'ML-P':  '#4ade80',
};

const ALL_TYPES = ['ML', 'ML-HM', 'ML-P'] as const;

// ── Inline popup ──────────────────────────────────────────────────────────────

interface PopupProps {
  event: Target;
  onGoto: () => void;
  onExplore: () => void;
  onClose: () => void;
}

function KmtnetEventPopup({ event, onGoto, onExplore, onClose }: PopupProps) {
  const lang = useLangStore((s) => s.lang);
  const color = TYPE_COLOR[event.type] ?? '#94a3b8';
  const label = TYPE_LABEL[event.type]?.[lang] ?? event.type;
  return (
    <div className="kmt-event-popup">
      <div className="kmt-popup-header">
        <span className="kmt-popup-type-badge" style={{ color, borderColor: color + '55', background: color + '18' }}>
          {label}
        </span>
        <button
          className="kmt-popup-close"
          onClick={onClose}
          aria-label={lang === 'ko' ? '닫기' : 'Close'}
        >
          &times;
        </button>
      </div>
      <h3 className="kmt-popup-name">{event.name}</h3>
      <p className="kmt-popup-coord">
        RA {event.ra.toFixed(3)}° &ensp; Dec {event.dec.toFixed(3)}° &ensp;·&ensp;{' '}
        {formatConstellation(event.constellation, lang)}
      </p>
      <p className="kmt-popup-mag">{event.magnitude_range}</p>
      <p className="kmt-popup-desc">{buildTargetDescription(event, lang)}</p>
      <div className="kmt-popup-actions">
        <button className="btn-secondary kmt-popup-goto" onClick={onGoto}>
          GoTo ↗
        </button>
        <button className="btn-primary" onClick={onExplore}>
          {lang === 'ko' ? '탐구 시작' : 'Start Investigation'}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function KmtnetExplorerPage() {
  const lang = useLangStore((s) => s.lang);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = getExplorerContext(searchParams, { moduleId: 'kmtnet', siteId: 'ctio' });
  const siteId = context.siteId ?? 'ctio';
  const siteLabel = SITE_LABELS[siteId]?.[lang] ?? siteId.toUpperCase();

  const [events, setEvents]           = useState<Target[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [typeFilter, setTypeFilter]   = useState<string | null>(null);
  const [nameSearch, setNameSearch]   = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Target | null>(null);
  const [focusTarget, setFocusTarget]     = useState<Target | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchTargets('microlensing')
      .then((data) => { setEvents(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  const labHref = (ev: Target) =>
    buildLabHref(
      ev.id,
      { moduleId: 'kmtnet', topicId: 'microlensing', siteId },
      [
        ['workflow', 'microlensing'],
        ['step', 'field'],
      ],
    );

  const handleMapClick = (ev: Target) => {
    setSelectedEvent(ev);
  };

  const handleGoto = () => {
    if (!selectedEvent) return;
    setFocusTarget(selectedEvent);
  };

  const handleExplore = () => {
    if (!selectedEvent) return;
    navigate(labHref(selectedEvent));
  };

  const q = nameSearch.trim().toLowerCase();
  const filteredEvents = events.filter((e) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (q && !e.name.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false;
    return true;
  });
  const mapEvents = q || typeFilter ? filteredEvents : events;

  return (
    <div className="edu-page">
      <div className="edu-page-inner">

        <header className="edu-header">
          <Link to="/kmtnet/sites" className="back-link">
            <svg className="back-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            {lang === 'ko' ? '관측소 선택' : 'Choose Observatory'}
          </Link>
          <span className="page-chip">KMTNet · {siteLabel}</span>
          <h1>{lang === 'ko' ? '미시중력렌즈 이벤트 탐구' : 'Microlensing Event Investigation'}</h1>
          <p>
            {lang === 'ko'
              ? '은하 벌지 방향 40개 이벤트가 하늘 지도에 표시됩니다. 마커를 클릭하거나 아래 목록에서 이벤트를 선택하면 CTIO · SAAO · SSO 측광 자료를 불러와 Paczyński 모델을 직접 적합할 수 있습니다.'
              : 'The sky map shows 40 events toward the Galactic bulge. Select a marker or an event below to load CTIO, SAAO, and SSO photometry and fit a Paczyński model.'}
          </p>
        </header>

        {/* ── Search + Sky map ── */}
        {!loading && !error && (
          <section className="kmt-skymap-section">
            <div className="kmt-search-bar">
              <input
                type="search"
                className="kmt-search-input"
                placeholder={lang === 'ko'
                  ? '이벤트 이름 검색 (예: KMT-2022, blg-0440)…'
                  : 'Search event name (e.g. KMT-2022, blg-0440)…'}
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
              {q && (
                <span className="kmt-search-count">
                  {filteredEvents.length} / {events.length}
                </span>
              )}
            </div>

            {/* Map + popup wrapper */}
            <div className="kmt-map-popup-wrap">
              <KmtnetSkyMap
                events={mapEvents}
                siteId={siteId}
                selectedEvent={selectedEvent}
                focusTarget={focusTarget}
                onEventClick={handleMapClick}
              />
              {selectedEvent && (
                <KmtnetEventPopup
                  event={selectedEvent}
                  onGoto={handleGoto}
                  onExplore={handleExplore}
                  onClose={() => setSelectedEvent(null)}
                />
              )}
            </div>
          </section>
        )}

        {/* ── Data pipeline ── */}
        <section className="kmtnet-pipeline-box">
          <h3>{lang === 'ko' ? '데이터 처리 과정' : 'Data processing pipeline'}</h3>
          <div className="kmtnet-pipeline-steps">
            <div className="kmtnet-pipeline-step">
              <span className="kmtnet-step-num">1</span>
              <div>
                <strong>{lang === 'ko' ? '차분 이미지 분석 (DIA)' : 'Difference image analysis (DIA)'}</strong>
                <p>
                  {lang === 'ko'
                    ? '기준 이미지와 각 관측 이미지의 차이를 픽셀 단위로 측정해 배경별이 밀집한 은하 벌지의 혼합광(blending) 문제를 줄입니다.'
                    : 'Measure pixel-level differences between a reference image and each observation to reduce blending in the crowded Galactic bulge.'}
                  <span className="kmtnet-ref"> [pySIS: Albrow et al. 2009; pyDIA: Albrow 2017]</span>
                </p>
              </div>
            </div>
            <div className="kmtnet-pipeline-step">
              <span className="kmtnet-step-num">2</span>
              <div>
                <strong>{lang === 'ko' ? 'I-band 측광 및 보정' : 'I-band photometry and calibration'}</strong>
                <p>
                  {lang === 'ko'
                    ? 'KMTNet은 주로 Cousins I-band로 관측하며, 3개 관측소의 측광 영점(zeropoint)을 공통 기준으로 정렬합니다.'
                    : 'KMTNet primarily observes in Cousins I-band and aligns the photometric zeropoints of all three sites to a common reference.'}{' '}
                  (λ<sub>eff</sub> ≈ 800 nm)
                  <span className="kmtnet-ref"> [Kim et al. 2016, JKAS 49, 37]</span>
                </p>
              </div>
            </div>
            <div className="kmtnet-pipeline-step">
              <span className="kmtnet-step-num">3</span>
              <div>
                <strong>{lang === 'ko' ? 'Paczyński 모델 적합' : 'Paczyński model fit'}</strong>
                <p>
                  {lang === 'ko'
                    ? '단일 렌즈 3-파라미터 모델을 MCMC 또는 Levenberg–Marquardt로 적합하고, 행성 신호가 있으면 이진 렌즈(binary lens) 모델로 확장합니다.'
                    : 'Fit the three-parameter single-lens model with MCMC or Levenberg–Marquardt, then extend to a binary-lens model when a planetary signal is present.'}{' '}
                  (t₀, u₀, t<sub>E</sub>)
                  <span className="kmtnet-ref"> [Paczyński 1986, ApJ 304, 1]</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Event list ── */}
        <section>
          <div className="kmt-list-header">
            <h2 className="edu-section-title" style={{ marginBottom: 0 }}>
              {lang === 'ko' ? '이벤트 목록' : 'Event list'}
              <span className="kmt-list-count">{filteredEvents.length} / {events.length}</span>
            </h2>
            <div className="kmt-list-filter">
              <button
                type="button"
                className={`kmt-list-chip${!typeFilter ? ' active' : ''}`}
                onClick={() => setTypeFilter(null)}
              >
                {lang === 'ko' ? '전체' : 'All'}
              </button>
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`kmt-list-chip${typeFilter === t ? ' active' : ''}`}
                  style={{ '--chip-color': TYPE_COLOR[t] } as React.CSSProperties}
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                >
                  {TYPE_LABEL[t][lang]}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <p className="hint">{lang === 'ko' ? '이벤트 불러오는 중...' : 'Loading events...'}</p>
          )}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <div className="kmtnet-event-list">
              {filteredEvents.map((ev) => {
                const color = TYPE_COLOR[ev.type] ?? '#64748b';
                const typeLabel = TYPE_LABEL[ev.type]?.[lang] ?? ev.type;
                const isSelected = selectedEvent?.id === ev.id;
                return (
                  <article
                    key={ev.id}
                    className={`kmtnet-event-card${isSelected ? ' selected' : ''}`}
                    onClick={() => setSelectedEvent(isSelected ? null : ev)}
                  >
                    <div className="kmtnet-event-header">
                      <span
                        className="kmtnet-event-type-badge"
                        style={{ background: color + '18', color, borderColor: color + '44' }}
                      >
                        {typeLabel}
                      </span>
                      <strong className="kmtnet-event-name">{ev.name}</strong>
                      <span className="kmtnet-event-mag">{ev.magnitude_range}</span>
                    </div>
                    <p className="kmtnet-event-desc">{buildTargetDescription(ev, lang)}</p>
                    <div className="kmtnet-event-footer">
                      <span className="kmtnet-event-coord">
                        RA {ev.ra.toFixed(2)}°&ensp;Dec {ev.dec.toFixed(2)}°&ensp;·&ensp;
                        {formatConstellation(ev.constellation, lang)}
                      </span>
                      <Link
                        to={labHref(ev)}
                        className="btn-primary kmtnet-event-cta"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lang === 'ko' ? '탐구 시작' : 'Start Investigation'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ── References ── */}
        <section className="kmtnet-ref-section">
          <h3>{lang === 'ko' ? '참고 문헌' : 'References'}</h3>
          <ul className="kmtnet-ref-list">
            <li>Kim et al. (2016) — <em>KMTNet: A Network of 1.6m Wide-Field Optical Telescopes</em>, JKAS 49, 37</li>
            <li>Albrow et al. (2009) — <em>Difference Imaging Photometry of Blended Gravitational Microlensing Events</em>, ApJ 698, 1323</li>
            <li>Albrow (2017) — <em>pyDIA: Difference Image Analysis Software</em>, Zenodo</li>
            <li>Paczyński (1986) — <em>Gravitational Microlensing by the Galactic Halo</em>, ApJ 304, 1</li>
            <li>Gould (2000) — <em>A Natural Formalism for Microlensing</em>, ApJ 542, 785</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
