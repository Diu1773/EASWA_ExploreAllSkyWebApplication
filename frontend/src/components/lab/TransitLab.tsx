import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  downloadMyRecordPhotometryCsv,
  fetchMyRecordSubmission,
  fetchRecordTemplate,
  submitRecordTemplate,
} from '../../api/client';
import { useAppStore } from '../../stores/useAppStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLangStore } from '../../i18n';
import type { Observation, Target } from '../../types/target';
import type {
  ApertureParams,
  PixelCoordinate,
  StarOverlay,
  TransitApertureConfig,
  TransitComparisonDiagnostic,
} from '../../types/transit';
import type { RecordQuestion, RecordQuestionOption, RecordTemplate } from '../../types/record';
import { defaultTransitRecordTemplate } from '../../data/transitRecordTemplate';
import { useWorkflowController } from '../../hooks/useWorkflowController';
import type { WorkflowSessionSource } from '../../utils/workflowSession';
import type { LearningMode } from '../../utils/explorerNavigation';
import { loadLabDraft, saveLabDraft } from '../../utils/inquiryDraft';
import {
  createTransitWorkflowDefinition,
  type PersistedTransitLabState,
  type TransitFitDataSource,
  type TransitFitDisplayXAxis,
  type TransitFitDisplayYAxis,
  type TransitStepAvailability,
  type TransitWorkflowStep,
} from '../../workflows/transit/definition';
import {
  reduceTransitInvalidation,
  type TransitInvalidationAction,
} from '../../workflows/transit/invalidation';
import {
  buildBjdLightCurve,
  buildFitOverlayCurve,
  buildFitResidualCurve,
  buildLightCurveFromFitResult,
  buildPhaseFoldedLightCurve,
  computeDefaultBjdWindow,
  estimatePhaseFoldReferenceT0,
  transformLightCurveForDisplay,
} from '../../workflows/transit/lightCurve';
import {
  computeTransitValidationStats,
  type TransitValidationStats,
} from '../../workflows/transit/validationStats';
import { useTransitPreview } from '../../workflows/transit/hooks/useTransitPreview';
import { useTransitPhotometry } from '../../workflows/transit/hooks/useTransitPhotometry';
import { useTransitFit } from '../../workflows/transit/hooks/useTransitFit';
import {
  createInitialTransitLabState,
  transitLabReducer,
  type ComparisonStar,
  type StarKey,
  type TransitLabDefaults,
  type TransitLabState,
} from '../../workflows/transit/state';
import { TransitCutoutViewer } from './TransitCutoutViewer';
import { LightCurvePlot } from './LightCurvePlot';

interface TransitLabProps {
  target: Target;
  observations: Observation[];
  draftId?: string | null;
  seedRecordId?: number | null;
  learningMode?: LearningMode;
}

type TransitStep = TransitWorkflowStep;
type StepState = 'locked' | 'accessible' | 'completed';

const STEPS: Array<{ id: TransitStep; label: { ko: string; en: string }; number: number }> = [
  { id: 'select', label: { ko: '목표별·비교별 선택', en: 'Select Stars' }, number: 1 },
  { id: 'run', label: { ko: '차등측광 실행', en: 'Run Photometry' }, number: 2 },
  { id: 'comparisonqc', label: { ko: '비교별 품질 점검', en: 'Comparison QC' }, number: 3 },
  { id: 'lightcurve', label: { ko: '광도곡선 확인', en: 'Light Curve' }, number: 4 },
  { id: 'transitfit', label: { ko: '식현상 모델 적합', en: 'Transit Fit' }, number: 5 },
  { id: 'record', label: { ko: '결과 기록', en: 'Record Result' }, number: 6 },
];

function defaultFitDisplayXAxis(
  fitDataSource: TransitFitDataSource
): TransitFitDisplayXAxis {
  return fitDataSource === 'phase_fold' ? 'orbital_phase' : 'btjd';
}

type I18nString = string | { ko: string; en: string };
type GuideQuestion =
  | { type: 'open'; id: string; text: I18nString }
  | { type: 'ox'; id: string; text: I18nString; correct: 'O' | 'X'; explanation: I18nString }
  | { type: 'choice'; id: string; text: I18nString; options: I18nString[]; correct: string; explanation: I18nString };

const STEP_GUIDES: Record<TransitStep, GuideQuestion[]> = {
  select: [
    {
      type: 'ox', id: 'select_q1',
      text: { ko: '비교성은 목표 별보다 밝을수록 좋다.', en: 'A comparison star should be as bright as possible — the brighter the better.' },
      correct: 'X',
      explanation: { ko: '비교성은 목표 별과 비슷한 밝기여야 측정 오차가 최소화됩니다. 너무 밝거나 어두우면 검출기의 선형 범위를 벗어나 오차가 커집니다.', en: 'A comparison star should have similar brightness to the target. Too bright or too faint pushes the detector out of its linear range and increases errors.' },
    },
    {
      type: 'choice', id: 'select_q2',
      text: { ko: '좋은 비교성의 조건으로 가장 중요한 것은?', en: 'What is the most important criterion for a good comparison star?' },
      options: [
        { ko: '목표 별과 비슷한 밝기', en: 'Similar brightness to the target star' },
        { ko: '목표 별에서 최대한 멀리', en: 'As far from the target as possible' },
        { ko: '색깔이 붉은 별', en: 'A red-colored star' },
        { ko: '가장 밝은 별', en: 'The brightest star available' },
      ],
      correct: '목표 별과 비슷한 밝기',
      explanation: { ko: '밝기가 비슷한 별을 비교성으로 쓰면 대기·기기 효과가 동일하게 적용되어 차등 측광이 정확해집니다.', en: 'Using a star of similar brightness ensures atmospheric and instrumental effects apply equally to both stars, making differential photometry accurate.' },
    },
    { type: 'open', id: 'select_q3', text: { ko: '관측 이미지에서 목표 별과 비교성을 어떻게 구별할 수 있을까?', en: 'How can you distinguish the target star from comparison stars in the observation image?' } },
  ],
  run: [
    {
      type: 'ox', id: 'run_q1',
      text: { ko: '비교성이 많을수록 광도 측정의 정밀도가 항상 높아진다.', en: 'The more comparison stars used, the higher the photometric precision will always be.' },
      correct: 'X',
      explanation: { ko: '품질이 낮은 비교성(변광성, RMS 높음)을 포함하면 오히려 정밀도가 떨어집니다. 좋은 비교성을 선별하는 것이 핵심입니다.', en: 'Including poor-quality comparison stars (variables, high RMS) actually reduces precision. Selecting good comparison stars is the key.' },
    },
    {
      type: 'choice', id: 'run_q2',
      text: { ko: '앙상블 측광(ensemble photometry)이 단일 비교성 방식보다 유리한 이유는?', en: 'Why is ensemble photometry advantageous over using a single comparison star?' },
      options: [
        { ko: '계산이 빠르다', en: 'Computation is faster' },
        { ko: '개별 비교성의 오차가 평균화된다', en: 'Individual comparison star errors are averaged out' },
        { ko: '더 많은 별을 탐색할 수 있다', en: 'More stars can be searched' },
        { ko: '대기 효과를 완전히 제거한다', en: 'Atmospheric effects are completely eliminated' },
      ],
      correct: '개별 비교성의 오차가 평균화된다',
      explanation: { ko: '여러 비교성의 평균을 사용하면 특정 별의 우발적 변화가 희석되어 기준 플럭스가 안정됩니다.', en: 'Using the average of multiple comparison stars dilutes accidental variations of any single star, stabilizing the reference flux.' },
    },
    { type: 'open', id: 'run_q3', text: { ko: '구경(aperture) 크기가 측정값에 어떤 영향을 미칠까?', en: 'How does aperture size affect the measured values?' } },
  ],
  comparisonqc: [
    {
      type: 'ox', id: 'qc_q1',
      text: { ko: '변광성(variable star)은 비교성으로 사용할 수 있다.', en: 'A variable star can be used as a comparison star.' },
      correct: 'X',
      explanation: { ko: '변광성은 자체적으로 밝기가 바뀌므로 기준으로 쓰면 목표 별의 변화와 구별할 수 없어 비교성으로 부적합합니다.', en: 'Variable stars change brightness on their own. Using one as a reference makes it impossible to distinguish its variation from the target\'s signal.' },
    },
    {
      type: 'choice', id: 'qc_q2',
      text: { ko: '비교성 품질 지표(RMS)가 높다는 것은 무엇을 의미하는가?', en: 'What does a high RMS quality metric for a comparison star indicate?' },
      options: [
        { ko: '측정이 정밀하다', en: 'Measurements are precise' },
        { ko: '밝기 변화가 불규칙하다', en: 'Brightness variations are irregular' },
        { ko: '목표 별에 가깝다', en: 'It is close to the target star' },
        { ko: '대기가 안정적이다', en: 'The atmosphere is stable' },
      ],
      correct: '밝기 변화가 불규칙하다',
      explanation: { ko: 'RMS(산포도)가 높다는 것은 해당 비교성의 밝기 측정값이 일정하지 않다는 뜻으로, 신뢰할 수 없는 기준임을 의미합니다.', en: 'High RMS means the comparison star\'s brightness measurements are inconsistent — it is an unreliable reference.' },
    },
    { type: 'open', id: 'qc_q3', text: { ko: '제외한 비교성이 있다면, 제외 이유를 설명해보자.', en: 'If you excluded any comparison stars, explain your reasoning.' } },
  ],
  lightcurve: [
    {
      type: 'ox', id: 'lc_q1',
      text: { ko: '외계행성 식현상 중에는 별의 밝기가 감소한다.', en: 'During an exoplanet transit, the star\'s observed brightness decreases.' },
      correct: 'O',
      explanation: { ko: '행성이 별 앞을 지나가면 별빛 일부를 가려 관측되는 밝기가 일시적으로 감소합니다. 이것이 식(transit) 신호입니다.', en: 'When a planet passes in front of the star, it blocks some starlight, temporarily reducing the observed brightness. This is the transit signal.' },
    },
    {
      type: 'choice', id: 'lc_q2',
      text: { ko: '밝기 감소량(dip depth)이 클수록 무엇을 의미하는가?', en: 'What does a larger dip depth (greater brightness decrease) indicate?' },
      options: [
        { ko: '행성의 공전 주기가 길다', en: 'The planet has a longer orbital period' },
        { ko: '행성이 별에 비해 크다', en: 'The planet is larger relative to the star' },
        { ko: '행성의 질량이 크다', en: 'The planet has greater mass' },
        { ko: '식현상 지속 시간이 짧다', en: 'The transit duration is shorter' },
      ],
      correct: '행성이 별에 비해 크다',
      explanation: { ko: '식 깊이는 (Rp/R*)²에 비례합니다. 행성이 별에 비해 클수록 더 많은 빛을 가려 밝기 감소가 커집니다.', en: 'Transit depth is proportional to (Rp/R*)². A larger planet blocks more light, creating a deeper dip in the light curve.' },
    },
    { type: 'open', id: 'lc_q3', text: { ko: '광도 곡선에서 식의 시작과 끝 지점을 어떻게 찾았는가?', en: 'How did you identify the start and end points of the transit in the light curve?' } },
  ],
  transitfit: [
    {
      type: 'ox', id: 'fit_q1',
      text: { ko: 'χ²_red 값이 1보다 훨씬 크면 모델이 데이터와 잘 맞는다는 뜻이다.', en: 'A χ²_red value much greater than 1 means the model fits the data well.' },
      correct: 'X',
      explanation: { ko: 'χ²_red ≫ 1이면 모델이 데이터를 잘 설명하지 못하거나 오차를 과소평가한 것입니다. 좋은 적합도는 χ²_red ≈ 1입니다.', en: 'χ²_red >> 1 means the model poorly explains the data or errors are underestimated. A good fit has χ²_red ≈ 1.' },
    },
    {
      type: 'choice', id: 'fit_q2',
      text: { ko: 'Rp/R* = 0.1이 의미하는 것은?', en: 'What does Rp/R* = 0.1 mean?' },
      options: [
        { ko: '행성 반지름이 별 반지름의 10%', en: 'Planet radius is 10% of the star\'s radius' },
        { ko: '행성이 별보다 10배 크다', en: 'The planet is 10 times larger than the star' },
        { ko: '식 깊이가 10%', en: 'Transit depth is 10%' },
        { ko: '공전 주기가 0.1일', en: 'Orbital period is 0.1 days' },
      ],
      correct: '행성 반지름이 별 반지름의 10%',
      explanation: { ko: 'Rp/R*는 행성 반지름과 별 반지름의 비율입니다. 0.1이면 행성이 별의 10% 크기이고, 식 깊이는 0.1² = 1%가 됩니다.', en: 'Rp/R* is the ratio of planet radius to star radius. At 0.1, the planet is 10% the size of the star, and transit depth is 0.1² = 1%.' },
    },
    { type: 'open', id: 'fit_q3', text: { ko: '적합 결과가 기대값과 다르다면 그 원인이 무엇일지 생각해보자.', en: 'If the fit result differs from the expected value, think about what might be causing the discrepancy.' } },
  ],
  record: [
    {
      type: 'ox', id: 'rec_q1',
      text: { ko: '측정한 Rp/R* 값이 출판된 논문값과 완전히 일치할 것이다.', en: 'The measured Rp/R* value will perfectly match the published literature value.' },
      correct: 'X',
      explanation: { ko: 'TESS 데이터 노이즈, 비교성 선택, 구경 설정 등 여러 요인으로 측정값에는 항상 불확실성이 있습니다. 오차 범위 내에 있으면 좋은 결과입니다.', en: 'TESS data noise, comparison star selection, and aperture settings all introduce uncertainty. Being within the error range is a good result.' },
    },
    {
      type: 'choice', id: 'rec_q2',
      text: { ko: '이번 분석에서 측정 오차의 주요 원인은 무엇이라고 생각하는가?', en: 'What do you think is the main source of measurement error in this analysis?' },
      options: [
        { ko: '비교성 수 부족', en: 'Too few comparison stars' },
        { ko: '대기 불안정', en: 'Atmospheric instability' },
        { ko: '구경 크기 설정', en: 'Aperture size setting' },
        { ko: '데이터 품질(TESS 노이즈)', en: 'Data quality (TESS noise)' },
      ],
      correct: '데이터 품질(TESS 노이즈)',
      explanation: { ko: '지상 관측과 달리 TESS는 우주 망원경이라 대기 영향은 없지만, TESS 자체의 픽셀 크기(21"/px)로 인한 오염(contamination)이 주요 오차 원인입니다.', en: 'Unlike ground-based observations, TESS avoids atmospheric effects as a space telescope. However, its large pixel scale (21\"/px) causes flux contamination, which is the main error source.' },
    },
    { type: 'open', id: 'rec_q3', text: { ko: '이번 탐구에서 가장 흥미로웠던 점이나 추가로 알고 싶은 것을 적어보자.', en: 'Write down the most interesting aspect of this investigation, or what you would like to explore further.' } },
  ],
};

type GuideAnswers = Record<string, string>;

function describeLimbDarkeningSource(source: string | null | undefined): string {
  if (!source) return 'automatic filter-based coefficients';
  if (source === 'meidem_claret2017_quadratic') {
    return 'Claret 2017 TESS coefficient grid';
  }
  if (source === 'meidem_claret2011_quadratic') {
    return 'Claret 2011 coefficient grid';
  }
  if (source === 'stellar_filter_heuristic') {
    return 'filter + host-star heuristic';
  }
  if (source === 'filter_default') {
    return 'filter default coefficients';
  }
  return source.replace(/_/g, ' ');
}

function formatNullableNumber(
  value: number | null | undefined,
  digits = 3,
  suffix = ''
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return `${value.toFixed(digits)}${suffix}`;
}

function formatFluxPpm(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return `${(value * 1_000_000).toFixed(0)} ppm`;
}

function formatPercentValue(value: number | null | undefined, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return `${(value * 100).toFixed(digits)}%`;
}

function TransitValidationStatsPanel({ stats }: { stats: TransitValidationStats }) {
  const lang = useLangStore((s) => s.lang);
  const depthDiff = stats.referenceComparison.depthDifferencePctPoints;
  const periodDiffSeconds = stats.referenceComparison.periodDifferenceSeconds;
  const methodText =
    `N=${stats.sample.dataPoints}, retained=${stats.sample.retainedPoints}, ` +
    `clipped=${stats.sample.clippedPoints}, reduced chi-squared=` +
    `${formatNullableNumber(stats.fit.reducedChiSquared, 3)}, residual RMS=` +
    `${formatFluxPpm(stats.residuals.rms)}.`;

  return (
    <div className="transit-validation-panel">
      <div className="transit-reference-head">
        <div>
          <span className="record-section-kicker">
            {lang === 'ko' ? '검증 통계' : 'Validation statistics'}
          </span>
          <h4>{lang === 'ko' ? '논문/보고서용 진단값' : 'Paper-Ready Diagnostics'}</h4>
        </div>
        <span>{stats.fit.usedBatman ? 'batman model' : 'simplified model'}</span>
      </div>
      <div className="transit-validation-grid">
        <div className="transit-summary-card">
          <span className="transit-summary-label">Fitted N</span>
          <strong>{stats.sample.dataPoints.toLocaleString()}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">Clipped</span>
          <strong>{formatPercentValue(stats.sample.clippedFraction)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">Residual RMS</span>
          <strong>{formatFluxPpm(stats.residuals.rms)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">Residual MAD</span>
          <strong>{formatFluxPpm(stats.residuals.mad)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">Norm. RMS</span>
          <strong>{formatNullableNumber(stats.residuals.normalizedRms, 2)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">chi2 red</span>
          <strong>{formatNullableNumber(stats.fit.reducedChiSquared, 3)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">Depth diff.</span>
          <strong>
            {typeof depthDiff === 'number' && Number.isFinite(depthDiff)
              ? `${depthDiff >= 0 ? '+' : ''}${depthDiff.toFixed(3)}%p`
              : 'n/a'}
          </strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">Period diff.</span>
          <strong>
            {typeof periodDiffSeconds === 'number' && Number.isFinite(periodDiffSeconds)
              ? `${periodDiffSeconds >= 0 ? '+' : ''}${periodDiffSeconds.toFixed(1)} s`
              : 'n/a'}
          </strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">Comp. RMS med.</span>
          <strong>{formatFluxPpm(stats.comparisonQuality.medianRms)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">Eff. comps</span>
          <strong>
            {formatNullableNumber(stats.comparisonQuality.effectiveComparisonCount, 2)}
          </strong>
        </div>
      </div>
      <div className="transit-validation-method">
        <strong>{lang === 'ko' ? '방법 문장' : 'Method sentence'}</strong>
        <p>{methodText}</p>
      </div>
      {stats.flags.length > 0 ? (
        <div className="transit-validation-flags">
          <strong>{lang === 'ko' ? '해석 주의' : 'Interpretation flags'}</strong>
          {stats.flags.map((flag) => (
            <span key={flag}>{flag}</span>
          ))}
        </div>
      ) : (
        <p className="transit-reference-note">
          {lang === 'ko'
            ? '자동 플래그는 없습니다. 그래도 잔차 모양, 비교성 품질, ROI 선택 근거를 함께 확인하세요.'
            : 'No automatic flags. Still inspect residual shape, comparison quality, and ROI justification.'}
        </p>
      )}
    </div>
  );
}

function useCompactTransitLayout() {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 980px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 980px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setCompact(event.matches);
    };

    setCompact(media.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  return compact;
}

function MobileFoldSection({
  compact,
  title,
  defaultOpen = false,
  children,
}: {
  compact: boolean;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  if (!compact) return <>{children}</>;

  return (
    <details className="transit-mobile-fold" open={defaultOpen || undefined}>
      <summary className="transit-mobile-fold-summary">
        <span>{title}</span>
        <span className="transit-mobile-fold-icon" aria-hidden="true" />
      </summary>
      <div className="transit-mobile-fold-body">
        {children}
      </div>
    </details>
  );
}

function StepGuide({
  step,
  initialAnswers,
  onAnswersChange,
  defaultOpen = true,
  storageKeySuffix = 'default',
}: {
  step: TransitStep;
  /** Autosaved answers for this step. This component unmounts on every Lab step
   *  change, so without seeding here the learner's answers disappear the moment
   *  they move on — and never come back on reload. */
  initialAnswers?: GuideAnswers;
  onAnswersChange?: (answers: GuideAnswers) => void;
  defaultOpen?: boolean;
  storageKeySuffix?: string;
}) {
  const lang = useLangStore((s) => s.lang);
  const storageKey = `easwa_guide_open_${step}_${storageKeySuffix}`;
  const [open, setOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === null) return defaultOpen;
      return stored !== 'false';
    } catch {
      return defaultOpen;
    }
  });
  const [answers, setAnswers] = useState<GuideAnswers>(() => initialAnswers ?? {});
  const questions = STEP_GUIDES[step];
  if (!questions?.length) return null;

  /** I18nString → current-lang string */
  const i18n = (s: I18nString): string =>
    typeof s === 'string' ? s : (s[lang] ?? s.ko);

  /** canonical key for choice options — always use ko text */
  const canonicalKey = (opt: I18nString): string =>
    typeof opt === 'string' ? opt : opt.ko;

  const handleAnswer = (id: string, value: string) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onAnswersChange?.(next);
  };

  const toggleLabel = lang === 'ko' ? '🤔 생각해보기' : '🤔 Think About It';
  const placeholderText = lang === 'ko' ? '여기에 생각을 적어보세요...' : 'Write your thoughts here…';
  const correctLabel = lang === 'ko' ? '정답!' : 'Correct!';
  const wrongLabel = lang === 'ko' ? '오답 — 정답:' : 'Incorrect — Answer:';

  return (
    <div className={`transit-guide ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="transit-guide-toggle"
        onClick={() => {
          const next = !open;
          setOpen(next);
          try { localStorage.setItem(storageKey, String(next)); } catch { /* ignore */ }
        }}
      >
        <span>{toggleLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="transit-guide-questions">
          {questions.map((q) => (
            <div key={q.id} className="transit-guide-item">
              <p className="transit-guide-text">{i18n(q.text)}</p>
              {q.type === 'ox' && (() => {
                const answered = answers[q.id];
                const isCorrect = answered === q.correct;
                return (
                  <>
                    <div className="transit-guide-ox">
                      {(['O', 'X'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={`transit-guide-ox-btn ${answered === v ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                          onClick={() => handleAnswer(q.id, answered === v ? '' : v)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    {answered && (
                      <div className={`transit-guide-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                        <strong>{isCorrect ? correctLabel : `${wrongLabel} ${q.correct}`}</strong>
                        <span>{i18n(q.explanation)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              {q.type === 'choice' && (() => {
                const answered = answers[q.id];
                const isCorrect = answered === q.correct;
                return (
                  <>
                    <div className="transit-guide-choices">
                      {q.options.map((opt) => {
                        const key = canonicalKey(opt);
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`transit-guide-choice-btn ${answered === key ? (isCorrect ? 'correct' : 'wrong') : (answered && key === q.correct ? 'reveal' : '')}`}
                            onClick={() => handleAnswer(q.id, answered === key ? '' : key)}
                          >
                            {i18n(opt)}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
                      <div className={`transit-guide-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                        <strong>{isCorrect ? correctLabel : `${wrongLabel} ${q.correct}`}</strong>
                        <span>{i18n(q.explanation)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              {q.type === 'open' && (
                <textarea
                  className="transit-guide-textarea"
                  placeholder={placeholderText}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  rows={3}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DEFAULT_TRANSIT_CUTOUT_SIZE_PX = 50;
// The backend caps the size (EASWA_TRANSIT_MAX_CUTOUT_SIZE_PX) and normalizes any
// larger request down to the nearest allowed size; the preview hook adopts the
// delivered size. So the UI can offer the full range — server is the source of truth.
const CUTOUT_SIZE_OPTIONS = [30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 99] as const;

const DEFAULT_APERTURE: ApertureParams = {
  apertureRadius: 2.5,
  innerAnnulus: 4.0,
  outerAnnulus: 6.0,
};

const MAX_COMPARISON_STARS = 10;

function arePixelPositionsNear(
  left: PixelCoordinate,
  right: PixelCoordinate,
  tolerancePx = 0.75
): boolean {
  return Math.hypot(left.x - right.x, left.y - right.y) <= tolerancePx;
}

function toTransitApertureConfig(
  position: PixelCoordinate,
  aperture: ApertureParams
): TransitApertureConfig {
  return {
    position,
    aperture_radius: aperture.apertureRadius,
    inner_annulus: aperture.innerAnnulus,
    outer_annulus: aperture.outerAnnulus,
  };
}

function buildInitialRecordAnswers(template: RecordTemplate | null): Record<string, unknown> {
  if (!template) return {};
  return template.questions.reduce<Record<string, unknown>>((acc, question) => {
    if (question.type === 'checkbox') {
      acc[question.id] = [];
    } else {
      acc[question.id] = '';
    }
    return acc;
  }, {});
}

interface RecordQuestionLocale {
  label: string;
  placeholder?: string;
  helpText?: string;
  options?: Record<string, string>;
}

const TRANSIT_RECORD_KO: Record<string, RecordQuestionLocale> = {
  summary_title: {
    label: '기록 제목',
    placeholder: '예: WASP-26 b Sector 29 식현상 분석',
  },
  transit_visible: {
    label: '광도곡선에서 식현상으로 보이는 밝기 감소가 확인되는가?',
    options: {
      clear: '예, 뚜렷하게 보인다',
      possible: '식현상일 가능성이 있다',
      unclear: '불분명하거나 잡음이 많다',
      not_seen: '뚜렷한 밝기 감소가 보이지 않는다',
    },
  },
  curve_quality: {
    label: '이 광도곡선은 해석에 어느 정도 활용할 수 있는가?',
    options: {
      high: '품질이 높다',
      medium: '주의사항을 고려하면 활용할 수 있다',
      low: '품질이 낮다',
    },
  },
  confidence_score: {
    label: '해석 확신도 (1~5)',
    helpText: '현재 해석을 얼마나 신뢰하는지 스스로 평가하세요.',
  },
  issues_observed: {
    label: '분석 과정에서 확인한 문제를 선택하세요.',
    options: {
      few_comparisons: '적절한 비교성이 부족함',
      blended_field: '주변 별빛에 오염됨',
      noisy_curve: '광도곡선 잡음이 큼',
      field_too_small: '분석 시야가 너무 좁음',
      none: '뚜렷한 문제 없음',
    },
  },
  analysis_note: {
    label: '분석 결과 해석',
    placeholder: '선택한 자료와 그래프의 특징, 그 결과가 의미하는 바를 근거와 함께 적으세요.',
  },
  reference_comparison: {
    label: '측정값은 NASA Exoplanet Archive 기준값 또는 문헌값과 어떻게 다른가?',
    placeholder:
      'Rp/R*, 식 깊이 또는 공전 주기를 비교하고, 차이가 발생한 원인을 자료와 분석 조건을 근거로 설명하세요.',
    helpText:
      '비교성 품질, 별빛 오염, 구경 크기, 선택한 시간 구간, 잡음, 모델 가정을 고려하세요.',
  },
  next_step: {
    label: '분석을 다시 수행한다면 무엇을 바꾸겠는가?',
    placeholder: '예: 시야 확대, 비교성 변경, 다른 Sector 분석',
  },
};

function localizeRecordQuestion(
  question: RecordQuestion,
  lang: 'ko' | 'en'
): {
  label: string;
  placeholder: string;
  helpText: string | null;
  options: RecordQuestionOption[];
} {
  const locale = lang === 'ko' ? TRANSIT_RECORD_KO[question.id] : undefined;
  return {
    label: locale?.label ?? question.label,
    placeholder: locale?.placeholder ?? question.placeholder ?? '',
    helpText: locale?.helpText ?? question.help_text ?? null,
    options: (question.options ?? []).map((option) => ({
      ...option,
      label: locale?.options?.[option.value] ?? option.label,
    })),
  };
}

function isScoreQuestion(question: RecordTemplate['questions'][number]): boolean {
  return question.type === 'number' && question.min_value === 1 && question.max_value === 5;
}

export function TransitLab({
  target,
  observations,
  draftId = null,
  seedRecordId = null,
  learningMode = 'guided',
}: TransitLabProps) {
  const isCompactTransitLayout = useCompactTransitLayout();
  const lang = useLangStore((s) => s.lang);
  const selectedIds = useAppStore((s) => s.selectedObservationIds);
  const selectAllObservations = useAppStore((s) => s.selectAllObservations);
  const user = useAuthStore((s) => s.user);
  const [observationSelectionHydrated, setObservationSelectionHydrated] = useState(() =>
    useAppStore.persist.hasHydrated()
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [recordTemplate, setRecordTemplate] = useState<RecordTemplate | null>(
    defaultTransitRecordTemplate
  );
  // Fit method: false = fast least-squares (default), true = precise MCMC.
  const [refineMcmc, setRefineMcmc] = useState(false);

  // ── Reducer ──────────────────────────────────────────────────────────
  const stateDefaults = useMemo<TransitLabDefaults>(
    () => ({
      aperture: DEFAULT_APERTURE,
      recordAnswers: buildInitialRecordAnswers(defaultTransitRecordTemplate),
    }),
    [],
  );
  const [state, dispatch] = useReducer(
    transitLabReducer,
    stateDefaults,
    createInitialTransitLabState,
  );
  const patch = useCallback(
    (changes: Partial<TransitLabState>) => dispatch({ type: 'patch', changes }),
    [],
  );
  // Destructure for convenient access throughout the component
  const {
    activeObservationId,
    cutoutSizePx,
    pendingCutoutSizePx,
    selectedFrameIndex,
    targetAperture,
    targetPositionOffset,
    comparisonStars,
    selectedStar,
    result,
    foldEnabled,
    foldPeriod,
    foldT0,
    foldT0Auto,
    fitLimbDarkening,
    fitDataSource,
    fitDisplayXAxis,
    fitDisplayYAxis,
    bjdWindowStart,
    bjdWindowEnd,
    fitWindowPhase,
    fitBaselineOrder,
    fitSigmaClipSigma,
    fitSigmaClipIterations,
    fitResult,
    recordAnswers,
    recordTitle,
    submittedRecord,
    seedRecordSummary,
    preview,
    previewLoading,
    framePreviewLoading,
    previewProgress,
    previewMessage,
    running,
    progress,
    runProgressEvent,
    errorMessage,
    fitting,
    fitProgress,
    fitDebugRequest,
    fitDebugLog,
    showTicMarkers,
    selectedComparisonDiagnostic,
    qcIncludedComparisonLabels,
    recordLoading,
    recordSubmitting,
  } = state;


  // ── Autosave (생각해보기 + 결과 기록) ─────────────────────────────────
  // Anonymous learners have no other durable store: the backend draft API is
  // login-only and Render's free plan wipes the SQLite file on every deploy.
  const [labSavedAt, setLabSavedAt] = useState<number | null>(null);
  const [labDraftTick, setLabDraftTick] = useState(0);
  const labHydratedRef = useRef(false);
  // Only write once the learner actually answers something. Otherwise mounting
  // the Lab would save the empty record-template defaults and claim "자동 저장됨"
  // before anything was typed.
  const labDirtyRef = useRef(false);

  // ── Refs (side-effects only, not in reducer) ─────────────────────────
  const guideAnswersRef = useRef<Record<string, string>>({});
  // Seed during render, not in an effect: StepGuide reads this as its initial
  // answers when it mounts, which happens before effects run — seeding later
  // leaves it stuck on {} and the restored answers never appear.
  const guideSeededRef = useRef(false);
  if (!guideSeededRef.current) {
    guideSeededRef.current = true;
    if (!seedRecordId && !draftId) {
      guideAnswersRef.current = loadLabDraft(target.id)?.guideAnswers ?? {};
    }
  }
  const recordTemplateRequestedRef = useRef(false);
  const loadedRecordIdRef = useRef<number | null>(null);
  const restoringSessionPreviewRef = useRef(false);
  const suppressAnalysisInvalidationRef = useRef(false);
  const analysisConfigSignatureRef = useRef<string | null>(null);
  const observedActiveObservationRef = useRef<string | null | undefined>(undefined);

  // ── Derived values ───────────────────────────────────────────────────
  const selectedObservations = observations.filter((obs) =>
    selectedIds.includes(obs.id)
  );
  const fitEngineLabel = fitResult
    ? `${fitResult.used_batman
        ? lang === 'ko' ? 'batman 식현상 모델' : 'batman transit model'
        : lang === 'ko' ? '단순 식현상 모델' : 'simplified transit model'} · ${
        fitResult.used_mcmc
          ? lang === 'ko' ? 'emcee MCMC 사후분포' : 'emcee MCMC posterior'
          : lang === 'ko' ? '최소제곱 최적화' : 'least-squares optimization'
      }`
    : null;
  const fitLimbDarkeningSource =
    fitResult?.limb_darkening_source ?? fitResult?.preprocessing.limb_darkening_source ?? null;
  const fitLimbDarkeningFilter =
    fitResult?.limb_darkening_filter ?? fitResult?.preprocessing.limb_darkening_filter ?? null;
  const fitLimbDarkeningExplanation = fitResult
    ? fitLimbDarkening
      ? lang === 'ko'
        ? `u₁과 u₂는 ${describeLimbDarkeningSource(fitLimbDarkeningSource)}${
            fitLimbDarkeningFilter ? ` (${fitLimbDarkeningFilter} band)` : ''
          }에서 시작해 적합 과정에서 변하도록 설정했습니다.`
        : `u₁ and u₂ were allowed to vary during the fit, starting from ${describeLimbDarkeningSource(
            fitLimbDarkeningSource,
          )}${fitLimbDarkeningFilter ? ` for the ${fitLimbDarkeningFilter} band` : ''}.`
      : lang === 'ko'
        ? `u₁과 u₂는 ${describeLimbDarkeningSource(fitLimbDarkeningSource)}${
            fitLimbDarkeningFilter ? ` (${fitLimbDarkeningFilter} band)` : ''
          } 및 가능한 경우 주성 파라미터로 자동 설정한 뒤 적합 중에는 고정했습니다.`
        : `u₁ and u₂ were automatically set from ${describeLimbDarkeningSource(
            fitLimbDarkeningSource,
          )}${fitLimbDarkeningFilter ? ` for the ${fitLimbDarkeningFilter} band` : ''}, using the host-star parameters when available, and then held fixed during the fit.`
    : null;
  const referenceTransitDepthPct = target.transit_depth_pct ?? null;
  const referenceRpRs =
    referenceTransitDepthPct !== null && referenceTransitDepthPct >= 0
      ? Math.sqrt(referenceTransitDepthPct / 100)
      : null;
  const measuredRpRs = fitResult?.fitted_params.rp_rs ?? null;
  const measuredTransitDepthPct =
    measuredRpRs !== null ? measuredRpRs ** 2 * 100 : null;
  const rpRsDifference =
    measuredRpRs !== null && referenceRpRs !== null
      ? measuredRpRs - referenceRpRs
      : null;
  const periodDifference =
    fitResult && target.period_days !== null
      ? fitResult.period - target.period_days
      : null;
  const validationStats = useMemo(
    () =>
      fitResult
        ? computeTransitValidationStats({
            fitResult,
            referenceDepthPct: referenceTransitDepthPct,
            referencePeriodDays: target.period_days,
            comparisonDiagnostics: result?.comparison_diagnostics ?? [],
          })
        : null,
    [fitResult, referenceTransitDepthPct, target.period_days, result?.comparison_diagnostics]
  );
  const workflowSessionSource: WorkflowSessionSource =
    draftId && draftId.trim() !== ''
      ? { kind: 'draft', id: draftId }
      : seedRecordId !== null
        ? { kind: 'record-seed', id: seedRecordId }
        : { kind: 'live' };
  const workflowDefinition = createTransitWorkflowDefinition({
    targetId: target.id,
    targetPeriodDays: target.period_days,
    defaultAperture: DEFAULT_APERTURE,
  });
  const persistedTargetPosition =
    targetPositionOffset ?? preview?.target_position ?? result?.target_position ?? null;

  // ── Effects: hydration ───────────────────────────────────────────────
  useEffect(() => {
    if (observationSelectionHydrated) return;
    const unsubscribe = useAppStore.persist.onFinishHydration(() => {
      setObservationSelectionHydrated(true);
    });
    return unsubscribe;
  }, [observationSelectionHydrated]);

  // Auto-select first observation
  useEffect(() => {
    if (!observationSelectionHydrated) return;
    if (selectedObservations.length === 0) {
      patch({ activeObservationId: null });
      return;
    }
    if (activeObservationId && selectedObservations.some((obs) => obs.id === activeObservationId)) {
      return;
    }
    patch({ activeObservationId: selectedObservations[0].id });
  }, [observationSelectionHydrated, selectedObservations, activeObservationId, patch]);

  // ── Workflow snapshot (persisted subset of state) ────────────────────
  const workflowSnapshot: PersistedTransitLabState = {
    selectedObservationIds: selectedIds,
    activeObservationId,
    cutoutSizePx,
    selectedFrameIndex,
    targetAperture,
    targetPositionOffset: persistedTargetPosition,
    comparisonStars,
    selectedStar,
    foldEnabled,
    foldPeriod,
    foldT0,
    foldT0Auto,
    fitLimbDarkening,
    fitDataSource,
    fitDisplayXAxis,
    fitDisplayYAxis,
    bjdWindowStart,
    bjdWindowEnd,
    fitWindowPhase,
    fitBaselineOrder,
    fitSigmaClipSigma,
    fitSigmaClipIterations,
    fitResult,
    result,
    recordAnswers,
    recordTitle,
    submittedRecord,
  };
  const workflowAvailability = workflowDefinition.getAvailability(workflowSnapshot);

  // ── Defaults ref (for reducer actions in callbacks) ──────────────────
  const currentDefaults = useMemo<TransitLabDefaults>(
    () => ({
      aperture: DEFAULT_APERTURE,
      recordAnswers: recordTemplate
        ? buildInitialRecordAnswers(recordTemplate)
        : stateDefaults.recordAnswers,
    }),
    [recordTemplate, stateDefaults.recordAnswers],
  );

  // ── Workflow controller ──────────────────────────────────────────────
  const {
    step,
    setStep,
    replaceStep,
    hydrated: workflowHydrated,
    hasRestoredSnapshot,
    clearPersistedWorkflow,
    draftSaveStatus,
    draftSavedAtLabel,
  } = useWorkflowController<TransitStep, PersistedTransitLabState, TransitStepAvailability>({
    scope: {
      workflowId: workflowDefinition.workflowId,
      subjectId: target.id,
      source: workflowSessionSource,
    },
    version: workflowDefinition.version,
    defaultStep: workflowDefinition.defaultStep,
    currentAvailability: workflowAvailability,
    emptyAvailability: workflowDefinition.getAvailability(null),
    parseStep: workflowDefinition.parseStep,
    clampStep: workflowDefinition.clampStep,
    snapshot: workflowSnapshot,
    restoreSnapshot: workflowDefinition.normalizeSnapshot,
    getSnapshotAvailability: workflowDefinition.getAvailability,
    draft: {
      draftId,
      title: recordTitle.trim() || `${target.name} draft`,
      userPresent: Boolean(user),
      seedRecordId,
      getRestoreReady: (session) =>
        seedRecordId === null ||
        session.hasRestoredSnapshot ||
        loadedRecordIdRef.current === seedRecordId,
      hasMeaningfulSnapshot: workflowDefinition.hasMeaningfulSnapshot,
    },
    applyRestoredSnapshot: (saved, restoredStep) => {
      // Side-effect resets (refs)
      loadedRecordIdRef.current = null;
      analysisConfigSignatureRef.current = null;
      observedActiveObservationRef.current = undefined;

      const resumeFromSelect = restoredStep === 'select';

      if (saved) {
        restoringSessionPreviewRef.current =
          !resumeFromSelect &&
          saved.activeObservationId !== null &&
          saved.cutoutSizePx !== null;
        if (saved.selectedObservationIds.length > 0) {
          selectAllObservations(saved.selectedObservationIds);
        }
      } else {
        restoringSessionPreviewRef.current = false;
      }

      dispatch({
        type: 'restore',
        snapshot: saved,
        resumeFromSelect,
        defaults: currentDefaults,
      });
    },
  });

  // ── Early derived values (needed by hooks below) ────────────────────
  const effectiveTargetPosition: PixelCoordinate | null =
    targetPositionOffset ?? preview?.target_position ?? result?.target_position ?? null;
  const activeObservation =
    selectedObservations.find((obs) => obs.id === activeObservationId) ?? null;
  const comparisonDiagnostics = result?.comparison_diagnostics ?? [];

  // ── Custom hooks ─────────────────────────────────────────────────────
  const { cancelAll: cancelPreviewJobs } = useTransitPreview({
    workflowHydrated,
    step,
    activeObservationId,
    cutoutSizePx,
    selectedFrameIndex,
    targetPositionOffset,
    preview,
    result,
    target,
    restoringSessionPreviewRef,
    replaceStep,
    patch,
  });

  const {
    abortRun,
    handleRunPhotometry,
    handleStop,
    handleToggleQcComparison,
    handleSelectAllQcComparisons,
    handleApplyComparisonQc,
  } = useTransitPhotometry({
    activeObservationId,
    cutoutSizePx,
    effectiveTargetPosition,
    targetAperture,
    comparisonStars,
    comparisonDiagnostics,
    qcIncludedComparisonLabels,
    preview,
    result,
    target,
    activeObservation,
    suppressAnalysisInvalidationRef,
    replaceStep,
    patch,
    dispatch,
  });

  // ── Invalidation dispatcher ──────────────────────────────────────────
  const applyTransitInvalidation = useCallback(
    (action: TransitInvalidationAction) => {
      const resolution = reduceTransitInvalidation(
        { step, hasPhotometryResult: Boolean(result) },
        action,
      );

      // Side effects: cancel in-flight async work
      if (resolution.cancelPreviewJobs) cancelPreviewJobs();
      if (resolution.abortPhotometryRun) abortRun();
      if (resolution.clearPreviewRuntime) {
        restoringSessionPreviewRef.current = false;
      }

      // State transition (atomic)
      dispatch({
        type: 'apply-invalidation',
        resolution,
        defaults: currentDefaults,
      });

      // Step transition (managed by workflow controller)
      if (resolution.nextStep && step !== resolution.nextStep) {
        replaceStep(resolution.nextStep);
      }
    },
    [abortRun, cancelPreviewJobs, currentDefaults, replaceStep, result, step],
  );

  useEffect(() => {
    if (!workflowHydrated) return;
    if (!seedRecordId || !user) return;
    if (loadedRecordIdRef.current === seedRecordId) return;
    if (hasRestoredSnapshot) {
      loadedRecordIdRef.current = seedRecordId;
      return;
    }
    let cancelled = false;

    fetchMyRecordSubmission(seedRecordId)
      .then((record) => {
        if (cancelled || !record || record.target_id !== target.id) return;
        const payload = record.payload as {
          context?: {
            observation_id?: string;
            field_size_px?: number;
            target_position?: PixelCoordinate | null;
            target_aperture?: TransitApertureConfig | null;
            comparison_positions?: PixelCoordinate[];
            comparison_apertures?: TransitApertureConfig[];
            aperture?: ApertureParams;
            fit_controls?: {
              fit_data_source?: TransitFitDataSource;
              display_x_axis?: TransitFitDisplayXAxis;
              display_y_axis?: TransitFitDisplayYAxis;
              bjd_start?: number | null;
              bjd_end?: number | null;
              fit_window_phase?: number;
              baseline_order?: number;
              sigma_clip_sigma?: number;
              sigma_clip_iterations?: number;
              fit_limb_darkening?: boolean;
            };
            transit_fit?: {
              period?: number | null;
              t0?: number | null;
            };
          };
          answers?: Record<string, unknown>;
        };
        const recordObservationIds = Array.isArray(record.observation_ids)
          ? record.observation_ids
          : [];
        const observationIds =
          recordObservationIds.length > 0
            ? recordObservationIds
            : payload.context?.observation_id
              ? [payload.context.observation_id]
              : [];

        if (observationIds.length > 0) {
          selectAllObservations(observationIds);
        }
        restoringSessionPreviewRef.current =
          observationIds.length > 0 &&
          (payload.context?.field_size_px ?? DEFAULT_TRANSIT_CUTOUT_SIZE_PX) !== null;
        patch({
          activeObservationId: observationIds.length > 0 ? observationIds[0] : null,
          cutoutSizePx: payload.context?.field_size_px ?? DEFAULT_TRANSIT_CUTOUT_SIZE_PX,
          pendingCutoutSizePx:
            payload.context?.field_size_px ?? DEFAULT_TRANSIT_CUTOUT_SIZE_PX,
          selectedFrameIndex: null,
          targetPositionOffset: payload.context?.target_position ?? null,
          comparisonStars:
            payload.context?.comparison_apertures?.map((item) => ({
              position: item.position,
              aperture: {
                apertureRadius: item.aperture_radius,
                innerAnnulus: item.inner_annulus,
                outerAnnulus: item.outer_annulus,
              },
            })) ??
            (payload.context?.comparison_positions ?? [])
              .slice(0, MAX_COMPARISON_STARS)
              .map((position) => ({
                position,
                aperture: payload.context?.aperture ?? { ...DEFAULT_APERTURE },
              })),
          fitWindowPhase: payload.context?.fit_controls?.fit_window_phase ?? 0.12,
          fitBaselineOrder: payload.context?.fit_controls?.baseline_order ?? 0,
          fitSigmaClipSigma: payload.context?.fit_controls?.sigma_clip_sigma ?? 0.0,
          fitSigmaClipIterations: payload.context?.fit_controls?.sigma_clip_iterations ?? 0,
          fitLimbDarkening: payload.context?.fit_controls?.fit_limb_darkening ?? false,
          fitDataSource: payload.context?.fit_controls?.fit_data_source ?? 'bjd_window',
          fitDisplayXAxis:
            payload.context?.fit_controls?.display_x_axis ??
            defaultFitDisplayXAxis(
              payload.context?.fit_controls?.fit_data_source ?? 'bjd_window'
            ),
          fitDisplayYAxis:
            payload.context?.fit_controls?.display_y_axis ?? 'normalized_flux',
          foldPeriod:
            typeof payload.context?.transit_fit?.period === 'number' &&
              Number.isFinite(payload.context.transit_fit.period) &&
              payload.context.transit_fit.period > 0
              ? payload.context.transit_fit.period
              : target.period_days ?? null,
          foldT0:
            typeof payload.context?.transit_fit?.t0 === 'number' &&
              Number.isFinite(payload.context.transit_fit.t0)
              ? payload.context.transit_fit.t0
              : 0,
          foldT0Auto:
            !(
              typeof payload.context?.transit_fit?.t0 === 'number' &&
              Number.isFinite(payload.context.transit_fit.t0)
            ),
          bjdWindowStart: payload.context?.fit_controls?.bjd_start ?? null,
          bjdWindowEnd: payload.context?.fit_controls?.bjd_end ?? null,
          targetAperture: payload.context?.target_aperture
            ? {
                apertureRadius: payload.context.target_aperture.aperture_radius,
                innerAnnulus: payload.context.target_aperture.inner_annulus,
                outerAnnulus: payload.context.target_aperture.outer_annulus,
              }
            : payload.context?.aperture ?? { ...DEFAULT_APERTURE },
          selectedStar: 'T',
          recordAnswers: payload.answers ?? buildInitialRecordAnswers(recordTemplate),
          recordTitle: record.title,
          seedRecordSummary: {
            submission_id: record.submission_id,
            title: record.title,
            created_at: record.created_at,
            export_path: '',
          },
          submittedRecord: null,
        });
        replaceStep('run');
        loadedRecordIdRef.current = seedRecordId;
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to restore saved record', error);
        patch({
          errorMessage:
            error instanceof Error ? error.message : 'Failed to reopen saved record.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    hasRestoredSnapshot,
    patch,
    seedRecordId,
    recordTemplate,
    replaceStep,
    selectAllObservations,
    target.id,
    user,
    workflowHydrated,
  ]);
  useEffect(() => {
    if (!workflowHydrated) return;
    if (observedActiveObservationRef.current === undefined) {
      observedActiveObservationRef.current = activeObservationId;
      return;
    }
    if (observedActiveObservationRef.current === activeObservationId) return;
    observedActiveObservationRef.current = activeObservationId;
    analysisConfigSignatureRef.current = null;
    applyTransitInvalidation({ type: 'observation-changed' });
  }, [activeObservationId, applyTransitInvalidation, workflowHydrated]);

  // NOTE: cutout preview effect lives in useTransitPreview hook.

  useEffect(() => {
    if (!result) {
      patch({ submittedRecord: null });
      return;
    }
    if (!recordTitle) {
      const sectorLabel = result.sector ? `Sector ${result.sector}` : 'Transit run';
      patch({ recordTitle: `${target.name} ${sectorLabel}` });
    }
  }, [result, target.name, recordTitle]);

  // NOTE: auto-fold and auto-BJD-window effects live in useTransitFit hook.

  useEffect(() => {
    if (recordLoading || recordTemplateRequestedRef.current) return;
    let cancelled = false;
    recordTemplateRequestedRef.current = true;
    patch({ recordLoading: true });
    fetchRecordTemplate('transit_record')
      .then((template) => {
        if (cancelled) return;
        setRecordTemplate(template);
        dispatch({
          type: 'update',
          updater: (s) => ({
            recordAnswers:
              Object.keys(s.recordAnswers).length > 0
                ? s.recordAnswers
                : buildInitialRecordAnswers(template),
          }),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load record template', error);
        patch({
          errorMessage:
            error instanceof Error ? error.message : 'Failed to load record form.',
        });
      })
      .finally(() => {
        if (!cancelled) patch({ recordLoading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [recordTemplate, recordLoading]);

  // Invalidate result only after hydration when the analysis inputs truly change
  useEffect(() => {
    if (!workflowHydrated) return;
    const nextSignature = JSON.stringify({
      activeObservationId,
      cutoutSizePx,
      targetAperture,
      targetPositionOffset,
      comparisonStars,
    });
    const previousSignature = analysisConfigSignatureRef.current;
    analysisConfigSignatureRef.current = nextSignature;

    if (suppressAnalysisInvalidationRef.current) {
      suppressAnalysisInvalidationRef.current = false;
      return;
    }

    if (previousSignature === null || previousSignature === nextSignature) return;
    applyTransitInvalidation({ type: 'analysis-config-changed' });
  }, [
    activeObservationId,
    applyTransitInvalidation,
    comparisonStars,
    cutoutSizePx,
    targetAperture,
    targetPositionOffset,
    workflowHydrated,
  ]);

  useEffect(() => {
    if (!result || comparisonDiagnostics.length === 0) {
      patch({ selectedComparisonDiagnostic: null, qcIncludedComparisonLabels: [] });
      return;
    }
    const bestDiagnostic = [...comparisonDiagnostics].sort(
      (left, right) => left.differential_rms - right.differential_rms
    )[0];
    patch({
      selectedComparisonDiagnostic: bestDiagnostic.label,
      qcIncludedComparisonLabels: comparisonDiagnostics.map((diagnostic) => diagnostic.label),
    });
  }, [result]);

  // Build star overlay array for the cutout viewer
  const buildStarOverlays = (): StarOverlay[] => {
    if (!preview || !effectiveTargetPosition) return [];
    const overlays: StarOverlay[] = [
      {
        label: 'T',
        position: effectiveTargetPosition,
        aperture: targetAperture,
        type: 'target',
        selected: selectedStar === 'T',
      },
    ];
    comparisonStars.forEach((cs, i) => {
      const key = `C${i + 1}` as StarKey;
      overlays.push({
        label: key,
        position: cs.position,
        aperture: cs.aperture,
        type: 'comparison',
        selected: selectedStar === key,
      });
    });
    return overlays;
  };

  const starOverlays = buildStarOverlays();
  const selectedComparisonDiagnosticData: TransitComparisonDiagnostic | null =
    comparisonDiagnostics.find(
      (diagnostic) => diagnostic.label === selectedComparisonDiagnostic
    ) ?? comparisonDiagnostics[0] ?? null;
  const qcIncludedDiagnostics = comparisonDiagnostics.filter((diagnostic) =>
    qcIncludedComparisonLabels.includes(diagnostic.label)
  );
  const persistedComparisonStars: ComparisonStar[] = comparisonDiagnostics.map((diagnostic) => ({
    position: diagnostic.position,
    aperture: {
      apertureRadius: diagnostic.aperture_radius,
      innerAnnulus: diagnostic.inner_annulus,
      outerAnnulus: diagnostic.outer_annulus,
    },
  }));
  const qcBestDiagnostic: TransitComparisonDiagnostic | null =
    [...comparisonDiagnostics].sort(
      (left, right) => left.differential_rms - right.differential_rms
    )[0] ?? null;
  const qcSelectionDirty =
    comparisonDiagnostics.length > 0 &&
    comparisonDiagnostics.some(
      (diagnostic) => !qcIncludedComparisonLabels.includes(diagnostic.label)
    );
  const qcExcludedCount = comparisonDiagnostics.length - qcIncludedDiagnostics.length;
  const qcCanApply =
    Boolean(result) && qcIncludedDiagnostics.length > 0 && qcSelectionDirty && !running;
  const targetComparisonCollisionPosition = effectiveTargetPosition;
  const recommendedComparisonStars = (preview?.tic_stars ?? [])
    .filter((star) => star.recommended)
    .filter(
      (star, index, stars) =>
        stars.findIndex((candidate) => arePixelPositionsNear(candidate.pixel, star.pixel)) ===
        index
    );
  const ticCatalogStars = preview?.tic_stars ?? [];
  const otherTicStars = ticCatalogStars.filter((star) => !star.recommended);
  const effectiveCutoutSizePx =
    preview?.cutout_size_px ??
    cutoutSizePx ??
    pendingCutoutSizePx ??
    DEFAULT_TRANSIT_CUTOUT_SIZE_PX;
  const shouldSuggestWiderCutout = effectiveCutoutSizePx < DEFAULT_TRANSIT_CUTOUT_SIZE_PX;
  const ticCatalogStatusMessage =
    ticCatalogStars.length === 0
      ? shouldSuggestWiderCutout
        ? `No TIC stars were found in this ${effectiveCutoutSizePx}px field. Reload with ${DEFAULT_TRANSIT_CUTOUT_SIZE_PX}px to search a wider area.`
        : 'No TIC stars were found in this field. You can still add comparison stars manually from the image.'
      : recommendedComparisonStars.length === 0
        ? 'TIC stars were found, but none met the recommendation filter. Select from the list below or add stars manually.'
        : null;

  // Get the aperture for the currently selected star
  const getSelectedAperture = (): ApertureParams => {
    if (selectedStar === 'T') return targetAperture;
    const idx = parseInt(selectedStar.slice(1)) - 1;
    return comparisonStars[idx]?.aperture ?? DEFAULT_APERTURE;
  };

  const updateSelectedAperture = (apertureChanges: Partial<ApertureParams>) => {
    if (selectedStar === 'T') {
      dispatch({
        type: 'update',
        updater: (s) => ({ targetAperture: { ...s.targetAperture, ...apertureChanges } }),
      });
    } else {
      const idx = parseInt(selectedStar.slice(1)) - 1;
      dispatch({
        type: 'update',
        updater: (s) => ({
          comparisonStars: s.comparisonStars.map((cs, i) =>
            i === idx ? { ...cs, aperture: { ...cs.aperture, ...apertureChanges } } : cs
          ),
        }),
      });
    }
  };

  // Step state
  const stepOrder: TransitStep[] = [
    'select',
    'run',
    'comparisonqc',
    'lightcurve',
    'transitfit',
    'record',
  ];
  const currentStepIndex = stepOrder.indexOf(step);

  const getStepState = (stepId: TransitStep): StepState => {
    const targetIndex = stepOrder.indexOf(stepId);
    if (stepId === 'select') {
      return step === 'select' ? 'accessible' : 'completed';
    }
    if (stepId === 'run') {
      if (result) {
        if (currentStepIndex > targetIndex) return 'completed';
        if (step === 'run') return 'accessible';
      }
      if (!preview || comparisonStars.length === 0) return 'locked';
      if (currentStepIndex > targetIndex) return 'completed';
      if (step === 'run') return 'accessible';
      return 'locked';
    }
    if (stepId === 'comparisonqc') {
      if (step === 'comparisonqc' && running) return 'accessible';
      if (!result) return 'locked';
      if (currentStepIndex > targetIndex) return 'completed';
      if (step === 'comparisonqc') return 'accessible';
      return 'locked';
    }
    if (stepId === 'lightcurve') {
      if (!result) return 'locked';
      if (currentStepIndex > targetIndex) return 'completed';
      if (step === 'lightcurve') return 'accessible';
      return 'locked';
    }
    if (stepId === 'transitfit') {
      if (!result) return 'locked';
      if (currentStepIndex > targetIndex) return 'completed';
      if (step === 'transitfit') return 'accessible';
      return 'locked';
    }
    if (stepId === 'record') {
      if (!result) return 'locked';
      if (step === 'record') return 'accessible';
      return 'locked';
    }
    return 'locked';
  };

  const handleStepClick = (stepId: TransitStep) => {
    if (getStepState(stepId) === 'locked') return;
    setStep(stepId);
  };

  const handleAddComparison = (position: PixelCoordinate) => {
    dispatch({
      type: 'update',
      updater: (s) => {
        if (s.comparisonStars.length >= MAX_COMPARISON_STARS) return {};
        if (
          targetComparisonCollisionPosition &&
          arePixelPositionsNear(position, targetComparisonCollisionPosition)
        ) {
          return {};
        }
        if (s.comparisonStars.some((star) => arePixelPositionsNear(star.position, position))) {
          return {};
        }
        const next = [...s.comparisonStars, { position, aperture: { ...DEFAULT_APERTURE } }];
        return { comparisonStars: next, selectedStar: `C${next.length}` as StarKey };
      },
    });
  };

  const handleSelectStarFromCutout = (label: string) => {
    if (label === 'T' || /^C\d+$/.test(label)) {
      patch({ selectedStar: label as StarKey });
    }
  };

  const handleMoveStar = (label: string, position: PixelCoordinate) => {
    if (label === 'T') {
      patch({ targetPositionOffset: position });
      return;
    }
    const idx = parseInt(label.slice(1)) - 1;
    if (idx < 0 || idx >= comparisonStars.length) return;
    dispatch({
      type: 'update',
      updater: (s) => ({
        comparisonStars: s.comparisonStars.map((cs, i) => (i === idx ? { ...cs, position } : cs)),
      }),
    });
  };

  const handleRemoveComparison = (index: number) => {
    dispatch({
      type: 'update',
      updater: (s) => ({
        comparisonStars: s.comparisonStars.filter((_, i) => i !== index),
        selectedStar: 'T' as StarKey,
      }),
    });
  };

  const handleFrameChange = (frameIndex: number) => {
    if (!preview) return;
    const clamped = Math.max(0, Math.min(preview.frame_count - 1, frameIndex));
    patch({ selectedFrameIndex: clamped });
  };

  const handleGuideAnswers = useCallback((answers: Record<string, string>) => {
    guideAnswersRef.current = { ...guideAnswersRef.current, ...answers };
    labDirtyRef.current = true;
    // The answers live in a ref (they must not re-render the heavy Lab on every
    // click), so nudge a counter to let the autosave effect below see the change.
    setLabDraftTick((tick) => tick + 1);
  }, []);

  // Restore the autosaved Lab draft. Skipped when reopening a saved record or a
  // backend draft — those are an explicit "load this one" and must win.
  useEffect(() => {
    labHydratedRef.current = false;
    labDirtyRef.current = false;
    if (seedRecordId || draftId) return;
    const saved = loadLabDraft(target.id);
    if (saved) {
      guideAnswersRef.current = saved.guideAnswers;
      if (Object.keys(saved.recordAnswers).length > 0) {
        patch({ recordAnswers: saved.recordAnswers });
      }
      setLabSavedAt(saved.savedAt);
      setLabDraftTick((tick) => tick + 1);
    } else {
      guideAnswersRef.current = {};
      setLabSavedAt(null);
    }
    labHydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, seedRecordId, draftId]);

  useEffect(() => {
    if (!labHydratedRef.current || !labDirtyRef.current) return;
    const timer = setTimeout(() => {
      const at = saveLabDraft(target.id, guideAnswersRef.current, recordAnswers);
      if (at !== null) setLabSavedAt(at);
    }, 600);
    return () => clearTimeout(timer);
  }, [target.id, recordAnswers, labDraftTick]);

  const handleRecordAnswerChange = (questionId: string, value: unknown) => {
    labDirtyRef.current = true;
    dispatch({
      type: 'update',
      updater: (s) => ({
        submittedRecord: null,
        recordAnswers: { ...s.recordAnswers, [questionId]: value },
      }),
    });
  };

  const handleSubmitRecord = async () => {
    if (!result) {
      patch({ errorMessage: 'No photometry result is available to save.' });
      return;
    }

    const submissionObservationId =
      result.observation_id?.trim() || activeObservationId || preview?.observation_id || '';
    if (!submissionObservationId) {
      patch({ errorMessage: 'Missing observation context for this analysis record.' });
      return;
    }

    const submissionSector = preview?.sector ?? activeObservation?.sector ?? result.sector;
    const submissionFieldSizePx =
      preview?.cutout_size_px ??
      cutoutSizePx ??
      pendingCutoutSizePx ??
      DEFAULT_TRANSIT_CUTOUT_SIZE_PX;
    const submissionTargetPosition =
      effectiveTargetPosition ?? targetPositionOffset ?? result.target_position ?? null;
    const submissionObservationContext =
      submissionSector !== null && submissionSector !== undefined
        ? {
            sector: submissionSector,
            camera: preview?.camera ?? activeObservation?.camera ?? null,
            ccd: preview?.ccd ?? activeObservation?.ccd ?? null,
          }
        : null;

    patch({ recordSubmitting: true, errorMessage: null });
    try {
      const response = await submitRecordTemplate('transit_record', {
        workflow: 'transit_lab',
        target_id: target.id,
        observation_ids: [submissionObservationId],
        title: recordTitle.trim() || `${target.name} Sector ${submissionSector}`,
        context: {
          target_name: target.name,
          sector: submissionSector,
          observation_id: submissionObservationId,
          field_size_px: submissionFieldSizePx,
          frame_count: result.frame_count,
          target_context: {
            ra: target.ra,
            dec: target.dec,
            period_days: target.period_days,
            transit_depth_pct: target.transit_depth_pct ?? null,
            transit_duration_hours: target.transit_duration_hours ?? null,
            reference_rp_rs_from_depth: referenceRpRs,
          },
          observation_context: submissionObservationContext,
          target_position: submissionTargetPosition,
          target_aperture: submissionTargetPosition
            ? toTransitApertureConfig(submissionTargetPosition, targetAperture)
            : null,
          comparison_positions: persistedComparisonStars.map((star) => star.position),
          comparison_apertures: persistedComparisonStars.map((star) =>
            toTransitApertureConfig(star.position, star.aperture)
          ),
          aperture: targetAperture,
          transit_fit: fitResult ? {
            rp_rs: fitResult.fitted_params.rp_rs,
            rp_rs_err: fitResult.fitted_params.rp_rs_err,
            a_rs: fitResult.fitted_params.a_rs,
            a_rs_err: fitResult.fitted_params.a_rs_err,
            inclination: fitResult.fitted_params.inclination,
            inclination_err: fitResult.fitted_params.inclination_err,
            u1: fitResult.fitted_params.u1,
            u2: fitResult.fitted_params.u2,
            chi_squared_red: fitResult.fitted_params.reduced_chi_squared,
            period: fitResult.period,
            t0: fitResult.t0,
            used_batman: fitResult.used_batman,
            used_mcmc: fitResult.used_mcmc,
            preprocessing: fitResult.preprocessing,
          } : null,
          fit_controls: {
            fit_data_source: fitDataSource,
            display_x_axis: fitDisplayXAxis,
            display_y_axis: fitDisplayYAxis,
            bjd_start: resolvedBjdWindow?.start ?? null,
            bjd_end: resolvedBjdWindow?.end ?? null,
            fit_window_phase: requestedFitWindowPhase,
            baseline_order: 0,
            sigma_clip_sigma: 0,
            sigma_clip_iterations: 0,
            fit_limb_darkening: false,
          },
          learning_mode: learningMode,
          reference_comparison: fitResult ? {
            measured_rp_rs: measuredRpRs,
            measured_depth_pct: measuredTransitDepthPct,
            reference_rp_rs_from_depth: referenceRpRs,
            reference_depth_pct: referenceTransitDepthPct,
            rp_rs_difference: rpRsDifference,
            measured_period_days: fitResult.period,
            reference_period_days: target.period_days,
            period_difference_days: periodDifference,
          } : null,
          validation_stats: validationStats,
        },
        answers: recordAnswers,
        guide_answers: guideAnswersRef.current,
      });
      patch({ submittedRecord: response });
    } catch (error) {
      console.error('Failed to submit analysis record', error);
      patch({
        errorMessage:
          error instanceof Error ? error.message : 'Failed to submit analysis record.',
      });
    } finally {
      patch({ recordSubmitting: false });
    }
  };

  // NOTE: runTransitPhotometryForComparisons, handleRunPhotometry, handleStop,
  // handleToggleQcComparison, handleSelectAllQcComparisons, handleApplyComparisonQc
  // live in useTransitPhotometry hook.

  const handleReset = () => {
    clearPersistedWorkflow();
    loadedRecordIdRef.current = null;
    analysisConfigSignatureRef.current = null;
    observedActiveObservationRef.current = undefined;
    applyTransitInvalidation({ type: 'hard-reset' });
    patch({
      foldEnabled: false,
      foldPeriod: null,
      foldT0: 0,
      foldT0Auto: true,
      fitLimbDarkening: false,
      fitDataSource: 'bjd_window',
      fitDisplayXAxis: 'btjd',
      fitDisplayYAxis: 'normalized_flux',
      fitWindowPhase: 0.12,
      fitBaselineOrder: 0,
      fitSigmaClipSigma: 0.0,
      fitSigmaClipIterations: 0,
    });
  };

  // Navigation
  const canGoNext =
    (step === 'select' && Boolean(preview) && comparisonStars.length > 0) ||
    (step === 'run' && Boolean(result)) ||
    (step === 'comparisonqc' && Boolean(result) && !qcSelectionDirty) ||
    (step === 'lightcurve' && Boolean(result)) ||
    (step === 'transitfit' && Boolean(result));
  const canGoPrevious = currentStepIndex > 0;

  const handleNext = () => {
    if (!canGoNext) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < stepOrder.length) setStep(stepOrder[nextIndex]);
  };
  const handlePrevious = () => {
    if (!canGoPrevious) return;
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setStep(stepOrder[prevIndex]);
  };
  const currentStepMeta =
    STEPS.find((item) => item.id === step) ?? STEPS[0];

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [step]);

  const cutoutArcmin =
    cutoutSizePx !== null ? ((cutoutSizePx * 21) / 60).toFixed(1) : null;
  const loadedCutoutArcmin = preview
    ? ((preview.cutout_size_px * 21) / 60).toFixed(1)
    : cutoutArcmin ?? '0.0';
  const currentFrameIndex = selectedFrameIndex ?? preview?.frame_index ?? null;
  const canRenderRestoreStateWithoutPreview =
    restoringSessionPreviewRef.current &&
    preview === null &&
    result !== null &&
    (
      step === 'lightcurve' ||
      step === 'transitfit' ||
      step === 'record'
    );
  const showBlockingPreviewLoad =
    previewLoading && preview === null && !canRenderRestoreStateWithoutPreview;
  const showRunProgress = running || (!result && progress > 0);
  const fitReferencePeriod =
    foldPeriod ?? target.period_days ?? result?.light_curve.period_days ?? null;
  const lightCurveTimeBounds = result
    ? result.light_curve.points.reduce(
        (acc, point) => {
          if (!Number.isFinite(point.hjd)) return acc;
          return {
            min: Math.min(acc.min, point.hjd),
            max: Math.max(acc.max, point.hjd),
          };
        },
        { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY }
      )
    : null;
  const resolvedBjdWindow =
    bjdWindowStart !== null && bjdWindowEnd !== null
      ? {
          start: Math.min(bjdWindowStart, bjdWindowEnd),
          end: Math.max(bjdWindowStart, bjdWindowEnd),
        }
      : null;
  const roiMidpoint =
    resolvedBjdWindow !== null ? 0.5 * (resolvedBjdWindow.start + resolvedBjdWindow.end) : 0;
  const hasResolvedBjdWindow =
    resolvedBjdWindow !== null && resolvedBjdWindow.end > resolvedBjdWindow.start;
  const roiPoints =
    result && hasResolvedBjdWindow
      ? result.light_curve.points.filter(
          (point) =>
            Number.isFinite(point.hjd) &&
            point.hjd >= resolvedBjdWindow.start &&
            point.hjd <= resolvedBjdWindow.end
        )
      : [];
  const roiLightCurve = buildBjdLightCurve(
    roiPoints,
    result?.light_curve.target_id ?? target.id,
    result?.light_curve.period_days ?? fitReferencePeriod
  );
  const activeFitPreviewResult =
    fitResult && fitResult.preprocessing.fit_mode === fitDataSource ? fitResult : null;
  const estimatedPhaseFoldT0 = estimatePhaseFoldReferenceT0(
    roiPoints,
    fitReferencePeriod,
    roiMidpoint
  );
  const phaseFoldReferenceT0 =
    !foldT0Auto && Number.isFinite(foldT0) && foldT0 !== 0
      ? foldT0
      : activeFitPreviewResult?.preprocessing.fit_mode === 'phase_fold'
        ? activeFitPreviewResult.reference_t0
        : estimatedPhaseFoldT0;
  const requestedFitWindowPhase =
    fitDataSource === 'phase_fold'
      ? fitWindowPhase
      : fitReferencePeriod && hasResolvedBjdWindow
        ? Math.min(
            Math.max(
              (resolvedBjdWindow.end - resolvedBjdWindow.start) / fitReferencePeriod / 2,
              0.04,
            ),
            0.35,
          )
        : fitWindowPhase;
  const fitDisplayBaseLightCurve =
    activeFitPreviewResult
      ? buildLightCurveFromFitResult(activeFitPreviewResult, fitDataSource)
      : fitDataSource === 'phase_fold' && fitReferencePeriod
        ? buildPhaseFoldedLightCurve(
            roiPoints,
            result?.light_curve.target_id ?? target.id,
            fitReferencePeriod,
            phaseFoldReferenceT0,
            requestedFitWindowPhase
          )
        : roiLightCurve;
  const fitDisplayReferencePeriod = activeFitPreviewResult?.period ?? fitReferencePeriod;
  const fitDisplayReferenceT0 = activeFitPreviewResult?.reference_t0 ?? phaseFoldReferenceT0;
  const fitDisplayLightCurve =
    fitDisplayBaseLightCurve
      ? transformLightCurveForDisplay(fitDisplayBaseLightCurve, {
          xAxisMode: fitDisplayXAxis,
          yAxisMode: fitDisplayYAxis,
          period: fitDisplayReferencePeriod,
          t0: fitDisplayReferenceT0,
        })
      : null;
  const fitWindowPointCount = roiPoints.length;
  const canFitWithBjdWindow =
    hasResolvedBjdWindow && fitWindowPointCount >= 20;
  const canPreviewTransitFit =
    fitDisplayLightCurve !== null && fitDisplayLightCurve.points.length > 0;
  const canRunTransitFit =
    Boolean(canFitWithBjdWindow && fitReferencePeriod);
  const fitSourceLabel =
    fitDataSource === 'phase_fold'
      ? lang === 'ko' ? '위상 접기' : 'Phase Fold'
      : lang === 'ko' ? 'BJD 구간' : 'BJD Window';
  const fitDisplayXAxisLabel =
    fitDisplayXAxis === 'orbital_phase'
      ? lang === 'ko' ? '공전 위상' : 'Orbital Phase'
      : 'BTJD';
  const fitDisplayYAxisLabel =
    fitDisplayYAxis === 'delta_mag'
      ? lang === 'ko' ? '등급 변화량' : 'Delta mag'
      : lang === 'ko' ? '정규화 Flux' : 'Normalized Flux';
  const canDisplayFitAsPhase = Boolean(fitDisplayReferencePeriod && fitDisplayReferencePeriod > 0);
  const fitPreviewOverlay =
    activeFitPreviewResult
      ? buildFitOverlayCurve(activeFitPreviewResult, fitDisplayXAxis, fitDisplayYAxis)
      : null;
  const fitPreviewResiduals =
    activeFitPreviewResult
      ? buildFitResidualCurve(activeFitPreviewResult, fitDisplayXAxis, fitDisplayYAxis)
      : null;
  const fitResultModelFlux =
    fitResult && fitResult.data_flux.length === fitResult.residuals.length
      ? fitResult.data_flux.map((value, index) => value - fitResult.residuals[index])
      : [];
  const fitResidualRms =
    fitResult && fitResult.residuals.length > 0
      ? Math.sqrt(
          fitResult.residuals.reduce((sum, value) => sum + value * value, 0) /
            fitResult.residuals.length
        )
      : null;

  // ── Transit fit hook (needs derived values above) ────────────────────
  const { handleFitTransit } = useTransitFit({
    result,
    target,
    activeObservation,
    roiPoints,
    foldEnabled,
    foldPeriod,
    foldT0,
    foldT0Auto,
    fitDataSource,
    fitLimbDarkening,
    fitWindowPhase,
    fitBaselineOrder,
    fitSigmaClipSigma,
    fitSigmaClipIterations,
    fitResult,
    refineMcmc,
    bjdWindowStart,
    bjdWindowEnd,
    phaseFoldReferenceT0,
    requestedFitWindowPhase,
    patch,
    dispatch,
  });

  const selectedAperture = getSelectedAperture();
  const draftStatusLabel =
    draftSaveStatus === 'saving'
      ? 'Saving draft...'
      : draftSaveStatus === 'saved'
        ? draftSavedAtLabel
          ? `Saved ${draftSavedAtLabel}`
          : 'Saved'
        : draftSaveStatus === 'error'
          ? 'Draft save failed'
          : 'Draft session';

  const blockingPreviewLoadCard = showBlockingPreviewLoad ? (
    <div className="transit-progress-card">
      <div className="transit-progress-head">
        <strong>Loading TESS cutout</strong>
        <span>{Math.round(previewProgress * 100)}%</span>
      </div>
      <div className="transit-progress-bar">
        <div
          className="transit-progress-fill"
          style={{ width: `${Math.max(4, previewProgress * 100)}%` }}
        />
      </div>
      <p className="hint">
        {previewMessage ?? 'Downloading and preparing the TESS cutout...'}
      </p>
      <div className="transit-progress-actions">
        <button type="button" className="btn-sm" onClick={handleReset}>
          Stop
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="transit-lab-wrap">
      {/* Every learner follows the same flow — aperture, ROI and comparison stars
          are adjustable regardless of learningMode — so this banner must not
          imply a guided/advanced split the UI does not offer. */}
      <div className="learning-mode-banner">
        <div>
          <span>{lang === 'ko' ? '탐구 개요' : 'Overview'}</span>
          <strong>
            {lang === 'ko'
              ? '단계별 안내를 따라 분석하고, 분석 조건과 모델 가정을 확인하며 결과를 해석합니다.'
              : 'Follow the guided steps, check the analysis conditions and model assumptions, and interpret the result.'}
          </strong>
        </div>
        <p>
          {lang === 'ko'
            ? '권장 45~90분 · 결과물: 광도곡선 근거, NASA Exoplanet Archive 기준값 비교, 차이 원인 설명'
            : 'Suggested 45–90 minutes · Output: light-curve evidence, NASA Exoplanet Archive comparison, and an explanation of differences'}
          {labSavedAt !== null && (
            <em className="inquiry-autosave-status">
              {lang === 'ko' ? '자동 저장됨 ' : 'Autosaved '}
              {new Date(labSavedAt).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </em>
          )}
        </p>
      </div>
      <div
        className="analysis-provenance-bar"
        aria-label={lang === 'ko' ? '자료 출처와 분석 흐름' : 'Data provenance and analysis flow'}
      >
        <strong>{lang === 'ko' ? '자료 출처' : 'Data provenance'}</strong>
        <span>
          {lang === 'ko' ? '대상·기준값' : 'Target and reference'}:
          {' '}
          {target.data_source === 'nasa_exoplanet_archive'
            ? 'NASA Exoplanet Archive'
            : target.data_source?.replace(/_/g, ' ') ?? 'Curated catalog'}
        </span>
        <span>
          {lang === 'ko' ? '관측 자료: MAST 기반 TESS 공개 관측자료' : 'Observation data: public TESS observations via MAST'}
        </span>
        <span>
          {lang === 'ko' ? '분석: 차등측광 · 식현상 모델 적합 (Transit Fit)' : 'Analysis: differential photometry · transit model fit'}
        </span>
      </div>
      {draftId && (
        <div className={`transit-draft-bar ${draftSaveStatus}`}>
          <span className="transit-draft-bar-label">Draft</span>
          <span className="transit-draft-bar-id">{draftId}</span>
          {seedRecordSummary && (
            <span className="transit-draft-bar-seed">Seed #{seedRecordSummary.submission_id}</span>
          )}
          <span className="transit-draft-bar-status">{draftStatusLabel}</span>
        </div>
      )}
    <div className={`lab-content transit-lab ${mobileSidebarOpen ? 'transit-mobile-sidebar-open' : ''}`}>
      {/* ===== SIDEBAR — changes per step ===== */}
      <div className="lab-sidebar">
        <button
          type="button"
          className={`transit-mobile-sidebar-toggle ${mobileSidebarOpen ? 'open' : ''}`}
          onClick={() => setMobileSidebarOpen((prev) => !prev)}
          aria-expanded={mobileSidebarOpen}
        >
          <div className="transit-mobile-sidebar-copy">
            <span className="transit-mobile-sidebar-kicker">
              Step {currentStepMeta.number} controls
            </span>
            <strong>{currentStepMeta.label[lang]}</strong>
          </div>
          <span className="transit-mobile-sidebar-icon" aria-hidden="true">
            {mobileSidebarOpen ? '−' : '+'}
          </span>
        </button>

        <div className="transit-sidebar-scroll">
        {/* Sector list — always visible */}
        <div className="thumbnail-strip">
          <h4>{lang === 'ko' ? '선택한 Sector' : 'Selected Sectors'} ({selectedObservations.length})</h4>
          <div className="transit-sector-list">
            {selectedObservations.map((observation) => {
              const isActive = observation.id === activeObservationId;
              const frameCount =
                isActive && preview
                  ? preview.frame_count
                  : observation.frame_count ?? null;
              return (
                <button
                  key={observation.id}
                  className={`transit-sector-button ${isActive ? 'active' : ''}`}
                  onClick={() => patch({ activeObservationId: observation.id })}
                >
                  <strong>{observation.display_label ?? `Sector ${observation.sector}`}</strong>
                  <span>
                    {observation.display_subtitle ?? 'TESS cutout'}
                    {frameCount !== null && ` · ${frameCount.toLocaleString()} ${lang === 'ko' ? '프레임' : 'frames'}`}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedObservations.length === 0 && (
            <p className="hint">
              {lang === 'ko'
                ? '대상 상세 페이지에서 하나 이상의 TESS Sector를 선택하세요.'
                : 'Select one or more TESS sectors on the target detail page.'}
            </p>
          )}
        </div>

        {/* Step 1 sidebar: Star list + per-star aperture */}
        {step === 'select' && (
          <>
            <div className="transit-controls-card">
              <h4>{lang === 'ko' ? '별 선택' : 'Stars'}</h4>
              <p className="hint">
                {lang === 'ko'
                  ? `아래 별을 선택해 구경을 조절하세요. Cutout 영상을 눌러 비교성을 추가하거나 기존 구경을 드래그해 위치를 옮길 수 있습니다. 최대 ${MAX_COMPARISON_STARS}개까지 선택할 수 있습니다.`
                  : `Select a star below to adjust its aperture. Click the cutout to add comparison stars, or drag an existing aperture to reposition it (up to ${MAX_COMPARISON_STARS}).`}
              </p>
              <div className="transit-star-list">
                {/* Target star */}
                <button
                  className={`transit-star-row ${selectedStar === 'T' ? 'selected' : ''}`}
                  onClick={() => patch({ selectedStar: 'T' })}
                >
                  <span className="transit-star-badge target">T</span>
                  <div className="transit-star-info">
                    <strong>{lang === 'ko' ? '목표별' : 'Target'}</strong>
                    {effectiveTargetPosition && (
                      <span>
                        ({effectiveTargetPosition.x.toFixed(1)},{' '}
                        {effectiveTargetPosition.y.toFixed(1)})
                      </span>
                    )}
                  </div>
                  <span className="transit-star-aperture-tag">
                    r={targetAperture.apertureRadius.toFixed(1)}
                  </span>
                </button>

                {/* Comparison stars */}
                {comparisonStars.map((cs, index) => {
                  const key = `C${index + 1}` as StarKey;
                  return (
                    <button
                      key={key}
                      className={`transit-star-row ${selectedStar === key ? 'selected' : ''}`}
                      onClick={() => patch({ selectedStar: key })}
                    >
                      <span className="transit-star-badge comparison">{key}</span>
                      <div className="transit-star-info">
                        <strong>{lang === 'ko' ? `비교성 ${index + 1}` : `Comparison ${index + 1}`}</strong>
                        <span>
                          ({cs.position.x.toFixed(1)}, {cs.position.y.toFixed(1)})
                        </span>
                      </div>
                      <span className="transit-star-aperture-tag">
                        r={cs.aperture.apertureRadius.toFixed(1)}
                      </span>
                      <button
                        className="transit-star-remove"
                        title={lang === 'ko' ? '제거' : 'Remove'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveComparison(index);
                        }}
                      >
                        &times;
                      </button>
                    </button>
                  );
                })}

                {comparisonStars.length === 0 && (
                  <div className="transit-star-row empty">
                    {lang === 'ko' ? 'Cutout 영상을 눌러 비교성을 추가하세요' : 'Click the cutout to add comparison stars'}
                  </div>
                )}
              </div>
            </div>

            {/* Per-star aperture sliders */}
            <div className="transit-controls-card">
              <h4>
                {lang === 'ko' ? '구경' : 'Aperture'} —{' '}
                {selectedStar === 'T'
                  ? lang === 'ko' ? '목표별' : 'Target'
                  : lang === 'ko' ? `비교성 ${selectedStar.slice(1)}` : `Comparison ${selectedStar.slice(1)}`}
              </h4>
              <div className="param-row">
                <label>
                  {lang === 'ko' ? '반지름' : 'Radius'}: <strong>{selectedAperture.apertureRadius.toFixed(1)} px</strong>
                </label>
                <input
                  type="range"
                  min={1.0}
                  max={5.0}
                  step={0.25}
                  value={selectedAperture.apertureRadius}
                  onChange={(e) =>
                    updateSelectedAperture({ apertureRadius: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="param-row">
                <label>
                  {lang === 'ko' ? '배경 안쪽 반지름' : 'Inner Annulus'}: <strong>{selectedAperture.innerAnnulus.toFixed(1)} px</strong>
                </label>
                <input
                  type="range"
                  min={3.0}
                  max={8.0}
                  step={0.25}
                  value={selectedAperture.innerAnnulus}
                  onChange={(e) =>
                    updateSelectedAperture({ innerAnnulus: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="param-row">
                <label>
                  {lang === 'ko' ? '배경 바깥 반지름' : 'Outer Annulus'}: <strong>{selectedAperture.outerAnnulus.toFixed(1)} px</strong>
                </label>
                <input
                  type="range"
                  min={4.0}
                  max={10.0}
                  step={0.25}
                  value={selectedAperture.outerAnnulus}
                  onChange={(e) =>
                    updateSelectedAperture({ outerAnnulus: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            {/* TIC recommended comparisons */}
            {preview && (
              <div className="transit-controls-card">
                <div className="transit-controls-card-header">
                  <h4>{lang === 'ko' ? 'TIC Catalog 별' : 'TIC Catalog Stars'}</h4>
                  <button
                    type="button"
                    className={`btn-sm ${showTicMarkers ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'update', updater: (s) => ({ showTicMarkers: !s.showTicMarkers }) })}
                    disabled={ticCatalogStars.length === 0}
                    title="이미지에 TIC 별 마커 표시"
                  >
                    {showTicMarkers
                      ? lang === 'ko' ? '마커 숨기기' : 'Hide markers'
                      : lang === 'ko' ? '마커 표시' : 'Show markers'}
                  </button>
                </div>
                <p className="hint">
                  {lang === 'ko'
                    ? '현재 시야의 TESS Input Catalog 별입니다. 추천 별은 밝고 변광성이 아닌 후보입니다.'
                    : 'Bright stars from the TESS Input Catalog in the field of view. Recommended stars are bright and non-variable.'}
                </p>
                {ticCatalogStatusMessage && (
                  <p className="hint" style={{ marginBottom: 10 }}>
                    {ticCatalogStatusMessage}
                  </p>
                )}
                <div className="transit-tic-list">
                  {recommendedComparisonStars.map((star) => (
                      <button
                        key={star.tic_id}
                        className="transit-star-row tic-recommended"
                        onClick={() => {
                          if (comparisonStars.length >= MAX_COMPARISON_STARS) return;
                          handleAddComparison(star.pixel);
                        }}
                        disabled={comparisonStars.length >= MAX_COMPARISON_STARS}
                        title={`TIC ${star.tic_id} — Tmag ${star.tmag ?? '?'}`}
                      >
                        <span className="transit-star-badge tic">R</span>
                        <div className="transit-star-info">
                          <strong>TIC {star.tic_id}</strong>
                          <span>
                            Tmag {star.tmag?.toFixed(1) ?? '?'} · {star.distance_arcmin?.toFixed(1)}
                            '
                          </span>
                        </div>
                        <span className="transit-star-aperture-tag">
                          ({star.pixel.x.toFixed(1)}, {star.pixel.y.toFixed(1)})
                        </span>
                      </button>
                    ))}
                  {otherTicStars.length > 0 && (
                    <details className="transit-tic-others">
                      <summary>
                        {lang === 'ko' ? `기타 별 ${otherTicStars.length}개` : `${otherTicStars.length} other stars`}
                      </summary>
                      {otherTicStars.map((star) => (
                          <button
                            key={star.tic_id}
                            className="transit-star-row"
                            onClick={() => {
                              if (comparisonStars.length >= MAX_COMPARISON_STARS) return;
                              handleAddComparison(star.pixel);
                            }}
                            disabled={comparisonStars.length >= MAX_COMPARISON_STARS}
                            title={`TIC ${star.tic_id} — Tmag ${star.tmag ?? '?'}${star.is_variable ? ' (variable)' : ''}`}
                          >
                            <span className={`transit-star-badge tic ${star.is_variable ? 'variable' : ''}`}>
                              {star.is_variable ? 'V' : 'S'}
                            </span>
                            <div className="transit-star-info">
                              <strong>TIC {star.tic_id}</strong>
                              <span>Tmag {star.tmag?.toFixed(1) ?? '?'}</span>
                            </div>
                          </button>
                        ))}
                    </details>
                  )}
                </div>
                {comparisonStars.length < MAX_COMPARISON_STARS &&
                  recommendedComparisonStars.length > 0 && (
                  <button
                    className="btn-sm"
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={() => {
                      const recommended = recommendedComparisonStars.filter((star) => {
                        if (
                          targetComparisonCollisionPosition &&
                          arePixelPositionsNear(star.pixel, targetComparisonCollisionPosition)
                        ) {
                          return false;
                        }
                        return !comparisonStars.some((item) =>
                          arePixelPositionsNear(item.position, star.pixel)
                        );
                      });
                      const slotsLeft = MAX_COMPARISON_STARS - comparisonStars.length;
                      recommended.slice(0, slotsLeft).forEach((star) => {
                        handleAddComparison(star.pixel);
                      });
                    }}
                  >
                    {lang === 'ko' ? '추천 비교성 자동 선택' : 'Auto-select recommended'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 2 sidebar: Run configuration summary */}
        {step === 'run' && (
          <div className="transit-controls-card">
            <h4>{lang === 'ko' ? '분석 설정' : 'Configuration'}</h4>
            <div className="transit-config-summary">
              <div className="transit-config-row">
                <span>{lang === 'ko' ? '목표별 (T)' : 'Target (T)'}</span>
                <span>r={targetAperture.apertureRadius.toFixed(1)}</span>
              </div>
              {comparisonStars.map((cs, i) => (
                <div key={i} className="transit-config-row">
                  <span>C{i + 1}</span>
                  <span>r={cs.aperture.apertureRadius.toFixed(1)}</span>
                </div>
              ))}
              <div className="transit-config-row">
                <span>{lang === 'ko' ? '시야' : 'Field'}</span>
                <span>{cutoutSizePx} px</span>
              </div>
              {preview && (
                <div className="transit-config-row">
                   <span>Cadences</span>
                  <span>{preview.frame_count.toLocaleString()}</span>
                </div>
              )}
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              {lang === 'ko' ? '구경을 조절하려면 Step 1로 돌아가세요.' : 'Go back to Step 1 to adjust apertures.'}
            </p>
          </div>
        )}

        {/* Step 3 sidebar: Comparison QC */}
        {step === 'comparisonqc' && (
          <>
            <div className="transit-controls-card">
              <h4>{lang === 'ko' ? '비교성 품질 점검' : 'Comparison QC'}</h4>
              <p className="hint" style={{ marginTop: 10 }}>
                {lang === 'ko'
                  ? '후보 비교성을 점검하고 품질이 떨어지는 별은 제외한 뒤 측광을 다시 실행하세요. 최종 차등 광도곡선은 선택된 비교성 ensemble로 다시 계산됩니다.'
                  : 'Inspect the comparison candidates, exclude poor-quality stars, and rerun photometry. The final differential light curve is rebuilt from the retained comparison ensemble.'}
              </p>
              <div className="transit-config-summary" style={{ marginTop: 12 }}>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '후보' : 'Candidates'}</span>
                  <span>{comparisonDiagnostics.length}</span>
                </div>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '포함' : 'Included'}</span>
                  <span>{qcIncludedDiagnostics.length}</span>
                </div>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '제외' : 'Excluded'}</span>
                  <span>{qcExcludedCount}</span>
                </div>
                {qcBestDiagnostic && (
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '최저 RMS' : 'Best RMS'}</span>
                    <span>
                      {qcBestDiagnostic.label} · {qcBestDiagnostic.differential_rms.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
              <div className="transit-toggle-row" style={{ marginTop: 10 }}>
                <button
                  className="btn-sm"
                  type="button"
                  onClick={handleSelectAllQcComparisons}
                  disabled={comparisonDiagnostics.length === 0 || running}
                >
                  {lang === 'ko' ? '전체 선택' : 'Select All'}
                </button>
                <button
                  className="btn-primary btn-sm"
                  type="button"
                  onClick={() => {
                    void handleApplyComparisonQc();
                  }}
                  disabled={!qcCanApply}
                >
                  {lang === 'ko' ? '품질 선택 적용 후 재실행' : 'Apply QC & Re-run'}
                </button>
              </div>
              {qcSelectionDirty && (
                <div className="transit-callout" style={{ marginTop: 12 }}>
                  {lang === 'ko'
                    ? '비교성 선택이 변경되었습니다. ROI 선택으로 넘어가기 전에 적용하고 측광을 다시 실행하세요.'
                    : 'QC selection changed. Apply QC and rerun photometry before moving on to ROI selection.'}
                </div>
              )}
            </div>
            {result && (
              <div className="transit-controls-card">
                <h4>{lang === 'ko' ? '현재 비교성 Ensemble' : 'Current Ensemble'}</h4>
                <div className="transit-config-summary">
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '프레임' : 'Frames'}</span>
                    <span>{result.frame_count.toLocaleString()}</span>
                  </div>
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '목표별 Flux 중앙값' : 'Median Target'}</span>
                    <span>{result.target_median_flux.toFixed(1)}</span>
                  </div>
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '비교성 Flux 중앙값' : 'Median Comp'}</span>
                    <span>{result.comparison_median_flux.toFixed(1)}</span>
                  </div>
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '비교성 수' : 'Comp Stars'}</span>
                    <span>{result.comparison_count}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 4 sidebar: BJD window selection */}
        {step === 'lightcurve' && (
          <>
            <div className="transit-controls-card">
              <h4>{lang === 'ko' ? 'BJD 분석 구간' : 'BJD Window'}</h4>
              <p className="hint" style={{ marginTop: 10 }}>
                {lang === 'ko'
                  ? 'Step 4 그래프에서 가로로 드래그해 transit 구간을 고르세요. 숫자 입력은 보조용입니다. Step 5에서 이 ROI를 시간축 그대로 적합할지 phase-fold해 적합할지 선택합니다.'
                  : 'Drag horizontally on the Step 4 plot to choose the transit interval. Numeric inputs are optional. In Step 5, choose whether to fit this ROI on the original time axis or after phase folding.'}
              </p>
              {resolvedBjdWindow && (
                <div className="transit-config-summary" style={{ marginTop: 12 }}>
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '구간' : 'Window'}</span>
                    <span>
                      {resolvedBjdWindow.start.toFixed(4)} -{' '}
                      {resolvedBjdWindow.end.toFixed(4)}
                    </span>
                  </div>
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '폭' : 'Width'}</span>
                    <span>
                      {(resolvedBjdWindow.end - resolvedBjdWindow.start).toFixed(4)} d
                    </span>
                  </div>
                </div>
              )}
              <div className="param-row">
                <label>BJD Start</label>
                <input
                  type="number"
                  className="transit-param-number"
                  value={bjdWindowStart ?? ''}
                  step={0.0005}
                  min={
                    lightCurveTimeBounds && Number.isFinite(lightCurveTimeBounds.min)
                      ? lightCurveTimeBounds.min
                      : undefined
                  }
                  max={
                    lightCurveTimeBounds && Number.isFinite(lightCurveTimeBounds.max)
                      ? lightCurveTimeBounds.max
                      : undefined
                  }
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    patch({ bjdWindowStart: value === '' ? null : parseFloat(value), fitResult: null });
                  }}
                />
              </div>
              <div className="param-row">
                <label>BJD End</label>
                <input
                  type="number"
                  className="transit-param-number"
                  value={bjdWindowEnd ?? ''}
                  step={0.0005}
                  min={
                    lightCurveTimeBounds && Number.isFinite(lightCurveTimeBounds.min)
                      ? lightCurveTimeBounds.min
                      : undefined
                  }
                  max={
                    lightCurveTimeBounds && Number.isFinite(lightCurveTimeBounds.max)
                      ? lightCurveTimeBounds.max
                      : undefined
                  }
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    patch({ bjdWindowEnd: value === '' ? null : parseFloat(value), fitResult: null });
                  }}
                />
              </div>
              <div className="transit-toggle-row" style={{ marginTop: 10 }}>
                <button
                  className="btn-sm"
                  type="button"
                  onClick={() => {
                    const defaultWindow = computeDefaultBjdWindow(
                      result?.light_curve.points ?? [],
                      fitReferencePeriod
                    );
                    if (!defaultWindow) return;
                    patch({ bjdWindowStart: defaultWindow.start, bjdWindowEnd: defaultWindow.end, fitResult: null });
                  }}
                >
                  {lang === 'ko' ? '가장 깊은 Dip' : 'Deepest Dip'}
                </button>
                <button
                  className="btn-sm"
                  type="button"
                  onClick={() => {
                    patch({ bjdWindowStart: null, bjdWindowEnd: null, fitResult: null });
                  }}
                >
                  {lang === 'ko' ? '지우기' : 'Clear'}
                </button>
              </div>
            </div>
            {result && (
              <div className="transit-controls-card">
                <h4>{lang === 'ko' ? '통계' : 'Stats'}</h4>
                <div className="transit-config-summary">
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '프레임' : 'Frames'}</span>
                    <span>{result.frame_count.toLocaleString()}</span>
                  </div>
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '목표별 Flux 중앙값' : 'Median Target'}</span>
                    <span>{result.target_median_flux.toFixed(1)}</span>
                  </div>
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '비교성 Flux 중앙값' : 'Median Comp'}</span>
                    <span>{result.comparison_median_flux.toFixed(1)}</span>
                  </div>
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '비교성 수' : 'Comp Stars'}</span>
                    <span>{result.comparison_count}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 5 sidebar: Transit Fit controls */}
        {step === 'transitfit' && (
          <div className="transit-controls-card">
            <h4>{lang === 'ko' ? '모델 적합 설정' : 'Fit Settings'}</h4>
            <div className="transit-toggle-row" style={{ marginBottom: 12 }}>
              <button
                className={`btn-sm ${fitDataSource === 'bjd_window' ? 'active' : ''}`}
                onClick={() => {
                  patch({
                    fitDataSource: 'bjd_window',
                    fitDisplayXAxis: defaultFitDisplayXAxis('bjd_window'),
                    fitResult: null,
                  });
                }}
                type="button"
              >
                BJD Window
              </button>
              <button
                className={`btn-sm ${fitDataSource === 'phase_fold' ? 'active' : ''}`}
                onClick={() => {
                  patch({
                    fitDataSource: 'phase_fold',
                    fitDisplayXAxis: defaultFitDisplayXAxis('phase_fold'),
                    fitResult: null,
                  });
                }}
                type="button"
                disabled={!fitReferencePeriod}
              >
                {lang === 'ko' ? '위상 접기' : 'Phase Fold'}
              </button>
            </div>
            <p className="hint" style={{ marginBottom: 8 }}>
              {lang === 'ko'
                ? '그래프 축 변경은 Step 5의 표시 방식만 바꿉니다. 모델 적합에는 같은 ROI 데이터와 현재 적합 자료가 사용됩니다.'
                : 'Plot axis remapping only changes how Step 5 is displayed. The fit still uses the same ROI samples and current fit source.'}
            </p>
            <div className="transit-toggle-row" style={{ marginBottom: 8 }}>
              <button
                className={`btn-sm ${fitDisplayXAxis === 'btjd' ? 'active' : ''}`}
                onClick={() => {
                  patch({ fitDisplayXAxis: 'btjd' });
                }}
                type="button"
              >
                X: BTJD
              </button>
              <button
                className={`btn-sm ${fitDisplayXAxis === 'orbital_phase' ? 'active' : ''}`}
                onClick={() => {
                  patch({ fitDisplayXAxis: 'orbital_phase' });
                }}
                type="button"
                disabled={!canDisplayFitAsPhase}
              >
                X: {lang === 'ko' ? '공전 위상' : 'Orbital Phase'}
              </button>
            </div>
            <div className="transit-toggle-row" style={{ marginBottom: 12 }}>
              <button
                className={`btn-sm ${fitDisplayYAxis === 'normalized_flux' ? 'active' : ''}`}
                onClick={() => {
                  patch({ fitDisplayYAxis: 'normalized_flux' });
                }}
                type="button"
              >
                Y: Flux
              </button>
              <button
                className={`btn-sm ${fitDisplayYAxis === 'delta_mag' ? 'active' : ''}`}
                onClick={() => {
                  patch({ fitDisplayYAxis: 'delta_mag' });
                }}
                type="button"
              >
                Y: Delta mag
              </button>
            </div>
            <div className="transit-config-summary" style={{ marginBottom: 12 }}>
              <div className="transit-config-row">
                <span>{lang === 'ko' ? '적합 자료' : 'Fit Source'}</span>
                <span>{fitSourceLabel}</span>
              </div>
              <div className="transit-config-row">
                <span>{lang === 'ko' ? 'X축 표시' : 'Display X'}</span>
                <span>{fitDisplayXAxisLabel}</span>
              </div>
              <div className="transit-config-row">
                <span>{lang === 'ko' ? 'Y축 표시' : 'Display Y'}</span>
                <span>{fitDisplayYAxisLabel}</span>
              </div>
              {fitDataSource === 'bjd_window' && resolvedBjdWindow && (
                <div className="transit-config-row">
                  <span>BJD Window</span>
                  <span>
                    {resolvedBjdWindow.start.toFixed(4)} - {resolvedBjdWindow.end.toFixed(4)}
                  </span>
                </div>
              )}
              {fitDataSource === 'phase_fold' && fitReferencePeriod && (
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '공전 주기' : 'Period'}</span>
                  <span>{fitReferencePeriod.toFixed(6)} d</span>
                </div>
              )}
            </div>
            {fitDataSource === 'phase_fold' ? (
              <>
                <p className="hint" style={{ marginBottom: 12 }}>
                  {lang === 'ko'
                    ? 'Step 4 ROI만 위상으로 접어 표시하고 적합합니다. ROI 안에 여러 transit가 있으면 같은 위상에 겹쳐 한 번에 맞춥니다.'
                    : 'Phase-fold and fit only the Step 4 ROI. Multiple transits in the ROI are overlaid at the same phase.'}
                </p>
                {fitReferencePeriod ? (
                  <>
                    <div className="param-row">
                      <label>
                        Period:{' '}
                        <input
                          type="number"
                          className="transit-param-number"
                          value={foldPeriod ?? fitReferencePeriod}
                          step={0.0001}
                          min={0.01}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v > 0) {
                              patch({ foldPeriod: v, fitResult: null });
                            }
                          }}
                        />
                        <span className="param-unit">d</span>
                      </label>
                    </div>
                    <div className="param-row">
                      <label>
                        T₀:{' '}
                        <input
                          type="number"
                          className="transit-param-number"
                          value={phaseFoldReferenceT0}
                          step={0.0005}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v)) {
                              patch({ foldT0: v, foldT0Auto: false, fitResult: null });
                            }
                          }}
                        />
                        <span className="param-unit">d</span>
                      </label>
                    </div>
                    <div className="param-row">
                      <label>
                        Phase Window:{' '}
                        <input
                          type="number"
                          className="transit-param-number"
                          value={fitWindowPhase}
                          step={0.01}
                          min={0.04}
                          max={0.35}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v)) {
                              patch({ fitWindowPhase: Math.min(Math.max(v, 0.04), 0.35), fitResult: null });
                            }
                          }}
                        />
                        <span className="param-unit">phase</span>
                      </label>
                    </div>
                    <button
                      className="btn-sm"
                      type="button"
                      onClick={() => {
                        patch({
                          foldPeriod: target.period_days ?? result?.light_curve.period_days ?? null,
                          foldT0: 0,
                          foldT0Auto: true,
                          fitWindowPhase: 0.12,
                          fitResult: null,
                        });
                      }}
                    >
                       {lang === 'ko' ? 'Transit 중심으로 초기화' : 'Reset To Transit Center'}
                    </button>
                  </>
                ) : (
                  <p className="hint" style={{ marginBottom: 12 }}>
                     {lang === 'ko'
                       ? '알려진 공전 주기가 없어 phase-fold 적합을 사용할 수 없습니다.'
                       : 'No known period is available, so phase-fold fitting cannot be used.'}
                  </p>
                )}
              </>
            ) : (
              <p className="hint" style={{ marginBottom: 12 }}>
                 {lang === 'ko'
                   ? 'Step 4 ROI를 BTJD 시간축 그대로 적합합니다. 여러 transit가 포함되어도 원래 시간 간격을 유지합니다.'
                   : 'Fit the Step 4 ROI on the original BTJD axis. If it contains multiple transits, their original time spacing is preserved.'}
              </p>
            )}
            <div className="transit-callout" style={{ marginTop: 12 }}>
               {lang === 'ko'
                 ? 'Step 5는 Step 4에서 고른 동일한 ROI 데이터만 사용합니다. 적합에 들어가는 cadence는 유지하고 화면의 X/Y축 표현만 바꿀 수 있습니다.'
                 : 'Step 5 always uses the same ROI samples selected in Step 4. Axis remapping changes only the display, not the cadences used in the fit.'}
            </div>
            {fitDataSource === 'phase_fold' && hasResolvedBjdWindow && (
              <div className="transit-callout" style={{ marginTop: 12 }}>
                 {lang === 'ko'
                   ? `Phase-fold 미리보기의 기본 T₀는 ROI 중앙이 아니라 dip 중심 추정치(${phaseFoldReferenceT0.toFixed(6)})입니다. 필요하면 직접 수정할 수 있습니다.`
                   : `The default T₀ for the phase-fold preview is the estimated dip center (${phaseFoldReferenceT0.toFixed(6)}), not the ROI midpoint. You can edit it directly.`}
              </div>
            )}
            {fitResult && (
              <div className="transit-config-summary" style={{ marginTop: 12 }}>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '자료' : 'Source'}</span>
                  <span>{fitSourceLabel}</span>
                </div>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '적합 T₀' : 'Fitted T₀'}</span>
                  <span>{fitResult.t0.toFixed(6)}</span>
                </div>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '모델' : 'Model'}</span>
                  <span>{fitResult.used_batman ? 'batman integrated transit' : 'Unavailable'}</span>
                </div>
                {fitDataSource === 'bjd_window' && resolvedBjdWindow && (
                  <div className="transit-config-row">
                    <span>BJD Window</span>
                    <span>
                      {resolvedBjdWindow.start.toFixed(4)} - {resolvedBjdWindow.end.toFixed(4)}
                    </span>
                  </div>
                )}
                <div className="transit-config-row">
                  <span>Rp/R*</span>
                  <span>{fitResult.fitted_params.rp_rs.toFixed(5)} ± {fitResult.fitted_params.rp_rs_err.toFixed(5)}</span>
                </div>
                <div className="transit-config-row">
                  <span>a/R*</span>
                  <span>{fitResult.fitted_params.a_rs.toFixed(2)} ± {fitResult.fitted_params.a_rs_err.toFixed(2)}</span>
                </div>
                <div className="transit-config-row">
                  <span>i</span>
                  <span>{fitResult.fitted_params.inclination.toFixed(2)}° ± {fitResult.fitted_params.inclination_err.toFixed(2)}°</span>
                </div>
                <div className="transit-config-row">
                  <span>u₁</span>
                  <span>{fitResult.fitted_params.u1.toFixed(3)} ± {fitResult.fitted_params.u1_err.toFixed(3)}</span>
                </div>
                <div className="transit-config-row">
                  <span>u₂</span>
                  <span>{fitResult.fitted_params.u2.toFixed(3)} ± {fitResult.fitted_params.u2_err.toFixed(3)}</span>
                </div>
                <div className="transit-config-row">
                  <span>χ²_red</span>
                  <span>{fitResult.fitted_params.reduced_chi_squared.toFixed(3)}</span>
                </div>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '해석 주의' : 'Note'}</span>
                  <span>
                    {lang === 'ko'
                      ? '이 분석에서는 보통 Rp/R*가 a/R* 또는 i보다 안정적으로 추정됩니다.'
                      : 'Rp/R* is usually more reliable than a/R* or i here.'}
                  </span>
                </div>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '사용 데이터 수' : 'Points'}</span>
                  <span>
                    {fitResult.preprocessing.retained_points}
                    {fitResult.preprocessing.clipped_points > 0
                      ? ` (${fitResult.preprocessing.clipped_points} clipped)`
                      : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'record' && (
          <div className="transit-controls-card">
            <h4>{lang === 'ko' ? '분석 기록 보관' : 'Archive Record'}</h4>
            <p className="hint">
              {lang === 'ko'
                ? '이번 분석과 해석을 학습 기록으로 저장합니다. 저장한 결과는 나중에 내 분석 기록에서 다시 확인할 수 있습니다.'
                : 'Save this run as a learning record for later review in My Analyses.'}
            </p>
            {!user && (
              <div className="transit-callout" style={{ marginTop: 12 }}>
                {lang === 'ko'
                  ? '이 분석을 내 기록에 저장하려면 Google로 로그인하세요.'
                  : 'Sign in with Google to submit this analysis to your archive history.'}
              </div>
            )}
            {submittedRecord ? (
              <div className="transit-config-summary" style={{ marginTop: 12 }}>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '제출 기록' : 'Submission'}</span>
                  <span>#{submittedRecord.submission_id}</span>
                </div>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '저장 위치' : 'Saved To'}</span>
                  <span>{submittedRecord.export_path}</span>
                </div>
                {seedRecordSummary && (
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '초안 원본' : 'Draft Seed'}</span>
                    <span>{lang === 'ko' ? '기록' : 'Record'} #{seedRecordSummary.submission_id}</span>
                  </div>
                )}
              </div>
            ) : seedRecordSummary ? (
              <div className="transit-config-summary" style={{ marginTop: 12 }}>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '초안 원본' : 'Draft Seed'}</span>
                  <span>{lang === 'ko' ? '기록' : 'Record'} #{seedRecordSummary.submission_id}</span>
                </div>
              </div>
            ) : (
              <div className="transit-config-summary" style={{ marginTop: 12 }}>
                <div className="transit-config-row">
                  <span>{lang === 'ko' ? '대상' : 'Target'}</span>
                  <span>{target.name}</span>
                </div>
                {result && (
                  <div className="transit-config-row">
                    <span>{lang === 'ko' ? '프레임' : 'Frames'}</span>
                    <span>{result.frame_count.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* ===== MAIN PANEL ===== */}
      <div className="lab-results transit-results">
        {/* Analysis sub-steps. Rendered inside the block's Step 4 panel, so it is
            deliberately subordinate to the block stepper: no numbers (they would
            collide with the block's 4/5/6) and dots instead of numbered circles. */}
        <span className="lab-substepper-kicker">
          {lang === 'ko' ? '정밀 분석 단계 — Step 4 안에서 진행' : 'Analysis sub-steps — within Step 4'}
        </span>
        <div className="transit-step-indicator lab-substepper">
          {STEPS.map((item, index) => {
            const state = getStepState(item.id);
            const isActive = step === item.id;
            return (
              <div key={item.id} className="transit-step-indicator-item">
                {index > 0 && (
                  <div
                    className={`transit-step-connector ${
                      state === 'completed' || (state === 'accessible' && !isActive)
                        ? 'completed'
                        : getStepState(STEPS[index - 1].id) === 'completed'
                          ? 'active'
                          : ''
                    }`}
                  />
                )}
                <button
                  className={`transit-step-circle ${state} ${isActive ? 'current' : ''}`}
                  disabled={state === 'locked'}
                  onClick={() => handleStepClick(item.id)}
                  title={item.label[lang]}
                  aria-label={item.label[lang]}
                />
                <span
                  className={`transit-step-label ${isActive ? 'current' : ''} ${
                    state === 'locked' ? 'locked' : ''
                  }`}
                >
                  {item.label[lang]}
                </span>
              </div>
            );
          })}
        </div>

        {errorMessage && <div className="transit-callout error-text">{errorMessage}</div>}

        {step !== 'select' && blockingPreviewLoadCard}

        {/* STEP 1: Select Stars */}
        {step === 'select' && (
          <div className="transit-panel">
            <div className="transit-panel-header">
              <div>
                <h3>{lang === 'ko' ? '1. 목표별·비교별 선택' : '1. Select Target & Comparison Stars'}</h3>
                <p className="hint">
                  {lang === 'ko'
                    ? '목표별(T, 주황)이 중앙에 표시됩니다. 주변 밝은 별을 눌러 비교성(파랑)을 추가하고, 이미 선택한 별은 드래그해 위치를 미세 조정할 수 있습니다.'
                    : 'The target star (T, orange) is centered. Select nearby bright stars to add comparisons (blue), and drag selected apertures to refine their positions.'}
                </p>
              </div>
              {activeObservation && (
                <div className="transit-observation-meta">
                  <strong>{activeObservation.display_label}</strong>
                  <span>{activeObservation.display_subtitle}</span>
                </div>
              )}
            </div>

            <StepGuide
              step="select"
              initialAnswers={guideAnswersRef.current}
              onAnswersChange={handleGuideAnswers}
              defaultOpen={!isCompactTransitLayout}
              storageKeySuffix={isCompactTransitLayout ? 'mobile' : 'desktop'}
            />

            <div className={`transit-field-size-card ${!preview ? 'transit-field-size-card--empty' : ''}`}>
              <div>
                <strong>{lang === 'ko' ? '시야 크기' : 'Field Size'}</strong>
                {!preview && (
                  <p className="hint" style={{ marginTop: 4, fontSize: 12 }}>
                    {lang === 'ko'
                      ? '시야 크기를 선택하고 불러오기를 눌러 TESS 관측 영상을 확인하세요.'
                      : 'Choose a field size and load the TESS observation.'}
                  </p>
                )}
              </div>
              <div className="transit-field-size-options">
                <select
                  className="transit-field-size-select"
                  value={pendingCutoutSizePx}
                  disabled={previewLoading || framePreviewLoading}
                  onChange={(e) => patch({ pendingCutoutSizePx: Number(e.target.value) })}
                >
                  {CUTOUT_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}px — {((size * 21) / 60).toFixed(1)}'
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={preview ? 'btn-sm' : 'btn-primary'}
                  disabled={previewLoading || framePreviewLoading}
                  onClick={() => patch({ cutoutSizePx: pendingCutoutSizePx })}
                >
                  {previewLoading
                    ? lang === 'ko' ? '불러오는 중…' : 'Loading…'
                    : preview
                      ? lang === 'ko' ? '다시 불러오기' : 'Reload'
                      : lang === 'ko' ? '불러오기' : 'Load'}
                </button>
              </div>
            </div>

            {blockingPreviewLoadCard}

            {preview && (
              <>
                <TransitCutoutViewer
                  preview={preview}
                  displayCutoutSizePx={cutoutSizePx ?? preview.cutout_size_px}
                  stars={starOverlays}
                  showTicMarkers={showTicMarkers}
                  activeFrameIndex={currentFrameIndex}
                  onFrameChange={handleFrameChange}
                  frameChangeDisabled={previewLoading || framePreviewLoading}
                  frameLoading={framePreviewLoading}
                  frameLoadingMessage={previewMessage}
                  onAddComparison={handleAddComparison}
                  onSelectStar={handleSelectStarFromCutout}
                  onMoveStar={handleMoveStar}
                />

                <MobileFoldSection
                  compact={isCompactTransitLayout}
                  title="Cutout details"
                >
                  <div className="transit-summary-grid">
                    <div className="transit-summary-card">
                      <span className="transit-summary-label">Field View</span>
                      <strong>
                        {cutoutSizePx} px / {cutoutArcmin}'
                      </strong>
                    </div>
                    <div className="transit-summary-card">
                      <span className="transit-summary-label">Loaded Cutout</span>
                      <strong>
                        {preview.cutout_size_px} px / {loadedCutoutArcmin}'
                      </strong>
                    </div>
                    <div className="transit-summary-card">
                      <span className="transit-summary-label">Cadences</span>
                      <strong>{preview.frame_count.toLocaleString()}</strong>
                    </div>
                    <div className="transit-summary-card">
                      <span className="transit-summary-label">Preview Frame</span>
                      <strong>
                        {currentFrameIndex !== null
                          ? `${currentFrameIndex + 1} / ${preview.frame_count}`
                          : 'Median'}
                      </strong>
                    </div>
                    <div className="transit-summary-card">
                      <span className="transit-summary-label">Time Span</span>
                      <strong>{(preview.time_end - preview.time_start).toFixed(2)} d</strong>
                    </div>
                  </div>
                </MobileFoldSection>
              </>
            )}

            {!preview && !showBlockingPreviewLoad && (
              <div className="transit-empty-state">
                {cutoutSizePx === null
                  ? lang === 'ko' ? 'TESS cutout을 불러올 시야 크기를 선택하세요.' : 'Choose a field size to load the TESS cutout.'
                  : lang === 'ko' ? '사이드바에서 TESS Sector를 선택해 cutout 영상을 불러오세요.' : 'Select a TESS sector from the sidebar to load a cutout image.'}
              </div>
            )}

            <div className="transit-step-nav">
              <button type="button" className="btn-sm" onClick={handleReset} disabled={!preview}>
                {lang === 'ko' ? '초기화' : 'Reset'}
              </button>
              <div className="transit-step-nav-actions">
                <button type="button" className="btn-primary" disabled={!canGoNext} onClick={handleNext}>
                  {lang === 'ko' ? '다음: 차등측광 실행' : 'Next: Run Photometry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Run Photometry */}
        {step === 'run' && cutoutSizePx !== null && (
          <div className="transit-panel">
            <div className="transit-panel-header">
              <div>
                <h3>{lang === 'ko' ? '2. 차등측광 실행' : '2. Run Differential Photometry'}</h3>
                <p className="hint">
                   {lang === 'ko'
                     ? '각 cadence에서 구경 측광을 수행하고, 목표별 Flux를 합성 비교성 Flux로 나누어 차등 광도곡선을 만듭니다.'
                     : 'Aperture photometry is performed on every cadence. The target flux is divided by the combined comparison flux to produce a differential light curve.'}{' '}
                   (F<sub>target</sub> / F<sub>comp</sub>)
                </p>
              </div>
              {activeObservation && (
                <div className="transit-observation-meta">
                  <strong>{activeObservation.display_label}</strong>
                  <span>{activeObservation.display_subtitle}</span>
                </div>
              )}
            </div>

            <StepGuide
              step="run"
              initialAnswers={guideAnswersRef.current}
              onAnswersChange={handleGuideAnswers}
              defaultOpen={!isCompactTransitLayout}
              storageKeySuffix={isCompactTransitLayout ? 'mobile' : 'desktop'}
            />

            {effectiveTargetPosition ? (
              <>
                <MobileFoldSection
                  compact={isCompactTransitLayout}
                   title={lang === 'ko' ? '측광 입력값' : 'Photometry inputs'}
                >
                  <div className="transit-summary-grid">
                    <div className="transit-summary-card">
                       <span className="transit-summary-label">{lang === 'ko' ? '목표별' : 'Target'}</span>
                      <strong>
                        ({effectiveTargetPosition.x.toFixed(1)},{' '}
                        {effectiveTargetPosition.y.toFixed(1)})
                      </strong>
                    </div>
                    <div className="transit-summary-card">
                       <span className="transit-summary-label">{lang === 'ko' ? '비교성' : 'Comparisons'}</span>
                      <strong>{comparisonStars.length}</strong>
                    </div>
                    <div className="transit-summary-card">
                       <span className="transit-summary-label">{lang === 'ko' ? '시야' : 'Field'}</span>
                      <strong>{cutoutSizePx} px</strong>
                    </div>
                    <div className="transit-summary-card">
                      <span className="transit-summary-label">Cadences</span>
                      <strong>
                        {(preview?.frame_count ?? activeObservation?.frame_count ?? 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </MobileFoldSection>

                {showRunProgress && (
                  <div className="transit-progress-wrapper">
                    <div className="transit-progress-bar">
                      <div
                        className={`transit-progress-fill ${progress >= 100 ? 'done' : ''}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="transit-progress-label">
                      {progress >= 100
                         ? lang === 'ko' ? '완료' : 'Complete'
                        : running
                          ? `${Math.round(progress)}% — ${
                               runProgressEvent?.message ?? (lang === 'ko' ? '차등측광 실행 중...' : 'Running transit photometry...')
                            }`
                          : `${Math.round(progress)}%`}
                    </span>
                  </div>
                )}

                {result && (
                  <div className="transit-run-done">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green, #4ade80)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>
                       {lang === 'ko' ? '측광 완료' : 'Photometry complete'} —{' '}
                       {result.frame_count.toLocaleString()} {lang === 'ko' ? '프레임 처리됨' : 'frames processed'}.
                    </span>
                  </div>
                )}

                <div className="transit-run-actions">
                  {!running && !result && (
                    <button type="button" className="btn-primary" onClick={handleRunPhotometry}>
                       {lang === 'ko' ? '측광 실행' : 'Run Photometry'}
                    </button>
                  )}
                  {running && (
                    <button type="button" className="btn-danger" onClick={handleStop}>
                       {lang === 'ko' ? '중지' : 'Stop'}
                    </button>
                  )}
                  {result && !running && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        patch({ result: null, progress: 0, runProgressEvent: null });
                        handleRunPhotometry();
                      }}
                    >
                       {lang === 'ko' ? '다시 실행' : 'Re-run'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="transit-empty-state">
                {previewLoading
                   ? lang === 'ko' ? 'Step 1 cutout과 목표별 위치를 복원하는 중...' : 'Restoring the Step 1 cutout and target position...'
                   : lang === 'ko' ? 'Step 1 cutout 정보가 없습니다. Step 1로 돌아가 영상을 다시 불러오세요.' : 'Missing Step 1 cutout context. Go back to Step 1 and reload the cutout before running photometry.'}
              </div>
            )}

            <div className="transit-step-nav">
              <button type="button" className="btn-sm" onClick={handleReset}>
                 {lang === 'ko' ? '초기화' : 'Reset'}
              </button>
              <div className="transit-step-nav-actions">
                <button type="button" className="btn-sm" onClick={handlePrevious}>
                   {lang === 'ko' ? '이전' : 'Previous'}
                </button>
                <button type="button" className="btn-primary" disabled={!canGoNext} onClick={handleNext}>
                   {lang === 'ko' ? '다음: 비교성 품질 점검' : 'Next: Comparison QC'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Comparison QC */}
        {step === 'comparisonqc' && (result || running) && (
          <>
            <div className="transit-panel">
              <div className="transit-panel-header">
                <div>
                  <h3>{lang === 'ko' ? `3. 비교별 품질 점검 — ${target.name}` : `3. Comparison QC — ${target.name}`}</h3>
                  <p className="hint">
                    {lang === 'ko'
                      ? '각 목표별/비교성 쌍을 점검하고 품질이 떨어지는 별은 제외한 뒤 ensemble 측광을 다시 계산하세요.'
                      : 'Inspect each target/comparison pair, exclude poor-quality stars, and rebuild the ensemble photometry.'}
                  </p>
                </div>
              </div>

              <StepGuide
                step="comparisonqc"
                initialAnswers={guideAnswersRef.current}
              onAnswersChange={handleGuideAnswers}
                defaultOpen={!isCompactTransitLayout}
                storageKeySuffix={isCompactTransitLayout ? 'mobile' : 'desktop'}
              />

              {running && (
                <div className="transit-progress-card" style={{ marginBottom: 16 }}>
                  <div className="transit-progress-head">
                    <strong>
                      {lang === 'ko' ? '선택한 비교성으로 측광 재실행 중' : 'Re-running photometry with QC selection'}
                    </strong>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="transit-progress-bar">
                    <div
                      className={`transit-progress-fill ${progress >= 100 ? 'done' : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="transit-progress-label">
                    {runProgressEvent?.message ?? (lang === 'ko' ? '비교성 ensemble 재구성 중...' : 'Rebuilding the comparison ensemble...')}
                  </p>
                </div>
              )}

              {result ? (
                <>
                  <MobileFoldSection
                    compact={isCompactTransitLayout}
                    title={lang === 'ko' ? '품질 점검 개요' : 'QC overview'}
                  >
                    <div className="transit-summary-grid">
                      <div className="transit-summary-card">
                        <span className="transit-summary-label">{lang === 'ko' ? '후보' : 'Candidates'}</span>
                        <strong>{comparisonDiagnostics.length}</strong>
                      </div>
                      <div className="transit-summary-card">
                        <span className="transit-summary-label">{lang === 'ko' ? '포함' : 'Included'}</span>
                        <strong>{qcIncludedDiagnostics.length}</strong>
                      </div>
                      <div className="transit-summary-card">
                        <span className="transit-summary-label">{lang === 'ko' ? '제외' : 'Excluded'}</span>
                        <strong>{qcExcludedCount}</strong>
                      </div>
                      <div className="transit-summary-card">
                        <span className="transit-summary-label">{lang === 'ko' ? '현재 Ensemble' : 'Current Ensemble'}</span>
                        <strong>{result.comparison_count}</strong>
                      </div>
                    </div>
                  </MobileFoldSection>

                  {qcSelectionDirty && (
                    <div className="transit-callout" style={{ marginBottom: 16 }}>
                      {lang === 'ko'
                        ? '비교성 선택이 변경되었습니다. ROI 선택으로 넘어가기 전에 적용하고 차등 광도곡선을 다시 계산하세요.'
                        : 'QC selection changed. Apply QC & Re-run to rebuild the differential light curve before moving on to ROI selection.'}
                    </div>
                  )}

                  {comparisonDiagnostics.length > 0 ? (
                    <>
                      <div className="transit-comparison-diagnostics">
                        {comparisonDiagnostics.map((diagnostic) => {
                          const isActive =
                            diagnostic.label === selectedComparisonDiagnosticData?.label;
                          const isIncluded = qcIncludedComparisonLabels.includes(diagnostic.label);
                          return (
                            <div
                              key={diagnostic.label}
                              className={`transit-comparison-diagnostic-card ${
                                isActive ? 'active' : ''
                              }`}
                            >
                              <div className="transit-comparison-diagnostic-head">
                                <strong>{diagnostic.label}</strong>
                                <span>{(diagnostic.ensemble_weight * 100).toFixed(1)}%</span>
                              </div>
                              <div className="transit-comparison-diagnostic-grid">
                                <span>{lang === 'ko' ? '프레임' : 'Frames'}</span>
                                <span>{diagnostic.valid_frame_count.toLocaleString()}</span>
                                <span>RMS</span>
                                <span>{diagnostic.differential_rms.toFixed(4)}</span>
                                <span>MAD</span>
                                <span>{diagnostic.differential_mad.toFixed(4)}</span>
                                <span>{lang === 'ko' ? 'Flux 중앙값' : 'Median Flux'}</span>
                                <span>{diagnostic.median_flux.toLocaleString()}</span>
                              </div>
                              <div className="transit-toggle-row" style={{ marginTop: 10 }}>
                                <button
                                  type="button"
                                  className={`btn-sm ${isActive ? 'active' : ''}`}
                                  onClick={() => patch({ selectedComparisonDiagnostic: diagnostic.label })}
                                >
                                  {lang === 'ko' ? '확인' : 'Inspect'}
                                </button>
                                <button
                                  type="button"
                                  className={`btn-sm ${isIncluded ? 'active' : ''}`}
                                  onClick={() => handleToggleQcComparison(diagnostic.label)}
                                >
                                  {isIncluded
                                    ? lang === 'ko' ? '포함' : 'Included'
                                    : lang === 'ko' ? '제외' : 'Excluded'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {selectedComparisonDiagnosticData && (
                        <>
                          <MobileFoldSection
                            compact={isCompactTransitLayout}
                            title={`${lang === 'ko' ? '선택한 쌍' : 'Selected pair'}: ${selectedComparisonDiagnosticData.label}`}
                          >
                            <div className="transit-summary-grid">
                              <div className="transit-summary-card">
                                <span className="transit-summary-label">{lang === 'ko' ? '선택한 쌍' : 'Selected Pair'}</span>
                                <strong>T / {selectedComparisonDiagnosticData.label}</strong>
                              </div>
                              <div className="transit-summary-card">
                                <span className="transit-summary-label">{lang === 'ko' ? '상태' : 'Status'}</span>
                                <strong>
                                  {qcIncludedComparisonLabels.includes(
                                    selectedComparisonDiagnosticData.label
                                  )
                                     ? lang === 'ko' ? '포함' : 'Included'
                                     : lang === 'ko' ? '제외' : 'Excluded'}
                                </strong>
                              </div>
                              <div className="transit-summary-card">
                                <span className="transit-summary-label">Pair RMS</span>
                                <strong>
                                  {selectedComparisonDiagnosticData.differential_rms.toFixed(4)}
                                </strong>
                              </div>
                              <div className="transit-summary-card">
                                <span className="transit-summary-label">Pair MAD</span>
                                <strong>
                                  {selectedComparisonDiagnosticData.differential_mad.toFixed(4)}
                                </strong>
                              </div>
                            </div>
                          </MobileFoldSection>

                          <LightCurvePlot
                            data={selectedComparisonDiagnosticData.light_curve}
                            targetName={`${target.name} vs ${selectedComparisonDiagnosticData.label}`}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <div className="transit-empty-state">
                       {lang === 'ko'
                         ? '이번 측광 결과에는 비교성 진단 자료가 없습니다.'
                         : 'Comparison diagnostics are not available for this photometry run.'}
                    </div>
                  )}
                </>
              ) : !running ? (
                <div className="transit-empty-state">
                   {lang === 'ko'
                     ? '이번 측광 결과에는 비교성 진단 자료가 없습니다.'
                     : 'Comparison diagnostics are not available for this photometry run.'}
                </div>
              ) : null}

              <div className="transit-run-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="btn-sm"
                  onClick={handleSelectAllQcComparisons}
                  disabled={comparisonDiagnostics.length === 0 || running}
                >
                   {lang === 'ko' ? '전체 선택' : 'Select All'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    void handleApplyComparisonQc();
                  }}
                  disabled={!qcCanApply}
                >
                   {lang === 'ko' ? '품질 선택 적용 후 재실행' : 'Apply QC & Re-run'}
                </button>
              </div>
            </div>

            <div className="transit-step-nav">
              <button type="button" className="btn-sm" onClick={handleReset}>
                 {lang === 'ko' ? '초기화' : 'Reset'}
              </button>
              <div className="transit-step-nav-actions">
                <button type="button" className="btn-sm" onClick={handlePrevious}>
                   {lang === 'ko' ? '이전' : 'Previous'}
                </button>
                <button type="button" className="btn-primary" disabled={!canGoNext} onClick={handleNext}>
                   {lang === 'ko' ? '다음: 광도곡선' : 'Next: Light Curve'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* STEP 4: Light Curve */}
        {step === 'lightcurve' && result && (
          <>
            <div className="transit-panel">
              <div className="transit-panel-header">
                <div>
                  <h3>{lang === 'ko' ? `4. 차등 광도곡선과 분석 구간 — ${target.name}` : `4. Differential Light Curve & ROI — ${target.name}`}</h3>
                  <p className="hint">
                    Sector {result.sector} &middot;{' '}
                    F<sub>target</sub> / F<sub>comp</sub>, normalized to unity.
                    {target.period_days
                      ? ` Known period: ${target.period_days} d.`
                      : ''}
                  </p>
                </div>
              </div>

              <StepGuide
                step="lightcurve"
                initialAnswers={guideAnswersRef.current}
              onAnswersChange={handleGuideAnswers}
                defaultOpen={!isCompactTransitLayout}
                storageKeySuffix={isCompactTransitLayout ? 'mobile' : 'desktop'}
              />

              <MobileFoldSection
                compact={isCompactTransitLayout}
                title="Light curve stats"
              >
                <div className="transit-summary-grid">
                  <div className="transit-summary-card">
                    <span className="transit-summary-label">Frames</span>
                    <strong>{result.frame_count.toLocaleString()}</strong>
                  </div>
                  <div className="transit-summary-card">
                    <span className="transit-summary-label">Comparisons</span>
                    <strong>{result.comparison_count}</strong>
                  </div>
                  <div className="transit-summary-card">
                    <span className="transit-summary-label">Median Target</span>
                    <strong>{result.target_median_flux.toLocaleString()}</strong>
                  </div>
                  <div className="transit-summary-card">
                    <span className="transit-summary-label">Median Comp</span>
                    <strong>{result.comparison_median_flux.toLocaleString()}</strong>
                  </div>
                </div>
              </MobileFoldSection>
            </div>

            <LightCurvePlot
              data={result.light_curve}
              targetName={target.name}
              highlightRange={resolvedBjdWindow}
              enableRangeSelection
              onSelectRange={(range) => {
                patch({ bjdWindowStart: range.start, bjdWindowEnd: range.end, fitResult: null });
              }}
            />

            <div className="transit-step-nav">
              <button type="button" className="btn-sm" onClick={handleReset}>
                 {lang === 'ko' ? '초기화' : 'Reset'}
              </button>
              <div className="transit-step-nav-actions">
                <button type="button" className="btn-sm" onClick={handlePrevious}>
                   {lang === 'ko' ? '이전' : 'Previous'}
                </button>
                <button type="button" className="btn-primary" disabled={!canGoNext} onClick={handleNext}>
                   {lang === 'ko' ? '다음: 식현상 모델 적합' : 'Next: Transit Fit'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* STEP 5: Transit Fit */}
        {step === 'transitfit' && result && (
          <>
            <div className="transit-panel">
              <div className="transit-panel-header">
                <div>
                  <h3>{lang === 'ko' ? `5. 식현상 모델 적합 (Transit Model Fit) — ${target.name}` : `5. Transit Model Fit — ${target.name}`}</h3>
                  <p className="hint">
                    {fitDataSource === 'phase_fold'
                      ? lang === 'ko'
                        ? 'Step 4 ROI를 위상으로 접은 뒤 해당 구간에 모델을 적합합니다.'
                        : 'Phase-fold the Step 4 ROI and fit that folded segment.'
                      : lang === 'ko'
                        ? 'Step 4 ROI의 시간축을 유지한 채 식현상 모델을 적합합니다.'
                        : 'Fit a transit model on the Step 4 ROI without folding the time axis.'}
                    {fitReferencePeriod && ` P = ${fitReferencePeriod} d`}
                    {fitDataSource === 'phase_fold' ? `, T₀ = ${phaseFoldReferenceT0} d` : ''}
                  </p>
                </div>
              </div>

              <StepGuide
                step="transitfit"
                initialAnswers={guideAnswersRef.current}
              onAnswersChange={handleGuideAnswers}
                defaultOpen={!isCompactTransitLayout}
                storageKeySuffix={isCompactTransitLayout ? 'mobile' : 'desktop'}
              />

              <div className="transit-callout">
                {lang === 'ko'
                  ? '검은 점은 모델 적합에 사용된 실제 데이터이고, 빨간 선은 최적 적합 모델입니다. 사이드바에서 적합을 다시 실행하지 않고 X/Y축 표현을 바꿀 수 있습니다.'
                  : 'Black points are the exact samples used in the fit. Red is the best-fit transit model for those samples. The X/Y axes can be remapped without rerunning the fit.'}
              </div>

              {fitDataSource === 'phase_fold' && !fitReferencePeriod && (
                <div className="transit-callout">
                  {lang === 'ko'
                    ? 'Phase-fold 광도곡선을 적합하려면 알려진 공전 주기가 필요합니다.'
                    : 'A known orbital period is required to fit the phase-folded curve.'}
                </div>
              )}

              {!hasResolvedBjdWindow && (
                <div className="transit-callout">
                  {lang === 'ko'
                    ? 'Step 4에서 먼저 BJD transit 구간을 정해야 Step 5 모델 적합을 실행할 수 있습니다.'
                    : 'Define a BJD transit interval in Step 4 before running the Step 5 fit.'}
                </div>
              )}

              {fitDataSource === 'bjd_window' && !hasResolvedBjdWindow && (
                <div className="transit-callout">
                  {lang === 'ko'
                    ? '적합 전에 유효한 BJD 시작과 끝 시간을 정하세요. 선택한 구간은 Step 4 광도곡선에 강조 표시됩니다.'
                    : 'Define a valid BJD start and end time before fitting. The selected window is highlighted on the Step 4 BJD light curve.'}
                </div>
              )}

              {hasResolvedBjdWindow && fitWindowPointCount > 0 && fitWindowPointCount < 20 && (
                <div className="transit-callout">
                  {lang === 'ko'
                    ? `현재 Step 4 ROI에는 ${fitWindowPointCount}개 데이터만 있습니다. 더 넓은 BJD 구간을 선택하세요.`
                    : `The Step 4 ROI currently contains only ${fitWindowPointCount} points. Select a wider BJD window before fitting.`}
                </div>
              )}

              {fitDataSource === 'bjd_window' && canFitWithBjdWindow && !fitReferencePeriod && (
                <div className="transit-callout">
                  {lang === 'ko'
                    ? 'BJD 구간만 적합하더라도 식현상 모델 계산에는 알려진 공전 주기가 필요합니다.'
                    : 'A known period is still required to evaluate the transit model, even when fitting only a BJD window.'}
                </div>
              )}

              {canPreviewTransitFit && (
                <div className="transit-panel" style={{ marginBottom: 16 }}>
                  <LightCurvePlot
                    data={fitDisplayLightCurve}
                    targetName={target.name}
                    overlayCurve={fitPreviewOverlay}
                    residualCurve={fitPreviewResiduals}
                    analystLabel={user?.email ?? null}
                    variant={activeFitPreviewResult ? 'fit-preview' : 'default'}
                  />
                </div>
              )}

              {learningMode === 'advanced' && (fitDebugRequest || fitResult || fitDebugLog.length > 0) && (
                <details className="transit-panel" style={{ marginBottom: 16 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
                    {lang === 'ko' ? 'Step 5 상세 실행 정보' : 'Step 5 Debug'}
                  </summary>
                  <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
                    {lang === 'ko'
                      ? 'Step 5가 backend에 전달한 ROI와 파라미터, 반환된 결과를 그대로 보여줍니다.'
                      : 'Shows the ROI and parameters sent to the backend and the response returned by the fit.'}
                  </p>

                  {fitDebugRequest && (
                    <div className="transit-config-summary" style={{ marginBottom: 12 }}>
                      <div className="transit-config-row">
                        <span>Request Mode</span>
                        <span>{fitDebugRequest.fitMode}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Request Period</span>
                        <span>{fitDebugRequest.period.toFixed(6)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Request T₀</span>
                        <span>{fitDebugRequest.t0.toFixed(6)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Request Filter</span>
                        <span>{fitDebugRequest.filterName ?? 'unknown'}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Stellar Params</span>
                        <span>
                          {fitDebugRequest.stellarTemperature !== null &&
                          fitDebugRequest.stellarLogg !== null
                            ? `Teff ${fitDebugRequest.stellarTemperature.toFixed(0)} / logg ${fitDebugRequest.stellarLogg.toFixed(2)} / [Fe/H] ${(
                                fitDebugRequest.stellarMetallicity ?? 0
                              ).toFixed(2)}`
                            : 'unavailable'}
                        </span>
                      </div>
                      <div className="transit-config-row">
                        <span>ROI Points</span>
                        <span>{fitDebugRequest.roiPointCount}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>ROI Time</span>
                        <span>
                          {fitDebugRequest.roiTimeMin !== null && fitDebugRequest.roiTimeMax !== null
                            ? `${fitDebugRequest.roiTimeMin.toFixed(6)} - ${fitDebugRequest.roiTimeMax.toFixed(6)}`
                            : 'n/a'}
                        </span>
                      </div>
                      <div className="transit-config-row">
                        <span>ROI Flux</span>
                        <span>
                          {fitDebugRequest.roiFluxMin !== null && fitDebugRequest.roiFluxMax !== null
                            ? `${fitDebugRequest.roiFluxMin.toFixed(6)} - ${fitDebugRequest.roiFluxMax.toFixed(6)}`
                            : 'n/a'}
                        </span>
                      </div>
                      <div className="transit-config-row">
                        <span>ROI Error</span>
                        <span>
                          {fitDebugRequest.roiErrorMin !== null && fitDebugRequest.roiErrorMax !== null
                            ? `${fitDebugRequest.roiErrorMin.toFixed(6)} - ${fitDebugRequest.roiErrorMax.toFixed(6)}`
                            : 'n/a'}
                        </span>
                      </div>
                      <div className="transit-config-row">
                        <span>fit_window_phase</span>
                        <span>{fitDebugRequest.requestedFitWindowPhase.toFixed(4)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>baseline_order</span>
                        <span>{fitDebugRequest.baselineOrder}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>sigma_clip</span>
                        <span>
                          {fitDebugRequest.sigmaClipSigma.toFixed(2)} / {fitDebugRequest.sigmaClipIterations}
                        </span>
                      </div>
                    </div>
                  )}

                  {fitResult && (
                    <div className="transit-config-summary" style={{ marginBottom: 12 }}>
                      <div className="transit-config-row">
                        <span>Response T₀</span>
                        <span>{fitResult.t0.toFixed(6)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Reference T₀</span>
                        <span>{fitResult.reference_t0.toFixed(6)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Returned Mode</span>
                        <span>{fitResult.preprocessing.fit_mode}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>LD Source</span>
                        <span>
                          {fitResult.limb_darkening_source ??
                            fitResult.preprocessing.limb_darkening_source ??
                            'unknown'}
                          {(fitResult.limb_darkening_filter ??
                            fitResult.preprocessing.limb_darkening_filter) &&
                            ` · ${
                              fitResult.limb_darkening_filter ??
                              fitResult.preprocessing.limb_darkening_filter
                            }`}
                        </span>
                      </div>
                      <div className="transit-config-row">
                        <span>Retained Points</span>
                        <span>{fitResult.preprocessing.retained_points}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Rp/R*</span>
                        <span>{fitResult.fitted_params.rp_rs.toFixed(5)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>a/R*</span>
                        <span>{fitResult.fitted_params.a_rs.toFixed(2)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Inclination</span>
                        <span>{fitResult.fitted_params.inclination.toFixed(2)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>χ²_red</span>
                        <span>{fitResult.fitted_params.reduced_chi_squared.toFixed(3)}</span>
                      </div>
                      <div className="transit-config-row">
                        <span>Model Flux</span>
                        <span>
                          {fitResultModelFlux.length > 0
                            ? `${Math.min(...fitResultModelFlux).toFixed(6)} - ${Math.max(...fitResultModelFlux).toFixed(6)}`
                            : 'n/a'}
                        </span>
                      </div>
                      <div className="transit-config-row">
                        <span>Residual RMS</span>
                        <span>{fitResidualRms !== null ? fitResidualRms.toFixed(6) : 'n/a'}</span>
                      </div>
                    </div>
                  )}

                  {fitDebugLog.length > 0 && (
                    <pre
                      style={{
                        margin: 0,
                        padding: 12,
                        background: '#111',
                        color: '#d6e2ff',
                        borderRadius: 8,
                        overflowX: 'auto',
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {fitDebugLog.join('\n')}
                    </pre>
                  )}
                </details>
              )}

              {fitDataSource === 'bjd_window' && resolvedBjdWindow && (
                <div className="transit-config-summary" style={{ marginBottom: 12 }}>
                  <div className="transit-config-row">
                    <span>Fit Source</span>
                    <span>BJD Window</span>
                  </div>
                  <div className="transit-config-row">
                    <span>Window</span>
                    <span>
                      {resolvedBjdWindow.start.toFixed(4)} - {resolvedBjdWindow.end.toFixed(4)}
                    </span>
                  </div>
                  <div className="transit-config-row">
                    <span>Width</span>
                    <span>{(resolvedBjdWindow.end - resolvedBjdWindow.start).toFixed(4)} d</span>
                  </div>
                </div>
              )}

              {fitDataSource === 'phase_fold' && fitReferencePeriod && (
                <div className="transit-config-summary" style={{ marginBottom: 12 }}>
                  <div className="transit-config-row">
                    <span>Fit Source</span>
                    <span>Phase Fold</span>
                  </div>
                  <div className="transit-config-row">
                    <span>Period</span>
                    <span>{(foldPeriod ?? fitReferencePeriod).toFixed(6)} d</span>
                  </div>
                  <div className="transit-config-row">
                    <span>T₀</span>
                    <span>{phaseFoldReferenceT0.toFixed(6)} d</span>
                  </div>
                </div>
              )}

              {canRunTransitFit && !fitResult && !fitting && (
                <div className="transit-fit-method">
                  <label className="transit-fit-method-label" htmlFor="transit-fit-method-select">
                    {lang === 'ko' ? '적합 방법' : 'Fit method'}
                  </label>
                  <select
                    id="transit-fit-method-select"
                    className="transit-field-size-select"
                    value={refineMcmc ? 'mcmc' : 'lsq'}
                    onChange={(e) => setRefineMcmc(e.target.value === 'mcmc')}
                  >
                    <option value="lsq">
                      {lang === 'ko'
                        ? '빠른 적합 — 최소제곱 (기본, 수 초)'
                        : 'Fast fit — least squares (default, seconds)'}
                    </option>
                    <option value="mcmc">
                      {lang === 'ko'
                        ? '정밀 적합 — MCMC (느림, 수십 초)'
                        : 'Precise fit — MCMC (slow, tens of seconds)'}
                    </option>
                  </select>
                  <p className="transit-fit-method-help">
                    {lang === 'ko'
                      ? '정밀 적합은 MCMC로 불확도를 더 정교하게 추정하지만 시간이 더 걸립니다.'
                      : 'The precise fit uses MCMC to estimate uncertainties more rigorously, but takes longer.'}
                  </p>
                </div>
              )}

              {canRunTransitFit && !fitResult && !fitting && (
                <div className="transit-run-actions">
                  <button type="button" className="btn-primary" onClick={handleFitTransit}>
                    {lang === 'ko' ? '식현상 모델 적합 실행' : 'Run Transit Fit'}
                  </button>
                </div>
              )}

              {fitting && (
                <div className="transit-progress-card">
                  <div className="transit-progress-head">
                    <strong>{lang === 'ko' ? '식현상 모델 적합 중' : 'Fitting transit model'}</strong>
                    <span>
                      {fitProgress
                        ? `${Math.round((fitProgress.pct ?? 0) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="transit-progress-bar">
                    <div
                      className="transit-progress-fill"
                      style={{ width: `${Math.round((fitProgress?.pct ?? 0) * 100)}%` }}
                    />
                  </div>
                  <p className="transit-progress-label">
                    {!fitProgress || fitProgress.stage === 'init'
                      ? lang === 'ko' ? '자료 준비 중...' : 'Preparing data...'
                        : fitProgress.stage === 'queued'
                          ? fitProgress.message ??
                            (lang === 'ko'
                              ? '다른 분석이 끝나기를 기다리는 중...'
                              : 'Waiting for another analysis to finish...')
                        : fitProgress.stage === 'phase_fold'
                          ? fitDataSource === 'bjd_window'
                            ? lang === 'ko' ? 'BJD 구간을 선택하고 transit 중심을 맞추는 중...' : 'Selecting BJD window and aligning the transit center...'
                            : lang === 'ko' ? '위상 접기와 dip 탐지 중...' : 'Phase folding & dip detection...'
                        : fitProgress.stage === 'preprocess'
                           ? lang === 'ko' ? 'Step 4 ROI 정규화와 모델 준비 중...' : 'Normalizing the Step 4 ROI and preparing the model...'
                        : fitProgress.stage === 'least_squares'
                           ? lang === 'ko' ? '초기 최적화(최소제곱) 중...' : 'Initial optimization (least squares)...'
                          : fitProgress.stage === 'mcmc'
                            ? fitProgress.step && fitProgress.total
                              ? `MCMC sampling — step ${fitProgress.step}/${fitProgress.total}`
                               : lang === 'ko' ? 'MCMC로 사후분포 표본 추출 중...' : 'Sampling posterior with MCMC...'
                             : lang === 'ko' ? '결과 정리 중...' : 'Finalizing results...'}
                  </p>
                </div>
              )}

              {fitResult && (
                <>
                  <div className="transit-callout">
                    {lang === 'ko' ? '사용한 방법' : 'Method used'}: {fitEngineLabel}
                  </div>
                  {fitLimbDarkeningExplanation && (
                    <div className="transit-callout transit-callout-info">
                      {lang === 'ko' ? '주연감광' : 'Limb darkening'}: {fitLimbDarkeningExplanation}
                    </div>
                  )}
                  <div className="transit-callout">
                    {lang === 'ko'
                      ? '적합된 식현상 모델이 현재 Step 5 ROI 그래프에 직접 표시됩니다.'
                      : 'The fitted transit model is drawn directly on the current Step 5 ROI view.'}
                  </div>
                  <div className="transit-config-summary">
                    <div className="transit-config-row">
                       <span>{lang === 'ko' ? '적합 자료' : 'Fit Source'}</span>
                      <span>
                        {fitResult.preprocessing.fit_mode === 'bjd_window'
                          ? 'BJD Window'
                          : 'Phase Fold'}
                      </span>
                    </div>
                    {fitResult.preprocessing.fit_mode === 'bjd_window' &&
                      fitResult.preprocessing.bjd_start !== null &&
                      fitResult.preprocessing.bjd_end !== null && (
                        <div className="transit-config-row">
                          <span>BJD Window</span>
                          <span>
                            {fitResult.preprocessing.bjd_start.toFixed(4)} -{' '}
                            {fitResult.preprocessing.bjd_end.toFixed(4)}
                          </span>
                        </div>
                      )}
                    <div className="transit-config-row">
                       <span>{lang === 'ko' ? '사용 데이터 수' : 'Retained Points'}</span>
                      <span>{fitResult.preprocessing.retained_points}</span>
                    </div>
                  </div>
                  {validationStats && (
                    <TransitValidationStatsPanel stats={validationStats} />
                  )}
                  <div className="transit-run-actions" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => {
                        patch({ fitResult: null });
                        handleFitTransit();
                      }}
                    >
                       {lang === 'ko' ? '다시 적합' : 'Re-fit'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="transit-step-nav">
              <button type="button" className="btn-sm" onClick={handleReset}>
                 {lang === 'ko' ? '초기화' : 'Reset'}
              </button>
              <div className="transit-step-nav-actions">
                <button type="button" className="btn-sm" onClick={handlePrevious}>
                   {lang === 'ko' ? '이전' : 'Previous'}
                </button>
                <button type="button" className="btn-primary" disabled={!canGoNext} onClick={handleNext}>
                   {lang === 'ko' ? '다음: 결과 기록' : 'Next: Record Result'}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'record' && result && (
          <div className="transit-panel">
            <div className="transit-panel-header">
              <div>
                <h3>{lang === 'ko' ? '6. 분석 결과 기록과 해석' : '6. Record This Analysis'}</h3>
                <p className="hint">
                  {lang === 'ko'
                    ? '산출값을 기준값과 비교하고, 차이가 발생한 원인을 자료와 분석 조건을 근거로 설명하세요.'
                    : 'Turn this run into a reusable archive record. Compare the result with reference values and explain the difference with evidence.'}
                </p>
              </div>
            </div>

            <StepGuide
              step="record"
              initialAnswers={guideAnswersRef.current}
              onAnswersChange={handleGuideAnswers}
              defaultOpen={!isCompactTransitLayout}
              storageKeySuffix={isCompactTransitLayout ? 'mobile' : 'desktop'}
            />

            <MobileFoldSection
              compact={isCompactTransitLayout}
              title={lang === 'ko' ? '분석 맥락' : 'Record context'}
            >
              <div className="transit-summary-grid">
                <div className="transit-summary-card">
                  <span className="transit-summary-label">{lang === 'ko' ? '대상' : 'Target'}</span>
                  <strong>{target.name}</strong>
                </div>
                <div className="transit-summary-card">
                  <span className="transit-summary-label">Sector</span>
                  <strong>{result.sector}</strong>
                </div>
                <div className="transit-summary-card">
                  <span className="transit-summary-label">{lang === 'ko' ? '프레임' : 'Frames'}</span>
                  <strong>{result.frame_count.toLocaleString()}</strong>
                </div>
                <div className="transit-summary-card">
                  <span className="transit-summary-label">{lang === 'ko' ? '비교성' : 'Comparisons'}</span>
                  <strong>{result.comparison_count}</strong>
                </div>
              </div>
            </MobileFoldSection>

            {/* Fit result summary in Record step */}
            {fitResult && (
              <MobileFoldSection
                compact={isCompactTransitLayout}
                title={lang === 'ko' ? '식현상 모델 적합 결과' : 'Transit fit summary'}
              >
                <div className="transit-record-fit-summary">
                  <h4>{lang === 'ko' ? '측정 산출값' : 'Transit Fit Result'}</h4>
                  <div className="transit-fit-params-grid">
                    <div className="transit-fit-param-card">
                      <span className="transit-fit-param-label">Rp/R*</span>
                      <strong>{fitResult.fitted_params.rp_rs.toFixed(5)} <span className="transit-fit-param-err">± {fitResult.fitted_params.rp_rs_err.toFixed(5)}</span></strong>
                      <p className="transit-fit-param-desc">
                        Planet-to-star radius ratio. Rp/R* = {fitResult.fitted_params.rp_rs.toFixed(4)} means the planet's
                        radius is about {(fitResult.fitted_params.rp_rs * 100).toFixed(1)}% of the host star,
                        causing a {((fitResult.fitted_params.rp_rs ** 2) * 100).toFixed(2)}% dip in brightness during transit.
                      </p>
                    </div>
                    <div className="transit-fit-param-card">
                      <span className="transit-fit-param-label">a/R*</span>
                      <strong>{fitResult.fitted_params.a_rs.toFixed(2)} <span className="transit-fit-param-err">± {fitResult.fitted_params.a_rs_err.toFixed(2)}</span></strong>
                      <p className="transit-fit-param-desc">
                        Scaled semi-major axis (orbital distance in units of stellar radii).
                        The planet orbits at {fitResult.fitted_params.a_rs.toFixed(1)}x the star's radius from its center.
                        {' '}Compare this value with the transit shape and residuals before interpreting it.
                      </p>
                    </div>
                    <div className="transit-fit-param-card">
                      <span className="transit-fit-param-label">{lang === 'ko' ? '궤도 경사각' : 'Inclination'}</span>
                      <strong>{fitResult.fitted_params.inclination.toFixed(2)}° <span className="transit-fit-param-err">± {fitResult.fitted_params.inclination_err.toFixed(2)}°</span></strong>
                      <p className="transit-fit-param-desc">
                        Orbital inclination relative to our line of sight. 90° = edge-on.
                        {' '}Use the curve shape and parameter uncertainty to decide whether the
                        geometry is well constrained.
                      </p>
                    </div>
                    <div className="transit-fit-param-card">
                      <span className="transit-fit-param-label">{lang === 'ko' ? '공전 주기' : 'Period'}</span>
                      <strong>{fitResult.period.toFixed(6)} d</strong>
                      <p className="transit-fit-param-desc">
                        Orbital period — the planet completes one orbit every {fitResult.period.toFixed(4)} days
                        ({(fitResult.period * 24).toFixed(1)} hours).
                      </p>
                    </div>
                    <div className="transit-fit-param-card">
                      <span className="transit-fit-param-label">{lang === 'ko' ? '주연감광' : 'Limb Darkening'}</span>
                      <strong>u₁ = {fitResult.fitted_params.u1.toFixed(3)}, u₂ = {fitResult.fitted_params.u2.toFixed(3)}</strong>
                      <p className="transit-fit-param-desc">
                        Quadratic limb darkening coefficients describe how the star appears
                        darker at its edges. Affects the transit shape during ingress/egress.
                      </p>
                      {fitLimbDarkeningExplanation && (
                        <p className="transit-fit-param-note">
                          {fitLimbDarkeningExplanation}
                        </p>
                      )}
                    </div>
                    <div className="transit-fit-param-card">
                      <span className="transit-fit-param-label">{lang === 'ko' ? '적합도 지표' : 'Fit Quality'}</span>
                      <strong>χ²_red = {fitResult.fitted_params.reduced_chi_squared.toFixed(3)}</strong>
                      <p className="transit-fit-param-desc">
                        Reduced chi-squared is one diagnostic, not a conclusion. Inspect the residual
                        pattern, retained points, and model assumptions together.
                      </p>
                    </div>
                  </div>
                </div>
              </MobileFoldSection>
            )}

            {fitResult && (
              <MobileFoldSection
                compact={isCompactTransitLayout}
                title={lang === 'ko' ? '측정값과 기준값 비교' : 'Measured vs reference values'}
              >
                <div className="transit-reference-comparison">
                  <div className="transit-reference-head">
                    <div>
                      <span className="record-section-kicker">
                        {lang === 'ko' ? '해석 근거' : 'Interpretation evidence'}
                      </span>
                      <h4>{lang === 'ko' ? 'NASA Exoplanet Archive 기준값과 이번 분석 결과' : 'NASA reference and this analysis'}</h4>
                    </div>
                    <span>
                      {lang === 'ko'
                        ? 'NASA Exoplanet Archive 수록값'
                        : 'NASA Exoplanet Archive catalog values'}
                    </span>
                  </div>
                  <div className="transit-reference-table-wrap">
                    <table className="transit-reference-table">
                      <thead>
                        <tr>
                          <th>{lang === 'ko' ? '산출량' : 'Quantity'}</th>
                          <th>{lang === 'ko' ? '기준값' : 'Reference'}</th>
                          <th>{lang === 'ko' ? '측정값' : 'Measured'}</th>
                          <th>{lang === 'ko' ? '차이' : 'Difference'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{lang === 'ko' ? '식 깊이' : 'Transit depth'}</td>
                          <td>{referenceTransitDepthPct !== null ? `${referenceTransitDepthPct.toFixed(3)}%` : lang === 'ko' ? '자료 없음' : 'Unavailable'}</td>
                          <td>{measuredTransitDepthPct !== null ? `${measuredTransitDepthPct.toFixed(3)}%` : lang === 'ko' ? '자료 없음' : 'Unavailable'}</td>
                          <td>
                            {referenceTransitDepthPct !== null && measuredTransitDepthPct !== null
                              ? `${(measuredTransitDepthPct - referenceTransitDepthPct).toFixed(3)}%p`
                              : lang === 'ko' ? '자료 없음' : 'Unavailable'}
                          </td>
                        </tr>
                        <tr>
                          <td>Rp/R*</td>
                          <td>{referenceRpRs !== null ? referenceRpRs.toFixed(5) : lang === 'ko' ? '자료 없음' : 'Unavailable'}</td>
                          <td>{measuredRpRs !== null ? measuredRpRs.toFixed(5) : lang === 'ko' ? '자료 없음' : 'Unavailable'}</td>
                          <td>{rpRsDifference !== null ? `${rpRsDifference >= 0 ? '+' : ''}${rpRsDifference.toFixed(5)}` : lang === 'ko' ? '자료 없음' : 'Unavailable'}</td>
                        </tr>
                        <tr>
                          <td>{lang === 'ko' ? '공전 주기' : 'Orbital period'}</td>
                          <td>{target.period_days !== null ? `${target.period_days.toFixed(6)} d` : lang === 'ko' ? '자료 없음' : 'Unavailable'}</td>
                          <td>{fitResult.period.toFixed(6)} d</td>
                          <td>{periodDifference !== null ? `${periodDifference >= 0 ? '+' : ''}${periodDifference.toFixed(6)} d` : lang === 'ko' ? '자료 없음' : 'Unavailable'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="transit-reference-note">
                    {lang === 'ko'
                      ? '기준 Rp/R*는 카탈로그 식 깊이에 Rp/R* = √(depth)를 적용한 비교용 추정값입니다. 직접 출판된 반지름비와 동일한 값으로 간주하지 말고, 비교성 품질·별빛 오염·구경·ROI·잡음·모델 가정을 근거로 차이를 설명하세요.'
                      : 'The reference Rp/R* is estimated from the catalog transit depth using Rp/R* = sqrt(depth). It is a comparison benchmark, not a direct published radius-ratio measurement. Explain the difference using comparison-star quality, blending, aperture choice, ROI, noise, and model assumptions.'}
                  </p>
                </div>
              </MobileFoldSection>
            )}

            {validationStats && (
              <MobileFoldSection
                compact={isCompactTransitLayout}
                title={lang === 'ko' ? '검증 통계' : 'Validation statistics'}
              >
                <TransitValidationStatsPanel stats={validationStats} />
              </MobileFoldSection>
            )}

            {!recordTemplate && recordLoading && (
              <div className="transit-empty-state">Loading record form...</div>
            )}

            {recordTemplate && (
              <div className="record-form-shell">
                <div className="record-form-head">
                  <div>
                    <h4>
                      {lang === 'ko' ? '외계행성 식 분석 기록' : recordTemplate.title}
                    </h4>
                    <p className="hint">
                      {lang === 'ko'
                        ? '그래프와 산출값을 근거로 분석 결과, 기준값과의 차이, 후속 탐구 계획을 기록하세요.'
                        : recordTemplate.description}
                    </p>
                  </div>
                  <span className="analysis-launcher-tag">
                    {user
                      ? `${lang === 'ko' ? '로그인' : 'SIGNED IN AS'} ${user.name.toUpperCase()}`
                      : lang === 'ko' ? '저장하려면 로그인 필요' : 'SIGN IN REQUIRED'}
                  </span>
                </div>

                <div className="record-cover-card">
                  <div className="record-cover-head">
                    <div>
                      <span className="record-section-kicker">{lang === 'ko' ? '최종 기록' : 'Submission'}</span>
                      <h4>{lang === 'ko' ? '분석 결과 저장' : 'Save This Transit Analysis'}</h4>
                    </div>
                    <span className="record-required-note">
                      {lang === 'ko' ? '* 필수' : '* Required'}
                    </span>
                  </div>
                  <label className="record-form-field">
                    <span className="record-field-label">
                      {lang === 'ko' ? '저장 기록 제목' : 'Saved Record Title'}
                      <strong className="record-required">*</strong>
                    </span>
                    <input
                      type="text"
                      value={recordTitle}
                      onChange={(event) => patch({ recordTitle: event.target.value })}
                      placeholder={`${target.name} Sector ${result.sector}`}
                    />
                  </label>
                </div>

                <div className="record-form-grid">

                  {recordTemplate.questions.map((question) => {
                    const value = recordAnswers[question.id];
                    const localizedQuestion = localizeRecordQuestion(question, lang);
                    const options = localizedQuestion.options;
                    const requiredMark = question.required ? (
                      <strong className="record-required">*</strong>
                    ) : null;
                    const questionHead = (
                      <div className="record-question-head">
                        <span className="record-field-label">
                          {localizedQuestion.label}
                          {requiredMark}
                        </span>
                        {localizedQuestion.helpText && (
                          <small className="record-question-help">{localizedQuestion.helpText}</small>
                        )}
                      </div>
                    );

                    if (question.type === 'textarea') {
                      return (
                        <label
                          key={question.id}
                          className="record-question-card record-question-card-wide"
                        >
                          {questionHead}
                          <textarea
                            value={typeof value === 'string' ? value : ''}
                            placeholder={localizedQuestion.placeholder}
                            onChange={(event) =>
                              handleRecordAnswerChange(question.id, event.target.value)
                            }
                          />
                        </label>
                      );
                    }

                    if (question.type === 'select') {
                      return (
                        <label key={question.id} className="record-question-card">
                          {questionHead}
                          <select
                            value={typeof value === 'string' ? value : ''}
                            onChange={(event) =>
                              handleRecordAnswerChange(question.id, event.target.value)
                            }
                          >
                            <option value="">{lang === 'ko' ? '선택...' : 'Select...'}</option>
                            {options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    }

                    if (question.type === 'radio') {
                      return (
                        <div
                          key={question.id}
                          className="record-question-card record-question-card-wide"
                        >
                          {questionHead}
                          <div className="record-radio-group">
                            {options.map((option) => (
                              <label key={option.value} className="record-choice-row">
                                <input
                                  type="radio"
                                  name={question.id}
                                  checked={value === option.value}
                                  onChange={() =>
                                    handleRecordAnswerChange(question.id, option.value)
                                  }
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (question.type === 'checkbox') {
                      const selectedValues = Array.isArray(value) ? value : [];
                      return (
                        <div
                          key={question.id}
                          className="record-question-card record-question-card-wide"
                        >
                          {questionHead}
                          <div className="record-checkbox-group">
                            {options.map((option) => {
                              const checked = selectedValues.includes(option.value);
                              return (
                                <label key={option.value} className="record-choice-row">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked
                                        ? selectedValues.filter((item) => item !== option.value)
                                        : [...selectedValues, option.value];
                                      handleRecordAnswerChange(question.id, next);
                                    }}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    if (question.type === 'number') {
                      if (isScoreQuestion(question)) {
                        const min = question.min_value ?? 1;
                        const max = question.max_value ?? 5;
                        return (
                          <div key={question.id} className="record-question-card">
                            {questionHead}
                            <div className="record-score-row">
                              {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(
                                (score) => (
                                  <button
                                    key={score}
                                    type="button"
                                    className={`record-score-pill ${
                                      Number(value) === score ? 'active' : ''
                                    }`}
                                    onClick={() => handleRecordAnswerChange(question.id, score)}
                                  >
                                    {score}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <label key={question.id} className="record-question-card">
                          {questionHead}
                          <input
                            type="number"
                            min={question.min_value ?? undefined}
                            max={question.max_value ?? undefined}
                            step="1"
                            value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                            onChange={(event) =>
                              handleRecordAnswerChange(question.id, event.target.value)
                            }
                          />
                        </label>
                      );
                    }

                    return (
                      <label key={question.id} className="record-question-card">
                        {questionHead}
                        <input
                          type="text"
                          value={typeof value === 'string' ? value : ''}
                          placeholder={localizedQuestion.placeholder}
                          onChange={(event) =>
                            handleRecordAnswerChange(question.id, event.target.value)
                          }
                        />
                      </label>
                    );
                  })}
                </div>

                {submittedRecord && (
                  <div className="transit-run-done transit-record-saved">
                    <div className="transit-record-saved-msg">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green, #4ade80)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>
                        {lang === 'ko'
                          ? `기록 #${submittedRecord.submission_id} 저장 완료`
                          : `Record #${submittedRecord.submission_id} saved.`}
                      </span>
                    </div>
                    <div className="transit-record-saved-actions">
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => { void downloadMyRecordPhotometryCsv(submittedRecord.submission_id); }}
                      >
                        {lang === 'ko' ? 'CSV 내려받기' : 'Download CSV'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="transit-step-nav">
                  <button type="button" className="btn-sm" onClick={handleReset}>
                    {lang === 'ko' ? '초기화' : 'Reset'}
                  </button>
                  <div className="transit-step-nav-actions">
                    <button type="button" className="btn-sm" onClick={handlePrevious}>
                      {lang === 'ko' ? '이전' : 'Previous'}
                    </button>
                    {!user && (
                      <a href="/api/auth/login" className="btn-sm">
                        {lang === 'ko' ? '로그인 후 저장' : 'Sign In to Save'}
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={recordSubmitting || !user}
                      onClick={handleSubmitRecord}
                    >
                      {recordSubmitting
                        ? lang === 'ko' ? '저장 중...' : 'Submitting...'
                        : lang === 'ko' ? '분석 기록 저장' : 'Submit Record'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
