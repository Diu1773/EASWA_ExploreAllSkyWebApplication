import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchTarget } from '../../api/client';
import type { Target } from '../../types/target';
import { useLangStore } from '../../i18n';
import { useAppStore } from '../../stores/useAppStore';
import { moduleAdapters } from '../../explorationBlocks/adapters';
import type { ExplorationModuleConfig } from '../../explorationBlocks/types';
import { buildTargetHref, type ExplorerRouteContext } from '../../utils/explorerNavigation';
import { formatConstellation } from '../../utils/targetFormat';
import { InquiryLayout, SkyDataPanel } from '../inquiry';
import { TransitComparison } from '../inquiry/TransitComparison';
import { TransitResultSummary } from '../inquiry/TransitResultSummary';
import { SkyExplorer } from '../sky/SkyExplorer';
import {
  loadTransitFit,
  TRANSIT_FIT_SAVED_EVENT,
  type SavedTransitFit,
} from '../../workflows/transit/fitBridge';

const Transit3DScene = lazy(() => import('../sky/Transit3DScene'));

const ANALYSIS_CONTEXT: ExplorerRouteContext = {
  moduleId: 'tess',
  topicId: 'exoplanet_transit',
  siteId: null,
  learningMode: 'guided',
};

interface ExoplanetModuleViewProps {
  module: ExplorationModuleConfig;
}

export function ExoplanetModuleView({ module }: ExoplanetModuleViewProps) {
  const lang = useLangStore((state) => state.lang);
  const [searchParams, setSearchParams] = useSearchParams();
  const targetId = searchParams.get('target') ?? '';
  const navigate = useNavigate();
  const setTopic = useAppStore((s) => s.setTopic);

  const handleSelectTarget = (selected: Target) => {
    const next = new URLSearchParams(searchParams);
    next.set('target', selected.id);
    setSearchParams(next, { replace: false });
  };

  const [target, setTarget] = useState<Target | null>(null);

  // Drive the embedded sky map (Step 1) to show exoplanet-transit targets.
  useEffect(() => {
    setTopic('exoplanet_transit');
  }, [setTopic]);

  useEffect(() => {
    if (!targetId) {
      setTarget(null);
      return;
    }
    let active = true;
    fetchTarget(targetId)
      .then((res) => {
        if (active) setTarget(res.target);
      })
      .catch(() => {
        if (active) setTarget(null);
      });
    return () => {
      active = false;
    };
  }, [targetId]);

  // Read the fit result the Lab bridges back (localStorage), refreshing when
  // the user returns from the Lab so Step 5 unlocks and fills in.
  const [fit, setFit] = useState<SavedTransitFit | null>(null);
  useEffect(() => {
    const read = () => setFit(loadTransitFit(targetId));
    read();
    window.addEventListener(TRANSIT_FIT_SAVED_EVENT, read);
    window.addEventListener('focus', read);
    return () => {
      window.removeEventListener(TRANSIT_FIT_SAVED_EVENT, read);
      window.removeEventListener('focus', read);
    };
  }, [targetId]);

  const analysisHref = useMemo(() => buildTargetHref(targetId, ANALYSIS_CONTEXT), [targetId]);

  const contextSlot = target ? (
    <div className="inquiry-target-context">
      <div>
        <span className="inquiry-target-context-kicker">{lang === 'ko' ? '선택한 탐구 대상' : 'Selected target'}</span>
        <strong>{target.name}</strong>
        <span className="inquiry-target-context-meta">
          {formatConstellation(target.constellation, lang)}
          {target.period_days ? ` · P = ${target.period_days} d` : ''}
        </span>
      </div>
    </div>
  ) : null;

  const introSlot = (
    <Suspense fallback={null}>
      <Transit3DScene />
    </Suspense>
  );

  const selectionSlot = (
    <div className="inquiry-sky-embed">
      <p className="inquiry-sky-embed-hint">
        {target
          ? lang === 'ko'
            ? `현재 선택: ${target.name} — 다른 별을 클릭하면 대상을 바꿉니다.`
            : `Selected: ${target.name} — click another star to change the target.`
          : lang === 'ko'
            ? '전천 지도에서 별을 클릭해 탐구 대상을 선택하세요.'
            : 'Click a star on the sky map to choose your target.'}
      </p>
      <SkyExplorer embedded onSelectTarget={handleSelectTarget} />
    </div>
  );

  const analysisSlot = target ? (
    <div className="inquiry-lab-handoff">
      <p>
        {lang === 'ko'
          ? `${target.name}의 차등측광과 식현상 모델 적합은 정밀 분석(Lab)에서 실행합니다.`
          : `Run differential photometry and transit fitting for ${target.name} in the Lab.`}
      </p>
      <button type="button" className="btn-primary" onClick={() => navigate(analysisHref)}>
        {lang === 'ko' ? '관측 자료 선택하고 분석 →' : 'Pick observations & analyze →'}
      </button>
    </div>
  ) : (
    <div className="inquiry-lab-handoff">
      <p>{lang === 'ko' ? '먼저 Step 1에서 대상을 선택하세요.' : 'Select a target in Step 1 first.'}</p>
    </div>
  );

  const metadataSlot = target ? (
    <SkyDataPanel
      targetName={target.name}
      ra={target.ra}
      dec={target.dec}
      pixelScaleArcsec={21}
      chips={[
        {
          label: { ko: '탐구 대상', en: 'Target' },
          value: target.name,
        },
        {
          label: { ko: '문헌 공전 주기', en: 'Catalog period' },
          value: target.period_days ? `${target.period_days} d` : '—',
        },
        { label: { ko: '픽셀 스케일', en: 'Pixel scale' }, value: '21″/px' },
      ]}
    />
  ) : (
    <div className="inquiry-lab-handoff">
      <p>{lang === 'ko' ? '먼저 Step 1에서 대상을 선택하세요.' : 'Select a target in Step 1 first.'}</p>
    </div>
  );

  const archiveRpRs =
    target?.transit_depth_pct != null && target.transit_depth_pct > 0
      ? Math.sqrt(target.transit_depth_pct / 100)
      : null;

  const comparisonSlot = fit ? (
    <TransitComparison fit={fit} target={target} />
  ) : (
    <div className="inquiry-lab-handoff">
      <p>
        {lang === 'ko'
          ? '아직 정밀 분석 결과가 없습니다. Step 4에서 Lab 분석(차등측광·transit fit)을 완료하면 측정값이 여기서 NASA 아카이브값과 자동 비교됩니다.'
          : 'No analysis result yet. Finish the Lab analysis in Step 4; your measured value will then be compared with the NASA archive here.'}
      </p>
      <button type="button" className="btn-primary" onClick={() => navigate(analysisHref)}>
        {lang === 'ko' ? '관측 자료 선택하고 분석 →' : 'Pick observations & analyze →'}
      </button>
    </div>
  );

  const resultSummarySlot = fit ? (
    <TransitResultSummary fit={fit} targetName={target?.name} />
  ) : undefined;

  const recordSave = fit
    ? {
        workflow: 'transit_lab',
        templateId: 'transit_record',
        targetId,
        title: target?.name ?? targetId,
        context: {
          source: 'exoplanet-block',
          transit_fit: {
            rp_rs: fit.rpRs,
            rp_rs_err: fit.rpRsErr,
            period: fit.period,
            reduced_chi_squared: fit.reducedChiSquared,
            depth_pct: fit.rpRs * fit.rpRs * 100,
          },
          reference_comparison: {
            reference_rp_rs_from_depth: archiveRpRs,
            reference_depth_pct: target?.transit_depth_pct ?? null,
            reference_period_days: target?.period_days ?? null,
          },
          target_context: {
            name: target?.name ?? null,
            constellation: target?.constellation ?? null,
            period_days: target?.period_days ?? null,
          },
        },
      }
    : undefined;

  return (
    <InquiryLayout
      module={module}
      adapter={moduleAdapters[module.id]}
      contextSlot={contextSlot}
      introSlot={introSlot}
      selectionSlot={selectionSlot}
      metadataSlot={metadataSlot}
      analysisSlot={analysisSlot}
      comparisonSlot={comparisonSlot}
      resultSummarySlot={resultSummarySlot}
      maxUnlockedStepIndex={fit ? undefined : 4}
      recordSave={recordSave}
    />
  );
}
