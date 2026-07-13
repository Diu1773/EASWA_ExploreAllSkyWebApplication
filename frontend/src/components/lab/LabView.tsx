import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { runPhotometry, buildLightCurve } from '../../api/client';
import { useAppStore } from '../../stores/useAppStore';
import { useLabData } from '../../hooks/useLabData';
import { useAuthStore } from '../../stores/useAuthStore';
import { useWorkflowDraftRoute } from '../../hooks/useWorkflowDraftRoute';
import { ThumbnailStrip } from './ThumbnailStrip';
import { ParamsPanel } from './ParamsPanel';
import { PhotometryResult } from './PhotometryResult';
import { LightCurvePlot } from './LightCurvePlot';
import { TransitLab } from './TransitLab';
import { KmtnetLab } from './KmtnetLab';
import { CmdExplorer } from './CmdExplorer';
import { ApertureSandbox, InquiryLayout, SkyDataPanel } from '../inquiry';
import { TransitComparison } from '../inquiry/TransitComparison';
import { TransitResultSummary } from '../inquiry/TransitResultSummary';
import {
  loadTransitFit,
  TRANSIT_FIT_SAVED_EVENT,
  type SavedTransitFit,
} from '../../workflows/transit/fitBridge';
import { exoplanetTransitModule } from '../../explorationBlocks/configs';
import {
  exoplanetAdapter,
  type ExoplanetAdapterContext,
} from '../../explorationBlocks/adapters/exoplanetAdapter';
import type {
  PhotometryMeasurement,
  LightCurveResponse,
} from '../../types/photometry';
import { buildDssPreviewUrl } from '../../utils/surveys';
import { formatTargetType } from '../../utils/targetFormat';
import {
  alignExplorerContext,
  buildLabHref,
  buildExplorerContextSearchParams,
  buildTargetHref,
  getExplorerContext,
} from '../../utils/explorerNavigation';
import { useLangStore, useT } from '../../i18n';
import { formatConstellation } from '../../utils/targetFormat';

// Map topic_id → workflow identifier
const TOPIC_WORKFLOW: Record<string, string> = {
  exoplanet_transit: 'transit',
  microlensing: 'microlensing',
};

export function LabView() {
  const lang = useLangStore((s) => s.lang);
  const t = useT();
  const { targetId } = useParams<{ targetId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { target, observations, error: loadError } = useLabData(targetId);
  const [measurements, setMeasurements] = useState<PhotometryMeasurement[]>([]);
  const [lightCurve, setLightCurve] = useState<LightCurveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [foldEnabled, setFoldEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIds = useAppStore((s) => s.selectedObservationIds);
  const aperture = useAppStore((s) => s.apertureRadius);
  const inner = useAppStore((s) => s.innerAnnulus);
  const outer = useAppStore((s) => s.outerAnnulus);
  const user = useAuthStore((s) => s.user);

  // Resolve workflow: prefer ?workflow= URL param (so back/forward works before
  // target data loads), fall back to topic_id once target is available.
  const workflowParam = searchParams.get('workflow');
  const topicWorkflow = target?.topic_id ? (TOPIC_WORKFLOW[target.topic_id] ?? null) : null;
  const resolvedWorkflow = workflowParam ?? topicWorkflow;
  const navigationContext = useMemo(() => {
    const ctx = getExplorerContext(searchParams, { topicId: target?.topic_id ?? null });
    return target === null ? ctx : alignExplorerContext(ctx, target.topic_id);
  }, [searchParams, target]);

  useEffect(() => {
    if (!target || !resolvedWorkflow) return;
    const next = new URLSearchParams(searchParams);
    next.delete('module');
    next.delete('topic');
    next.delete('site');
    next.delete('workflow');

    const canonical = buildExplorerContextSearchParams(
      navigationContext,
      [['workflow', resolvedWorkflow]]
    );
    canonical.forEach((value, key) => {
      next.set(key, value);
    });

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [navigationContext, resolvedWorkflow, searchParams, setSearchParams, target]);

  const isTransitWorkflow = resolvedWorkflow === 'transit';
  const isMicrolensingWorkflow = resolvedWorkflow === 'microlensing';
  const shouldOpenCmdExplorer =
    target?.topic_id === 'variable_star' || target?.topic_id === 'eclipsing_binary';

  const {
    draftId: parsedDraftId,
    seedRecordId: parsedSeedRecordId,
    draftRestoreReady,
  } = useWorkflowDraftRoute({
    workflowId: isMicrolensingWorkflow ? 'kmtnet_lab' : 'transit_lab',
    subjectId: targetId,
    enableDrafts: isTransitWorkflow || isMicrolensingWorkflow,
    userPresent: Boolean(user),
    onError: setErrorMessage,
  });

  useEffect(() => {
    if (loadError) setErrorMessage(loadError);
  }, [loadError]);

  // Read the fit the TransitLab bridges back, and refresh the moment a fit is
  // saved (same-tab custom event) so Steps 5–6 fill with the learner's result.
  const [transitFit, setTransitFit] = useState<SavedTransitFit | null>(null);
  useEffect(() => {
    if (!targetId) {
      setTransitFit(null);
      return;
    }
    const read = () => setTransitFit(loadTransitFit(targetId));
    read();
    window.addEventListener(TRANSIT_FIT_SAVED_EVENT, read);
    window.addEventListener('focus', read);
    return () => {
      window.removeEventListener(TRANSIT_FIT_SAVED_EVENT, read);
      window.removeEventListener('focus', read);
    };
  }, [targetId]);

  const handleRunPhotometry = async () => {
    if (!targetId || selectedIds.length === 0) return;

    setErrorMessage(null);
    setLoading(true);

    try {
      const [photoRes, lcRes] = await Promise.all([
        runPhotometry({
          target_id: targetId,
          observation_ids: selectedIds,
          aperture_radius: aperture,
          inner_annulus: inner,
          outer_annulus: outer,
        }),
        buildLightCurve({
          target_id: targetId,
          observation_ids: selectedIds,
          aperture_radius: aperture,
          inner_annulus: inner,
          outer_annulus: outer,
          fold_period: foldEnabled && target?.period_days ? target.period_days : null,
        }),
      ]);

      setMeasurements(photoRes.measurements);
      setLightCurve(lcRes);
    } catch (error) {
      console.error('Photometry run failed', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to run photometry.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFold = async () => {
    const newFold = !foldEnabled;
    setFoldEnabled(newFold);
    setErrorMessage(null);

    if (!targetId || selectedIds.length === 0 || !target) return;

    try {
      const lcRes = await buildLightCurve({
        target_id: targetId,
        observation_ids: selectedIds,
        aperture_radius: aperture,
        inner_annulus: inner,
        outer_annulus: outer,
        fold_period: newFold && target.period_days ? target.period_days : null,
      });
      setLightCurve(lcRes);
    } catch (error) {
      console.error('Failed to rebuild light curve', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update light curve.'
      );
    }
  };

  if (!target) {
    return <div className="loading">{lang === 'ko' ? '불러오는 중...' : 'Loading...'}</div>;
  }

  const targetHref = buildTargetHref(targetId ?? target.id, {
    ...navigationContext,
    topicId: target.topic_id,
  });

  if (isMicrolensingWorkflow) {
    if (!draftRestoreReady) {
      return <div className="loading">{lang === 'ko' ? '초안 복원 중...' : 'Restoring draft...'}</div>;
    }
    return (
      <div className="lab-view">
        <div className="lab-header">
          <div className="lab-header-main">
            <Link to={targetHref} className="back-link">
              &larr; {lang === 'ko' ? '대상으로' : 'Back to Target'}
            </Link>
            <div className="lab-header-copy">
              <h2>{lang === 'ko' ? '미시중력렌즈 Lab' : 'Microlensing Lab'}: {target.name}</h2>
              <div className="target-meta">
                <span className="badge">{formatTargetType(target.type, t)}</span>
                <span>{formatConstellation(target.constellation, lang)}</span>
                <span>KMTNet</span>
              </div>
            </div>
          </div>
          <img
            src={buildDssPreviewUrl(target.ra, target.dec, { width: 360, height: 220, fovDeg: 0.22 })}
            alt={`${target.name} ${lang === 'ko' ? '관측 미리보기' : 'survey preview'}`}
            className="lab-header-preview"
          />
        </div>
        <CmdExplorer target={target} defaultOpen={shouldOpenCmdExplorer} />
        <div className="lab-content">
          <div className="lab-results kmtnet-results">
            <KmtnetLab
              target={target}
              observations={observations}
              siteId={navigationContext.siteId ?? 'ctio'}
              draftId={parsedDraftId}
              seedRecordId={parsedSeedRecordId}
              learningMode={navigationContext.learningMode ?? 'guided'}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isTransitWorkflow) {
    if (!draftRestoreReady) {
      return <div className="loading">{lang === 'ko' ? '초안 복원 중...' : 'Restoring draft...'}</div>;
    }
    const transitContext: ExoplanetAdapterContext = {
      target,
      observations,
      labHref: buildLabHref(
        targetId ?? target.id,
        { ...navigationContext, topicId: target.topic_id },
        [['workflow', 'transit']],
      ),
    };
    return (
      <InquiryLayout
        module={exoplanetTransitModule}
        adapter={exoplanetAdapter}
        context={transitContext}
        initialStepId="step4_run_visualize"
        contextSlot={
          <div className="inquiry-target-context">
            <div className="inquiry-target-context-copy">
              <Link to={targetHref} className="back-link">
                &larr; {lang === 'ko' ? '대상으로' : 'Back to Target'}
              </Link>
              <h2>{lang === 'ko' ? '식현상 Lab' : 'Transit Lab'}: {target.name}</h2>
              <div className="target-meta">
                <span className="badge">{formatTargetType(target.type, t)}</span>
                <span>{formatConstellation(target.constellation, lang)}</span>
                {target.period_days && <span>P = {target.period_days} d</span>}
              </div>
            </div>
            <img
              src={buildDssPreviewUrl(target.ra, target.dec, { width: 360, height: 220, fovDeg: 0.22 })}
              alt={`${target.name} ${lang === 'ko' ? '관측 미리보기' : 'survey preview'}`}
              className="lab-header-preview"
            />
          </div>
        }
        metadataSlot={
          <SkyDataPanel
            targetName={target.name}
            ra={target.ra}
            dec={target.dec}
            pixelScaleArcsec={21}
            chips={[
              {
                label: { ko: 'TESS Sector', en: 'TESS sectors' },
                value:
                  observations.length > 0
                    ? observations.map((obs) => obs.sector).filter(Boolean).join(' · ')
                    : '—',
              },
              {
                label: { ko: '케이던스 (FFI)', en: 'Cadence (FFI)' },
                // FFI cadence follows the mission phase, not the stored metadata:
                // sectors 1-26 = 30 min, 27-55 = 10 min, 56+ = 200 s.
                value: (() => {
                  const cadences = [...new Set(observations.map((obs) => {
                    const s = obs.sector ?? 0;
                    return s >= 56 ? '200초' : s >= 27 ? '10분' : '30분';
                  }))];
                  return cadences.length ? `${cadences.join('·')}${cadences.length > 1 ? ' (섹터별)' : ''}` : '—';
                })(),
              },
              {
                label: { ko: '총 프레임', en: 'Total frames' },
                value: observations.some((obs) => obs.frame_count)
                  ? observations
                      .reduce((sum, obs) => sum + (obs.frame_count ?? 0), 0)
                      .toLocaleString()
                  : '—',
              },
              { label: { ko: '픽셀 스케일', en: 'Pixel scale' }, value: '21″/px' },
            ]}
          />
        }
        conditionsSlot={<ApertureSandbox />}
        analysisSlot={
          <TransitLab
            target={target}
            observations={observations}
            draftId={parsedDraftId}
            seedRecordId={parsedSeedRecordId}
            learningMode={navigationContext.learningMode ?? 'guided'}
          />
        }
        comparisonSlot={
          transitFit ? <TransitComparison fit={transitFit} target={target} /> : undefined
        }
        resultSummarySlot={
          transitFit ? <TransitResultSummary fit={transitFit} targetName={target.name} /> : undefined
        }
      />
    );
  }

  return (
    <div className="lab-view">
      <div className="lab-header">
        <div className="lab-header-main">
          <Link to={targetHref} className="back-link">
            &larr; {lang === 'ko' ? '대상으로' : 'Back to Target'}
          </Link>
          <div className="lab-header-copy">
            <h2>{lang === 'ko' ? '분석 Lab' : 'Lab'}: {target.name}</h2>
            <div className="target-meta">
              <span className="badge">{formatTargetType(target.type, t)}</span>
              <span>{formatConstellation(target.constellation, lang)}</span>
              {target.period_days && <span>P = {target.period_days} d</span>}
            </div>
          </div>
        </div>
        <img
          src={buildDssPreviewUrl(target.ra, target.dec, { width: 360, height: 220, fovDeg: 0.22 })}
          alt={`${target.name} ${lang === 'ko' ? '관측 미리보기' : 'survey preview'}`}
          className="lab-header-preview"
        />
      </div>

      <div className="lab-content">
        <div className="lab-sidebar">
          <ThumbnailStrip
            observations={observations}
            selectedIds={selectedIds}
          />
          <ParamsPanel />
          <div className="lab-actions">
            <button
              className="btn-primary"
              onClick={handleRunPhotometry}
              disabled={selectedIds.length === 0 || loading}
            >
              {loading
                ? lang === 'ko' ? '측광 실행 중...' : 'Running...'
                : lang === 'ko' ? '측광 실행' : 'Run Photometry'}
            </button>
            {errorMessage && <p className="hint error-text">{errorMessage}</p>}
            {lightCurve && (
              <label className="fold-toggle">
                <input
                  type="checkbox"
                  checked={foldEnabled}
                  onChange={handleToggleFold}
                />
                {lang === 'ko' ? '위상 접기' : 'Phase Fold'} (P = {target.period_days} d)
              </label>
            )}
          </div>
        </div>

        <div className="lab-results">
          <CmdExplorer target={target} defaultOpen={shouldOpenCmdExplorer} />
          {lightCurve && <LightCurvePlot data={lightCurve} />}
          <PhotometryResult measurements={measurements} />
        </div>
      </div>
    </div>
  );
}
