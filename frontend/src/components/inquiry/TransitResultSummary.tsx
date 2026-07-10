import { useLangStore } from '../../i18n';
import type { SavedTransitFit } from '../../workflows/transit/fitBridge';

interface TransitResultSummaryProps {
  fit: SavedTransitFit;
  targetName?: string;
}

const fmt = (value: number, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

/**
 * Step 6 (해석·기록) header card: surfaces the learner's OWN fitted result next to
 * the interpretation prompts, so they interpret against a visible outcome rather
 * than a blank textarea (design principle 4 — the learner interprets the result).
 */
export function TransitResultSummary({ fit, targetName }: TransitResultSummaryProps) {
  const lang = useLangStore((state) => state.lang);
  const depthPct = fit.rpRs * fit.rpRs * 100;

  return (
    <section className="inquiry-info-panel transit-result-summary">
      <span className="inquiry-panel-kicker">
        {lang === 'ko' ? '내가 분석한 결과' : 'Your analysis result'}
        {targetName ? ` · ${targetName}` : ''}
      </span>
      <div className="transit-result-metrics">
        <div className="transit-result-metric primary">
          <span className="metric-label">Rp/R*</span>
          <span className="metric-value">{fmt(fit.rpRs)}</span>
          <span className="metric-sub">± {fmt(fit.rpRsErr)}</span>
        </div>
        <div className="transit-result-metric">
          <span className="metric-label">{lang === 'ko' ? '식 깊이' : 'Depth'}</span>
          <span className="metric-value">{fmt(depthPct, 2)}%</span>
        </div>
        <div className="transit-result-metric">
          <span className="metric-label">{lang === 'ko' ? '공전 주기' : 'Period'}</span>
          <span className="metric-value">{fmt(fit.period, 4)}</span>
          <span className="metric-sub">{lang === 'ko' ? '일' : 'd'}</span>
        </div>
        <div className="transit-result-metric">
          <span className="metric-label">χ²_red</span>
          <span className="metric-value">{fmt(fit.reducedChiSquared, 2)}</span>
        </div>
      </div>
      <p className="transit-result-note">
        {lang === 'ko'
          ? 'Step 4에서 차등측광·모델 적합으로 얻은 값입니다. 아래 질문은 이 결과를 정답으로 받아들이지 않고, 근거와 한계를 설명하기 위한 것입니다.'
          : 'These come from your Step 4 differential photometry and model fit. The prompts below ask you to explain the evidence and limits — not to treat the value as a final answer.'}
      </p>
    </section>
  );
}
