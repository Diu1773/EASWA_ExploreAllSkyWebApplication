import type { TransitComparisonDiagnostic } from '../../types/transit';
import type { TransitFitResponse } from '../../types/transitFit';

export interface TransitValidationStatsInput {
  fitResult: TransitFitResponse;
  referenceDepthPct: number | null;
  referencePeriodDays: number | null;
  comparisonDiagnostics: TransitComparisonDiagnostic[];
}

export interface TransitValidationStats {
  sample: {
    dataPoints: number;
    retainedPoints: number;
    clippedPoints: number;
    clippedFraction: number | null;
    degreesOfFreedom: number;
  };
  residuals: {
    mean: number | null;
    median: number | null;
    rms: number | null;
    sampleStd: number | null;
    mad: number | null;
    p95Abs: number | null;
    normalizedRms: number | null;
    medianFluxError: number | null;
  };
  fit: {
    reducedChiSquared: number | null;
    chiSquared: number | null;
    usedBatman: boolean;
    usedMcmc: boolean;
    fitMode: string;
    baselineOrder: number;
    sigmaClipSigma: number;
    sigmaClipIterations: number;
  };
  referenceComparison: {
    measuredDepthPct: number | null;
    referenceDepthPct: number | null;
    depthDifferencePctPoints: number | null;
    depthRelativeDifferencePct: number | null;
    measuredRpRs: number | null;
    referenceRpRs: number | null;
    rpRsDifference: number | null;
    rpRsRelativeDifferencePct: number | null;
    measuredPeriodDays: number;
    referencePeriodDays: number | null;
    periodDifferenceDays: number | null;
    periodDifferenceSeconds: number | null;
  };
  comparisonQuality: {
    comparisonCount: number;
    medianRms: number | null;
    maxRms: number | null;
    medianMad: number | null;
    maxWeight: number | null;
    effectiveComparisonCount: number | null;
  };
  flags: string[];
}

function finiteNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number =>
    typeof value === 'number' && Number.isFinite(value)
  );
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (left === undefined || right === undefined) return null;
  return (left + right) / 2;
}

function sampleStd(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = mean(values);
  if (avg === null) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function rms(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0) / values.length
  );
}

function percentile(values: number[], pct: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * pct;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];
  if (lower === undefined || upper === undefined) return null;
  if (lowerIndex === upperIndex) return lower;
  return lower + (upper - lower) * (index - lowerIndex);
}

function relativeDifferencePct(
  measured: number | null,
  reference: number | null
): number | null {
  if (measured === null || reference === null || reference === 0) return null;
  return ((measured - reference) / reference) * 100;
}

function effectiveCountFromWeights(weights: number[]): number | null {
  const positive = weights.filter((value) => Number.isFinite(value) && value > 0);
  if (positive.length === 0) return null;
  const total = positive.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;
  const normalized = positive.map((value) => value / total);
  const sumSquares = normalized.reduce((sum, value) => sum + value * value, 0);
  if (sumSquares <= 0) return null;
  return 1 / sumSquares;
}

function pushFlagIf(
  flags: string[],
  condition: boolean,
  message: string
): void {
  if (condition) flags.push(message);
}

export function computeTransitValidationStats({
  fitResult,
  referenceDepthPct,
  referencePeriodDays,
  comparisonDiagnostics,
}: TransitValidationStatsInput): TransitValidationStats {
  const residualValues = finiteNumbers(fitResult.residuals);
  const errorValues = finiteNumbers(fitResult.data_error).filter((value) => value > 0);
  const residualMedian = median(residualValues);
  const residualMad =
    residualMedian === null
      ? null
      : median(residualValues.map((value) => Math.abs(value - residualMedian)));
  const normalizedResiduals = fitResult.residuals.flatMap((residual, index) => {
    const error = fitResult.data_error[index];
    if (!Number.isFinite(residual) || !Number.isFinite(error) || error <= 0) {
      return [];
    }
    return [residual / error];
  });
  const measuredRpRs = Number.isFinite(fitResult.fitted_params.rp_rs)
    ? fitResult.fitted_params.rp_rs
    : null;
  const measuredDepthPct = measuredRpRs === null ? null : measuredRpRs ** 2 * 100;
  const referenceRpRs =
    referenceDepthPct !== null && Number.isFinite(referenceDepthPct) && referenceDepthPct >= 0
      ? Math.sqrt(referenceDepthPct / 100)
      : null;
  const depthDifferencePctPoints =
    measuredDepthPct !== null && referenceDepthPct !== null
      ? measuredDepthPct - referenceDepthPct
      : null;
  const periodDifferenceDays =
    referencePeriodDays !== null && Number.isFinite(referencePeriodDays)
      ? fitResult.period - referencePeriodDays
      : null;
  const clippedTotal =
    fitResult.preprocessing.retained_points + fitResult.preprocessing.clipped_points;
  const comparisonRms = finiteNumbers(
    comparisonDiagnostics.map((item) => item.differential_rms)
  );
  const comparisonMad = finiteNumbers(
    comparisonDiagnostics.map((item) => item.differential_mad)
  );
  const comparisonWeights = finiteNumbers(
    comparisonDiagnostics.map((item) => item.ensemble_weight)
  );
  const reducedChiSquared = Number.isFinite(fitResult.fitted_params.reduced_chi_squared)
    ? fitResult.fitted_params.reduced_chi_squared
    : null;
  const normalizedRms = rms(normalizedResiduals);
  const maxRms = comparisonRms.length > 0 ? Math.max(...comparisonRms) : null;
  const maxWeight =
    comparisonWeights.length > 0 ? Math.max(...comparisonWeights) : null;
  const flags: string[] = [];

  pushFlagIf(
    flags,
    residualValues.length < 30,
    'Small fitted sample; report this as exploratory unless the ROI is justified.'
  );
  pushFlagIf(
    flags,
    reducedChiSquared !== null && reducedChiSquared > 2,
    '환산 카이제곱이 2를 넘습니다. 모델 가정과 밝기 오차를 다시 확인해 보세요.'
  );
  pushFlagIf(
    flags,
    normalizedRms !== null && normalizedRms > 2,
    '잔차가 오차 막대보다 큽니다. 표시된 오차가 실제보다 작게 잡혔을 수 있습니다.'
  );
  pushFlagIf(
    flags,
    clippedTotal > 0 && fitResult.preprocessing.clipped_points / clippedTotal > 0.1,
    '적합에 쓰인 점 중 10% 넘게 제외됐습니다. ROI를 너무 좁게 잡지 않았는지 보세요.'
  );
  pushFlagIf(
    flags,
    comparisonDiagnostics.length < 2,
    '비교성이 하나뿐이라 서로 대조할 수 없습니다. Step 4에서 비교성을 더 골라 보세요.'
  );
  pushFlagIf(
    flags,
    maxRms !== null && comparisonRms.length > 1 && maxRms > 2 * (median(comparisonRms) ?? maxRms),
    '비교성 중 하나가 나머지보다 훨씬 많이 흔들립니다. Step 4 품질 점검에서 그 별을 빼고 다시 해보세요.'
  );

  return {
    sample: {
      dataPoints: residualValues.length,
      retainedPoints: fitResult.preprocessing.retained_points,
      clippedPoints: fitResult.preprocessing.clipped_points,
      clippedFraction: clippedTotal > 0 ? fitResult.preprocessing.clipped_points / clippedTotal : null,
      degreesOfFreedom: fitResult.fitted_params.degrees_of_freedom,
    },
    residuals: {
      mean: mean(residualValues),
      median: residualMedian,
      rms: rms(residualValues),
      sampleStd: sampleStd(residualValues),
      mad: residualMad,
      p95Abs: percentile(
        residualValues.map((value) => Math.abs(value)),
        0.95
      ),
      normalizedRms,
      medianFluxError: median(errorValues),
    },
    fit: {
      reducedChiSquared,
      chiSquared: Number.isFinite(fitResult.fitted_params.chi_squared)
        ? fitResult.fitted_params.chi_squared
        : null,
      usedBatman: fitResult.used_batman,
      usedMcmc: fitResult.used_mcmc,
      fitMode: fitResult.preprocessing.fit_mode,
      baselineOrder: fitResult.preprocessing.baseline_order,
      sigmaClipSigma: fitResult.preprocessing.sigma_clip_sigma,
      sigmaClipIterations: fitResult.preprocessing.sigma_clip_iterations,
    },
    referenceComparison: {
      measuredDepthPct,
      referenceDepthPct,
      depthDifferencePctPoints,
      depthRelativeDifferencePct: relativeDifferencePct(
        measuredDepthPct,
        referenceDepthPct
      ),
      measuredRpRs,
      referenceRpRs,
      rpRsDifference:
        measuredRpRs !== null && referenceRpRs !== null
          ? measuredRpRs - referenceRpRs
          : null,
      rpRsRelativeDifferencePct: relativeDifferencePct(measuredRpRs, referenceRpRs),
      measuredPeriodDays: fitResult.period,
      referencePeriodDays,
      periodDifferenceDays,
      periodDifferenceSeconds:
        periodDifferenceDays === null ? null : periodDifferenceDays * 86_400,
    },
    comparisonQuality: {
      comparisonCount: comparisonDiagnostics.length,
      medianRms: median(comparisonRms),
      maxRms,
      medianMad: median(comparisonMad),
      maxWeight,
      effectiveComparisonCount: effectiveCountFromWeights(comparisonWeights),
    },
    flags,
  };
}
