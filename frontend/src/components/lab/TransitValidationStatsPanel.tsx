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

  // 기본 접힘. 펼쳐 두면 수업 화면에 영문 지표 10개가 깔려 Step 5의 본론(내
  // 측정값과 문헌값의 차이)을 밀어낸다. 그렇다고 없애면 자동 분석이 블랙박스가
  // 되므로(원리 3), 감추지 않고 접어서 심화 학습자·교사가 열어보게 한다.
  return (
    <details className="transit-validation-panel">
      <summary className="transit-validation-summary">
        <span>{lang === 'ko' ? '자세한 검증 수치 (심화)' : 'Detailed validation figures (advanced)'}</span>
        <span className="transit-validation-model">
          {stats.fit.usedBatman ? 'batman model' : 'simplified model'}
        </span>
      </summary>
      <div className="transit-validation-grid">
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '사용 데이터 수' : 'Fitted N'}</span>
          <strong>{stats.sample.dataPoints.toLocaleString()}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '제외된 비율' : 'Clipped'}</span>
          <strong>{formatPercentValue(stats.sample.clippedFraction)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '잔차 RMS' : 'Residual RMS'}</span>
          <strong>{formatFluxPpm(stats.residuals.rms)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '잔차 MAD' : 'Residual MAD'}</span>
          <strong>{formatFluxPpm(stats.residuals.mad)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '정규화 RMS' : 'Norm. RMS'}</span>
          <strong>{formatNullableNumber(stats.residuals.normalizedRms, 2)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '환산 카이제곱' : 'chi2 red'}</span>
          <strong>{formatNullableNumber(stats.fit.reducedChiSquared, 3)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '식 깊이 차이' : 'Depth diff.'}</span>
          <strong>
            {typeof depthDiff === 'number' && Number.isFinite(depthDiff)
              ? `${depthDiff >= 0 ? '+' : ''}${depthDiff.toFixed(3)}%p`
              : 'n/a'}
          </strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '주기 차이' : 'Period diff.'}</span>
          <strong>
            {typeof periodDiffSeconds === 'number' && Number.isFinite(periodDiffSeconds)
              ? `${periodDiffSeconds >= 0 ? '+' : ''}${periodDiffSeconds.toFixed(1)} s`
              : 'n/a'}
          </strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '비교성 RMS 중앙값' : 'Comp. RMS med.'}</span>
          <strong>{formatFluxPpm(stats.comparisonQuality.medianRms)}</strong>
        </div>
        <div className="transit-summary-card">
          <span className="transit-summary-label">{lang === 'ko' ? '유효 비교성 수' : 'Eff. comps'}</span>
          <strong>
            {formatNullableNumber(stats.comparisonQuality.effectiveComparisonCount, 2)}
          </strong>
        </div>
      </div>
      <div className="transit-validation-method">
        <strong>{lang === 'ko' ? '보고서용 요약 문장' : 'Method sentence'}</strong>
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
    </details>
  );
}
