import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { fetchTarget, fetchObservations } from '../../api/client';
import { useAppStore } from '../../stores/useAppStore';
import { ObservationTable } from './ObservationTable';
import { AnalysisLauncher } from './AnalysisLauncher';
import type { Target, Observation } from '../../types/target';
import { buildDssPreviewUrl } from '../../utils/surveys';
import { useT, useLangStore } from '../../i18n';
import {
  formatTargetSource,
  formatTargetType,
  formatMagnitude,
  formatConstellation,
  buildTargetDescription,
} from '../../utils/targetFormat';
import {
  alignExplorerContext,
  buildExplorerContextSearchParams,
  buildExplorerHref,
  getExplorerBackLabel,
  getExplorerContext,
} from '../../utils/explorerNavigation';

export function TargetDetail() {
  const { targetId } = useParams<{ targetId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [target, setTarget] = useState<Target | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const setCurrentTarget = useAppStore((s) => s.setCurrentTarget);
  const t = useT();
  const lang = useLangStore((s) => s.lang);

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);

    Promise.all([fetchTarget(targetId), fetchObservations(targetId)]).then(
      ([detail, obs]) => {
        setTarget(detail.target);
        setCurrentTarget(detail.target);
        setObservations(obs);
        setLoading(false);
      }
    );
  }, [setCurrentTarget, targetId]);

  const navigationContext = useMemo(() => {
    const ctx = getExplorerContext(searchParams, { topicId: target?.topic_id ?? null });
    return target === null ? ctx : alignExplorerContext(ctx, target.topic_id);
  }, [searchParams, target]);

  useEffect(() => {
    if (!target) return;
    const next = buildExplorerContextSearchParams(navigationContext);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [navigationContext, searchParams, setSearchParams, target]);

  if (loading || !target) {
    return <div className="loading">{t('detail.loading')}</div>;
  }

  const sourceLabel = formatTargetSource(target.data_source, t);
  // Transit targets have a module block now; sending them "Back to Explorer"
  // dropped learners onto the standalone legacy sky page. This page itself is
  // only reached from record views (/my, /records) these days.
  const isTransitTarget = target.topic_id === 'exoplanet_transit';
  const backHref = isTransitTarget
    ? `/modules/exoplanet-transit?target=${target.id}`
    : buildExplorerHref(navigationContext);
  const backLabel = isTransitTarget
    ? lang === 'ko' ? '탐구 화면으로' : 'Back to Inquiry'
    : getExplorerBackLabel(navigationContext);

  return (
    <div className="target-detail">
      <div className="detail-header">
        <Link to={backHref} className="back-link">
          <svg className="back-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          {backLabel}
        </Link>
        <div className="detail-overview">
          <div className="detail-summary">
            <h2>{target.name}</h2>
            <div className="target-meta">
              <span className="badge">{formatTargetType(target.type, t)}</span>
              <span>{formatConstellation(target.constellation, lang)}</span>
              <span>{t('detail.ra')}: {target.ra.toFixed(4)}&deg;</span>
              <span>{t('detail.dec')}: {target.dec.toFixed(4)}&deg;</span>
              <span>{t('detail.mag')}: {formatMagnitude(target.magnitude_range, t)}</span>
              {target.period_days && <span>{t('detail.period')} = {target.period_days} {lang === 'ko' ? '일' : 'd'}</span>}
              {sourceLabel && <span>{t('detail.source')}: {sourceLabel}</span>}
            </div>
            <p className="target-description">{buildTargetDescription(target, lang)}</p>
          </div>

          <div className="detail-survey-card">
            <img
              src={buildDssPreviewUrl(target.ra, target.dec, { width: 640, height: 360, fovDeg: 0.28 })}
              alt={`${target.name} DSS2 preview`}
              className="detail-survey-image"
            />
            <div className="detail-survey-meta">
              <span>DSS2</span>
              <span>{formatConstellation(target.constellation, lang)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-body">
        <ObservationTable observations={observations} />
        <AnalysisLauncher target={target} />
      </div>
    </div>
  );
}
