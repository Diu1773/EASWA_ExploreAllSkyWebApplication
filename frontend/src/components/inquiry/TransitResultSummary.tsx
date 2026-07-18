import { useLangStore } from '../../i18n';
import type { SavedTransitFit } from '../../workflows/transit/fitBridge';
import type { Target } from '../../types/target';

interface TransitResultSummaryProps {
  fit: SavedTransitFit;
  targetName?: string;
  /** Catalog values (NASA Exoplanet Archive) shown under each measured metric.
   *  Without them the Step 6 record question "기준값과 어떻게 다른가?" forced the
   *  learner to walk back to Step 5 and memorize numbers. */
  target?: Target | null;
}

const fmt = (value: number, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

const pctDelta = (measured: number, reference: number): string | null => {
  if (!Number.isFinite(measured) || !Number.isFinite(reference) || reference === 0) return null;
  const delta = ((measured - reference) / reference) * 100;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
};

/**
 * Step 6 (해석·기록) header card: surfaces the learner's OWN fitted result next to
 * the interpretation prompts, so they interpret against a visible outcome rather
 * than a blank textarea (design principle 4 — the learner interprets the result).
 */
export function TransitResultSummary({ fit, targetName, target }: TransitResultSummaryProps) {
  const lang = useLangStore((state) => state.lang);
  const depthPct = fit.rpRs * fit.rpRs * 100;

  const refDepthPct =
    typeof target?.transit_depth_pct === 'number' && Number.isFinite(target.transit_depth_pct)
      ? target.transit_depth_pct
      : null;
  const refRpRs = refDepthPct !== null && refDepthPct >= 0 ? Math.sqrt(refDepthPct / 100) : null;
  const refPeriod =
    typeof target?.period_days === 'number' && Number.isFinite(target.period_days)
      ? target.period_days
      : null;
  const refLabel = lang === 'ko' ? '기준' : 'ref';

  return (
    <section className="inquiry-info-panel transit-result-summary">
      <span className="inquiry-panel-kicker">
        {/* '내가 분석한' 같은 1인칭 수식은 빼고 담백하게. 누구 결과인지는 화면
            맥락(Step 6, 바로 아래 "Step 4에서 … 얻은 값")으로 이미 분명하다. */}
        {lang === 'ko' ? '분석 결과' : 'Analysis result'}
        {/* 대상명은 kicker의 uppercase에서 빼야 한다: 외계행성 이름의 끝 글자는
            소문자여야 하고(WASP-6 b), 대문자 B는 항성 동반성을 뜻해 의미가 달라진다. */}
        {targetName ? <span className="kicker-verbatim"> · {targetName}</span> : null}
      </span>
      <div className="transit-result-metrics">
        <div className="transit-result-metric primary">
          <span className="metric-label">Rp/R*</span>
          <span className="metric-value">{fmt(fit.rpRs)}</span>
          <span className="metric-sub">± {fmt(fit.rpRsErr)}</span>
          {refRpRs !== null && (
            <span className="metric-sub">
              {refLabel} {fmt(refRpRs)}
              {pctDelta(fit.rpRs, refRpRs) ? ` (${pctDelta(fit.rpRs, refRpRs)})` : ''}
            </span>
          )}
        </div>
        <div className="transit-result-metric">
          <span className="metric-label">{lang === 'ko' ? '식 깊이' : 'Depth'}</span>
          <span className="metric-value">{fmt(depthPct, 2)}%</span>
          {refDepthPct !== null && (
            <span className="metric-sub">
              {refLabel} {fmt(refDepthPct, 2)}%
              {pctDelta(depthPct, refDepthPct) ? ` (${pctDelta(depthPct, refDepthPct)})` : ''}
            </span>
          )}
        </div>
        <div className="transit-result-metric">
          <span className="metric-label">{lang === 'ko' ? '공전 주기' : 'Period'}</span>
          <span className="metric-value">{fmt(fit.period, 4)}</span>
          <span className="metric-sub">{lang === 'ko' ? '일' : 'd'}</span>
          {refPeriod !== null && (
            <span className="metric-sub">
              {refLabel} {fmt(refPeriod, 4)}
              {pctDelta(fit.period, refPeriod) ? ` (${pctDelta(fit.period, refPeriod)})` : ''}
            </span>
          )}
        </div>
        <div className="transit-result-metric">
          <span className="metric-label">χ²_red</span>
          <span className="metric-value">{fmt(fit.reducedChiSquared, 2)}</span>
        </div>
      </div>
      <p className="transit-result-note">
        {lang === 'ko'
          ? 'Step 4에서 차등측광·모델 적합으로 얻은 값이며, 기준값은 NASA Exoplanet Archive입니다. 아래 기록은 이 결과를 정답으로 받아들이지 않고, 근거와 한계를 설명하기 위한 것입니다.'
          : 'From your Step 4 photometry and model fit; reference values are from the NASA Exoplanet Archive. The prompts below ask you to explain evidence and limits — not to treat the value as a final answer.'}
      </p>
    </section>
  );
}
