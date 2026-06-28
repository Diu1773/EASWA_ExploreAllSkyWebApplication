import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlotlyModule from 'plotly.js-dist-min';
import { fetchTargets, fetchMicrolensingLightcurve, fitMicrolensingModel } from '../../api/client';
import type { Target } from '../../types/target';
import type {
  MicrolensingLightCurveResponse,
  MicrolensingFitResponse,
} from '../../types/microlensing';
import { useLangStore } from '../../i18n';
import { moduleAdapters } from '../../explorationBlocks/adapters';
import type { ExplorationModuleConfig } from '../../explorationBlocks/types';
import { InquiryLayout } from '../inquiry';

const Microlens3DScene = lazy(() => import('../sky/Microlens3DScene'));
const KmtnetSkyMap = lazy(() =>
  import('../sky/KmtnetSkyMap').then((m) => ({ default: m.KmtnetSkyMap })),
);
const plotly = (PlotlyModule as any).default ?? (PlotlyModule as any);

const KMT_VIDEO_ID = 'QqobzbD7k7g'; // KASI: '제2의 지구'를 찾는 KMTNet
const ALL_SITES = ['ctio', 'saao', 'sso'] as const;
const SITE_COLORS: Record<string, string> = { ctio: '#e8722a', saao: '#2563eb', sso: '#16a34a' };
const SITE_LABELS: Record<string, { ko: string; en: string }> = {
  ctio: { ko: 'CTIO (칠레)', en: 'CTIO (Chile)' },
  saao: { ko: 'SAAO (남아공)', en: 'SAAO (S.Africa)' },
  sso: { ko: 'SSO (호주)', en: 'SSO (Australia)' },
};
const TYPE_LABEL: Record<string, { ko: string; en: string }> = {
  ML: { ko: '단일 렌즈', en: 'Single lens' },
  'ML-HM': { ko: '고증폭', en: 'High magnification' },
  'ML-P': { ko: '행성 이상신호', en: 'Planetary anomaly' },
};

interface KmtnetModuleViewProps {
  module: ExplorationModuleConfig;
}

function LightCurvePanel({
  lc,
  fit,
  lang,
}: {
  lc: MicrolensingLightCurveResponse;
  fit: MicrolensingFitResponse | null;
  lang: 'ko' | 'en';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const sites = Array.from(new Set(lc.points.map((p) => p.site)));
    const traces: any[] = sites.map((site) => {
      const pts = lc.points.filter((p) => p.site === site);
      return {
        x: pts.map((p) => p.hjd),
        y: pts.map((p) => p.magnitude),
        error_y: { type: 'data', array: pts.map((p) => p.mag_error), visible: true, color: SITE_COLORS[site] + '66', thickness: 1, width: 0 },
        mode: 'markers',
        type: 'scatter',
        name: SITE_LABELS[site]?.[lang] ?? site,
        marker: { color: SITE_COLORS[site], size: 5, opacity: 0.85 },
      };
    });
    if (fit) {
      traces.push({
        x: fit.model_curve.map((p) => p.hjd),
        y: fit.model_curve.map((p) => p.magnitude),
        mode: 'lines',
        type: 'scatter',
        name: lang === 'ko' ? 'Paczyński 적합' : 'Paczyński fit',
        line: { color: '#e2e8f0', width: 2.5 },
        hoverinfo: 'skip',
      });
    }
    plotly.react(
      ref.current,
      traces,
      {
        xaxis: { title: { text: 'HJD', font: { color: '#9aa3b0', size: 11 } }, gridcolor: 'rgba(255,255,255,0.06)', color: '#9aa3b0' },
        yaxis: { title: { text: lc.y_label, font: { color: '#9aa3b0', size: 11 } }, autorange: 'reversed', gridcolor: 'rgba(255,255,255,0.06)', color: '#9aa3b0' },
        plot_bgcolor: '#12161e',
        paper_bgcolor: '#1a2030',
        font: { family: 'IBM Plex Mono, monospace', color: '#9aa3b0', size: 11 },
        margin: { t: 16, r: 16, b: 44, l: 60 },
        showlegend: true,
        legend: { x: 1, y: 1, xanchor: 'right', yanchor: 'top', bgcolor: 'rgba(26,32,48,0.85)', font: { size: 10, color: '#d4dae5' } },
      },
      { responsive: true, displayModeBar: false },
    );
  }, [lc, fit, lang]);
  return <div ref={ref} className="kmt-lc-plot" />;
}

export function KmtnetModuleView({ module }: KmtnetModuleViewProps) {
  const lang = useLangStore((state) => state.lang);
  const ko = lang === 'ko';
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('event') ?? '';

  const [events, setEvents] = useState<Target[]>([]);
  const [sites, setSites] = useState<string[]>([...ALL_SITES]);
  const [lc, setLc] = useState<MicrolensingLightCurveResponse | null>(null);
  const [fit, setFit] = useState<MicrolensingFitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fitting, setFitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    fetchTargets('microlensing')
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    setFit(null);
    if (!selectedId) {
      setLc(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchMicrolensingLightcurve(selectedId, null, { includeSites: sites })
      .then((data) => active && setLc(data))
      .catch((err: unknown) => {
        if (active) {
          setLc(null);
          setError(err instanceof Error ? err.message : 'Failed to load light curve');
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [selectedId, sites]);

  const selectedEvent = useMemo(() => events.find((e) => e.id === selectedId) ?? null, [events, selectedId]);

  const handleSelect = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('event', id);
    setSearchParams(next, { replace: false });
    setListOpen(false);
  };

  const toggleSite = (site: string) =>
    setSites((cur) => (cur.includes(site) ? cur.filter((s) => s !== site) : [...cur, site]));

  const handleFit = async () => {
    if (!lc || lc.points.length < 5) return;
    setFitting(true);
    setError(null);
    try {
      const result = await fitMicrolensingModel({
        target_id: selectedId,
        points: lc.points.map((p) => ({ hjd: p.hjd, magnitude: p.magnitude, mag_error: p.mag_error })),
      });
      setFit(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fit failed');
    } finally {
      setFitting(false);
    }
  };

  const introSlot = (
    <div className="kmt-intro-stack">
      <Suspense fallback={null}>
        <Microlens3DScene />
      </Suspense>
      <div className="kmt-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${KMT_VIDEO_ID}`}
          title={ko ? '한국천문연구원 KMTNet 소개 영상' : 'KASI KMTNet introduction'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <p className="kmt-video-credit">
          {ko
            ? '영상: 한국천문연구원(KASI) — 은하수 별밭에서 한 별만 미시중력렌즈로 잠깐 밝아지는 모습을 보여줍니다.'
            : 'Video: Korea Astronomy and Space Science Institute (KASI) — a single star in the Milky Way briefly brightening by microlensing.'}
        </p>
      </div>
    </div>
  );

  const contextSlot = selectedEvent ? (
    <div className="inquiry-target-context">
      <div>
        <span className="inquiry-target-context-kicker">{ko ? '선택한 이벤트' : 'Selected event'}</span>
        <strong>{selectedEvent.name}</strong>
        <span className="inquiry-target-context-meta">
          {TYPE_LABEL[selectedEvent.type]?.[lang] ?? selectedEvent.type}
        </span>
      </div>
    </div>
  ) : null;

  const selectionSlot = (
    <div className="inquiry-sky-embed">
      <p className="inquiry-sky-embed-hint">
        {selectedEvent
          ? ko
            ? `현재 선택: ${selectedEvent.name} — 다른 이벤트 마커를 클릭하면 바뀝니다.`
            : `Selected: ${selectedEvent.name} — click another marker to change.`
          : ko
            ? '전천 시뮬에서 미시중력렌즈 이벤트(색 마커)를 클릭해 선택하세요. 드래그로 하늘을 둘러볼 수 있습니다.'
            : 'Click a microlensing event marker on the all-sky view to select it. Drag to look around.'}
      </p>
      <Suspense
        fallback={
          <div className="inquiry-lab-handoff">
            <p>{ko ? '전천 시뮬 불러오는 중…' : 'Loading all-sky view…'}</p>
          </div>
        }
      >
        <KmtnetSkyMap
          events={events}
          siteId="ctio"
          selectedEvent={selectedEvent}
          focusTarget={selectedEvent}
          onEventClick={(e) => handleSelect(e.id)}
        />
      </Suspense>
      <div className="kmt-pick">
        <button type="button" className="kmt-pick-toggle" onClick={() => setListOpen((o) => !o)}>
          <span>{ko ? '목록에서 정확히 고르기' : 'Pick precisely from a list'}</span>
          <span className="kmt-pick-caret">{listOpen ? '▴' : `▾ ${ko ? '이벤트 목록' : 'event list'}`}</span>
        </button>
        {listOpen && (
          <div className="kmt-pick-grid">
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className={`kmt-pick-card${ev.id === selectedId ? ' is-selected' : ''}`}
                onClick={() => handleSelect(ev.id)}
              >
                <span className="kmt-pick-type" style={{ color: ev.type === 'ML-HM' ? '#fb923c' : ev.type === 'ML-P' ? '#4ade80' : '#60a5fa' }}>
                  {TYPE_LABEL[ev.type]?.[lang] ?? ev.type}
                </span>
                <strong>{ev.name}</strong>
                <span className="kmt-pick-desc">{ev.magnitude_range}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const analysisSlot = (() => {
    if (!selectedId) {
      return (
        <div className="inquiry-lab-handoff">
          <p>{ko ? '먼저 위에서 미시중력렌즈 이벤트를 선택하세요.' : 'Select a microlensing event above first.'}</p>
        </div>
      );
    }
    return (
      <div className="kmt-analysis">
        <div className="kmt-site-toggle" role="group" aria-label={ko ? '관측소 선택' : 'Sites'}>
          <span className="kmt-site-toggle-label">{ko ? '관측소 결합:' : 'Combine sites:'}</span>
          {ALL_SITES.map((site) => (
            <label key={site} className={`kmt-site-chip${sites.includes(site) ? ' on' : ''}`} style={{ '--site-color': SITE_COLORS[site] } as CSSProperties}>
              <input type="checkbox" checked={sites.includes(site)} onChange={() => toggleSite(site)} />
              {SITE_LABELS[site][lang]}
            </label>
          ))}
        </div>
        {loading && <p className="hint">{ko ? '실제 KMTNet 광도곡선을 불러오는 중…' : 'Loading real KMTNet light curve…'}</p>}
        {error && <p className="error-message">{error}</p>}
        {lc && lc.points.length > 0 && (
          <>
            <LightCurvePanel lc={lc} fit={fit} lang={lang} />
            <p className="kmt-lc-meta">
              {ko
                ? `실제 KMTNet pySIS 차분측광 · ${lc.points.length}점 · 관측소 ${lc.included_sites.map((s) => s.toUpperCase()).join('·')}`
                : `Real KMTNet pySIS difference photometry · ${lc.points.length} pts · ${lc.included_sites.map((s) => s.toUpperCase()).join('·')}`}
              {lc.missing_sites.length > 0 && (ko ? ` · 누락: ${lc.missing_sites.map((s) => s.toUpperCase()).join('·')}` : ` · missing: ${lc.missing_sites.map((s) => s.toUpperCase()).join('·')}`)}
            </p>
            <div className="kmt-fit-row">
              <button type="button" className="btn-primary" disabled={fitting} onClick={handleFit}>
                {fitting ? (ko ? '적합 중…' : 'Fitting…') : ko ? '단일 렌즈(Paczyński) 모델 적합' : 'Fit single-lens (Paczyński) model'}
              </button>
              {fit && (
                <span className="kmt-fit-summary">
                  u₀={fit.u0} · t<sub>E</sub>={fit.tE} d · χ²/dof={fit.chi2_dof}
                </span>
              )}
            </div>
          </>
        )}
        {lc && lc.points.length === 0 && (
          <p className="hint">{ko ? '이 이벤트는 선택한 관측소에 공개 자료가 없습니다.' : 'No public data for the selected sites.'}</p>
        )}
      </div>
    );
  })();

  const comparisonSlot = fit && lc?.ref_u0 ? (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">{ko ? '내 적합값 ↔ 발표값' : 'Your fit ↔ published'}</span>
      <h3>{selectedEvent?.name}</h3>
      <table className="inquiry-compare-table">
        <thead>
          <tr>
            <th>{ko ? '항목' : 'Quantity'}</th>
            <th>{ko ? '내 적합' : 'Your fit'}</th>
            <th>{ko ? '발표값(KMTNet)' : 'Published (KMTNet)'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>u₀</td>
            <td>{fit.u0}</td>
            <td>{lc.ref_u0?.toFixed(3)}</td>
          </tr>
          <tr>
            <td>t<sub>E</sub> (d)</td>
            <td>{fit.tE}</td>
            <td>{lc.ref_te?.toFixed(2)}</td>
          </tr>
          <tr>
            <td>t₀ (HJD)</td>
            <td>{fit.t0.toFixed(3)}</td>
            <td>{lc.ref_t0?.toFixed(3)}</td>
          </tr>
        </tbody>
      </table>
      <div className="inquiry-callout">
        {ko
          ? 'u₀·tE가 발표값과 얼마나 일치하나요? χ²/dof가 1보다 크면 실측 오차가 과소추정됐거나(실제 자료에서 흔함) 단일 렌즈 모델로 설명 안 되는 구조(예: 행성 아노말리)가 있을 수 있습니다. 차이의 원인을 적어 보세요.'
          : 'How well do u₀ and tE match the published values? A χ²/dof above 1 can mean the formal errors are underestimated (common in real data) or that a single-lens model misses real structure (e.g. a planetary anomaly). Note what explains the difference.'}
      </div>
    </section>
  ) : (
    <div className="inquiry-lab-handoff">
      <p>{ko ? '분석에서 단일 렌즈 모델을 적합한 뒤, 그 값을 발표값과 비교합니다.' : 'Fit the single-lens model in the analysis step, then compare it with the published values here.'}</p>
    </div>
  );

  const recordSave = fit
    ? {
        workflow: 'kmtnet_lab',
        templateId: 'kmtnet_record',
        targetId: selectedId,
        title: selectedEvent?.name ?? selectedId,
        context: {
          source: 'kmtnet-block',
          event: { id: selectedId, name: selectedEvent?.name, type: selectedEvent?.type },
          sites: lc?.included_sites ?? [],
          fit: { t0: fit.t0, u0: fit.u0, tE: fit.tE, chi2_dof: fit.chi2_dof },
          published: { t0: lc?.ref_t0, u0: lc?.ref_u0, tE: lc?.ref_te },
        },
      }
    : undefined;

  return (
    <InquiryLayout
      module={module}
      adapter={moduleAdapters[module.id]}
      introSlot={introSlot}
      contextSlot={contextSlot}
      selectionSlot={selectionSlot}
      analysisSlot={analysisSlot}
      comparisonSlot={comparisonSlot}
      recordSave={recordSave}
      maxUnlockedStepIndex={fit ? undefined : 4}
    />
  );
}
