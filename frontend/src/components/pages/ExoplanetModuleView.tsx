import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchTarget, fetchObservations } from '../../api/client';
import type { Observation, Target } from '../../types/target';
import { useLangStore } from '../../i18n';
import { useAppStore } from '../../stores/useAppStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useWorkflowDraftRoute } from '../../hooks/useWorkflowDraftRoute';
import { moduleAdapters } from '../../explorationBlocks/adapters';
import type { ExplorationModuleConfig } from '../../explorationBlocks/types';
import { formatConstellation } from '../../utils/targetFormat';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { ApertureSandbox, InquiryLayout, SkyDataPanel } from '../inquiry';
import { TransitComparison } from '../inquiry/TransitComparison';
import { TransitStep6Rail } from '../inquiry/TransitStep6Rail';
import { TransitPipelineDiagram } from '../inquiry/TransitPipelineDiagram';
import { SkyExplorer } from '../sky/SkyExplorer';
import { TransitLab } from '../lab/TransitLab';
import {
  clearTransitFit,
  loadTransitFit,
  TRANSIT_FIT_SAVED_EVENT,
  type SavedTransitFit,
} from '../../workflows/transit/fitBridge';

const Transit3DScene = lazyWithRetry('Transit3DScene', () => import('../sky/Transit3DScene'));

// The only fully bundled analysis target (TESS sector 2, 50px cutout baked into
// the image) — clicking it loads instantly with no MAST download, ideal for the
// teacher-training demo.
const RECOMMENDED_TARGET_ID = 'wasp_6_b';

interface ExoplanetModuleViewProps {
  module: ExplorationModuleConfig;
}

export function ExoplanetModuleView({ module }: ExoplanetModuleViewProps) {
  const lang = useLangStore((state) => state.lang);
  const [searchParams, setSearchParams] = useSearchParams();
  const targetId = searchParams.get('target') ?? '';
  const setTopic = useAppStore((s) => s.setTopic);
  const user = useAuthStore((s) => s.user);

  // Bumped on every pick so the map re-aims even when the target id is
  // unchanged — a learner who panned away and presses the recommended button
  // again expects the sky to come back.
  const [focusNonce, setFocusNonce] = useState(0);

  const selectTargetById = (id: string) => {
    setFocusNonce((n) => n + 1);
    if (id === targetId) return; // same target: re-aim the map, no history entry
    const next = new URLSearchParams(searchParams);
    next.set('target', id);
    setSearchParams(next, { replace: false });
  };

  const handleSelectTarget = (selected: Target) => {
    selectTargetById(selected.id);
  };

  const [target, setTarget] = useState<Target | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);

  // Drive the embedded sky map (Step 1) to show exoplanet-transit targets.
  useEffect(() => {
    setTopic('exoplanet_transit');
  }, [setTopic]);

  // Two separate fetches, deliberately NOT Promise.all: the target row answers
  // fast, while the sector list goes through MAST and can take seconds on a
  // cold instance. Coupled, everything that only needs the target — the
  // "이 대상으로 확인" button, the context header, the map slew — sat blocked
  // behind the slow call (production report 2026-07-17).
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

  useEffect(() => {
    if (!targetId) {
      setObservations([]);
      return;
    }
    let active = true;
    fetchObservations(targetId)
      .then((obs) => {
        if (active) setObservations(obs);
      })
      .catch(() => {
        if (active) setObservations([]);
      });
    return () => {
      active = false;
    };
  }, [targetId]);

  // Backend draft plumbing for logged-in learners — same wiring the /lab route
  // uses, so resuming a draft from /my lands back here with state intact.
  const {
    draftId,
    seedRecordId,
    draftRestoreReady,
  } = useWorkflowDraftRoute({
    workflowId: 'transit_lab',
    subjectId: targetId || null,
    enableDrafts: Boolean(targetId),
    userPresent: Boolean(user),
  });

  // Read the fit result the Lab bridges back (sessionStorage), refreshing when
  // the user returns from the Lab so Step 5 unlocks and fills in.
  //
  // Seeded synchronously, NOT from the mount effect: `maxUnlockedStepIndex`
  // below is `fit ? undefined : 4`, and InquiryLayout's clamp effect is a CHILD
  // effect — it runs before this parent's effect. Starting at null meant the
  // first pass saw "Step 5 is locked" and demoted a learner who owns a valid fit
  // back to Step 4, rewriting the URL with replace(). Reloading or bookmarking
  // Step 5/6 threw you out of your own results (found by the QA sweep, which
  // kept capturing Step 4 three times over).
  const [fit, setFit] = useState<SavedTransitFit | null>(() => loadTransitFit(targetId));
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

  const conceptFlowSlot = <TransitPipelineDiagram />;

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
          <strong>
            WASP-6 b
            {targetId === RECOMMENDED_TARGET_ID && (
              <span className="inquiry-recommended-selected">
                {lang === 'ko' ? '✓ 선택됨' : '✓ Selected'}
              </span>
            )}
          </strong>
          <span>
            {targetId === RECOMMENDED_TARGET_ID
              ? lang === 'ko'
                ? '다시 누르면 지도가 이 대상으로 되돌아갑니다'
                : 'Press again to re-aim the map at this target'
              : lang === 'ko'
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
      <SkyExplorer
        embedded
        onSelectTarget={handleSelectTarget}
        focusTargetId={targetId || null}
        focusTargetHint={target}
        focusNonce={focusNonce}
      />
    </div>
  );

  // The Lab runs INSIDE Step 4 — no page hop. The old flow navigated to
  // /lab/:id, which flashed a full-page loading screen and put the learner in a
  // second copy of the block whose Step 1 was a stand-in card instead of the
  // real sky map. Same embed pattern as the KMTNet block's inline analysis.
  const analysisSlot = target ? (
    !draftRestoreReady ? (
      <div className="inquiry-lab-handoff">
        <p>{lang === 'ko' ? '초안 복원 중...' : 'Restoring draft...'}</p>
      </div>
    ) : observations.length > 0 ? (
      <TransitLab
        target={target}
        observations={observations}
        draftId={draftId}
        seedRecordId={seedRecordId}
        learningMode="guided"
      />
    ) : (
      <div className="inquiry-lab-handoff">
        <p>{lang === 'ko' ? '관측 목록을 불러오는 중...' : 'Loading observations...'}</p>
      </div>
    )
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
            ? ''
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
          ? '아직 분석 결과가 없습니다. Step 4에서 차등측광과 식현상 모델 적합까지 마치면 측정값이 여기서 NASA 아카이브값과 자동 비교됩니다.'
          : 'No analysis result yet. Finish the photometry and transit fit in Step 4; your measured value will then be compared with the NASA archive here.'}
      </p>
    </div>
  );

  // Step 6 puts the result in the side rail instead of a card above the
  // questions: the questions ask about the numbers, so the numbers stay in view
  // while they are answered rather than scrolling away.
  const sideRailSlot = fit ? (
    <TransitStep6Rail
      fit={fit}
      target={target}
      moduleHref={`/modules/exoplanet-transit?target=${encodeURIComponent(targetId)}`}
    />
  ) : undefined;

  // Anonymous (no-login) submission stays visible even before a fit exists —
  // the panel itself explains why the button is disabled.
  const anonSubmit = targetId ? { targetId, fit } : undefined;

  return (
    <InquiryLayout
      module={module}
      adapter={moduleAdapters[module.id]}
      contextSlot={contextSlot}
      introSlot={introSlot}
      conceptFlowSlot={conceptFlowSlot}
      selectionSlot={selectionSlot}
      selectionConfirm={{
        // Gate on the SELECTED id (in the URL), not the loaded target object.
        // The object arrives from an async fetch, so gating on it made a resume
        // that lands on Step 4 (?target=…&blockStep=step4) read as "no target"
        // for the first frames — the selection clamp then bounced the learner to
        // Step 1, which remounted the sky map (reported 2026-07-18: "초안 계속하기
        // 눌렀는데 갑자기 step1로 오더니 전천 깨짐"). A target id in the URL already
        // means one is selected; the object only fills the context header.
        ready: Boolean(targetId),
        label: { ko: '이 대상으로 확인', en: 'Confirm this target' },
        hint: { ko: '먼저 지도에서 대상을 선택하세요.', en: 'Select a target on the map first.' },
      }}
      metadataSlot={metadataSlot}
      conditionsSlot={<ApertureSandbox />}
      analysisSlot={analysisSlot}
      comparisonSlot={comparisonSlot}
      sideRailSlot={sideRailSlot}
      maxUnlockedStepIndex={fit ? undefined : 4}
      anonSubmit={anonSubmit}
      draftTargetId={targetId}
    />
  );
}
