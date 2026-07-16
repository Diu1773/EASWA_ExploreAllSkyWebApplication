import { useLangStore } from '../../i18n';
import type { TransitValidationStats } from '../../workflows/transit/validationStats';

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



export function TransitValidationStatsPanel({ stats }: { stats: TransitValidationStats }) {
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
