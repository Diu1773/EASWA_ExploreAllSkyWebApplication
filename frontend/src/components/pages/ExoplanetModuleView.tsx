import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchTarget } from '../../api/client';
import type { Target } from '../../types/target';
import { useLangStore } from '../../i18n';
import { useAppStore } from '../../stores/useAppStore';
import { moduleAdapters } from '../../explorationBlocks/adapters';
import type { ExplorationModuleConfig } from '../../explorationBlocks/types';
import { buildLabHref, type ExplorerRouteContext } from '../../utils/explorerNavigation';
import { formatConstellation } from '../../utils/targetFormat';
import { ApertureSandbox, InquiryLayout, SkyDataPanel } from '../inquiry';
import { TransitComparison } from '../inquiry/TransitComparison';
import { TransitResultSummary } from '../inquiry/TransitResultSummary';
import { SkyExplorer } from '../sky/SkyExplorer';
import {
  clearTransitFit,
  loadTransitFit,
  TRANSIT_FIT_SAVED_EVENT,
  type SavedTransitFit,
} from '../../workflows/transit/fitBridge';

const Transit3DScene = lazy(() => import('../sky/Transit3DScene'));

// The only fully bundled analysis target (TESS sector 2, 50px cutout baked into
// the image) — clicking it loads instantly with no MAST download, ideal for the
// teacher-training demo.
const RECOMMENDED_TARGET_ID = 'wasp_6_b';

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

  const selectTargetById = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('target', id);
    setSearchParams(next, { replace: false });
  };

  const handleSelectTarget = (selected: Target) => {
    selectTargetById(selected.id);
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

  // Straight into the Lab. The old route went through the target-detail page
  // (/target/:id) only so the learner could tick sectors there — a legacy stop
  // whose "Back to Explorer" link then dropped them onto the standalone sky
  // page, outside the block. The Lab now defaults to every sector of the
  // target, so the detail page adds nothing to the guided flow.
  const analysisHref = useMemo(
    () => buildLabHref(targetId, ANALYSIS_CONTEXT, [['workflow', 'transit']]),
    [targetId],
  );

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
      <div className="inquiry-recommended-target">
        <span className="inquiry-recommended-kicker">
          {lang === 'ko' ? '추천 대상 · 즉시 로드' : 'Recommended · instant'}
        </span>
        <button
          type="button"
          className={`inquiry-recommended-pick${targetId === RECOMMENDED_TARGET_ID ? ' is-active' : ''}`}
          onClick={() => selectTargetById(RECOMMENDED_TARGET_ID)}
        >
          <strong>WASP-6 b</strong>
          <span>
            {lang === 'ko'
              ? '번들된 TESS sector 2 — 다운로드 없이 바로 분석'
              : 'Bundled TESS sector 2 — analyze instantly, no download'}
          </span>
        </button>
      </div>
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
        {lang === 'ko' ? '관측자료 분석 →' : 'Analyze observations →'}
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

  const comparisonSlot = fit ? (
    <div className="inquiry-comparison-wrap">
      <div className="inquiry-comparison-toolbar">
        <span className="inquiry-comparison-toolbar-note">
          {lang === 'ko'
            ? '이 값은 Lab에서 저장한 적합 결과입니다.'
            : 'This value is the fit result saved from the Lab.'}
        </span>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => {
            clearTransitFit(targetId);
            setFit(null);
          }}
        >
          {lang === 'ko' ? '이전 결과 지우기' : 'Clear saved result'}
        </button>
      </div>
      <TransitComparison fit={fit} target={target} />
    </div>
  ) : (
    <div className="inquiry-lab-handoff">
      <p>
        {lang === 'ko'
          ? '아직 정밀 분석 결과가 없습니다. Step 4에서 Lab 분석(차등측광·transit fit)을 완료하면 측정값이 여기서 NASA 아카이브값과 자동 비교됩니다.'
          : 'No analysis result yet. Finish the Lab analysis in Step 4; your measured value will then be compared with the NASA archive here.'}
      </p>
      <button type="button" className="btn-primary" onClick={() => navigate(analysisHref)}>
        {lang === 'ko' ? '관측자료 분석 →' : 'Analyze observations →'}
      </button>
    </div>
  );

  const resultSummarySlot = fit ? (
    <TransitResultSummary fit={fit} targetName={target?.name} />
  ) : undefined;

  // No login-gated "내 기록에 저장" panel: notes autosave to this browser as they
  // are typed, and the one deliberate action at the end is the anonymous
  // submission. A second save button — which also demanded required fields
  // before it would light up — was friction on top of an already-saved record.

  // Anonymous (no-login) submission stays visible even before a fit exists —
  // the panel itself explains why the button is disabled.
  const anonSubmit = targetId ? { targetId, fit } : undefined;

  return (
    <InquiryLayout
      module={module}
      adapter={moduleAdapters[module.id]}
      contextSlot={contextSlot}
      introSlot={introSlot}
      selectionSlot={selectionSlot}
      selectionConfirm={{
        ready: Boolean(target),
        label: { ko: '이 대상으로 확인 →', en: 'Confirm this target →' },
        hint: { ko: '먼저 지도에서 대상을 선택하세요.', en: 'Select a target on the map first.' },
      }}
      metadataSlot={metadataSlot}
      conditionsSlot={<ApertureSandbox />}
      analysisSlot={analysisSlot}
      comparisonSlot={comparisonSlot}
      resultSummarySlot={resultSummarySlot}
      maxUnlockedStepIndex={fit ? undefined : 4}
      anonSubmit={anonSubmit}
      draftTargetId={targetId}
    />
  );
}
