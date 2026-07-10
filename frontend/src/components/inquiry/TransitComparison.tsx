import { useLangStore } from '../../i18n';
import type { Target } from '../../types/target';
import type { SavedTransitFit } from '../../workflows/transit/fitBridge';

interface TransitComparisonProps {
  fit: SavedTransitFit;
  target: Target | null;
}

const fmt = (value: number, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

/** A horizontal measured-vs-reference bar pair, normalized to the larger of the two. */
function CompareBars({ measured, reference }: { measured: number; reference: number }) {
  const max = Math.max(measured, reference, 1e-9);
  const mPct = Math.max(4, (measured / max) * 100);
  const rPct = Math.max(4, (reference / max) * 100);
  return (
    <div className="transit-compare-bars" aria-hidden="true">
      <div className="transit-compare-bar-track">
        <div className="transit-compare-bar measured" style={{ width: `${mPct}%` }} />
      </div>
      <div className="transit-compare-bar-track">
        <div className="transit-compare-bar reference" style={{ width: `${rPct}%` }} />
      </div>
    </div>
  );
}

/**
 * Step 5 (기준값 비교) content: the learner's own fitted values placed next to the
 * NASA Exoplanet Archive reference, as numbers AND a visual bar comparison, so the
 * step shows a real result instead of describing "compare catalog vs measured".
 */
export function TransitComparison({ fit, target }: TransitComparisonProps) {
  const lang = useLangStore((state) => state.lang);
  const measuredDepth = fit.rpRs * fit.rpRs * 100;
  const archiveRpRs =
    target?.transit_depth_pct != null && target.transit_depth_pct > 0
      ? Math.sqrt(target.transit_depth_pct / 100)
      : null;
  const refDepth = target?.transit_depth_pct ?? null;
  const refPeriod = target?.period_days ?? null;

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">
        {lang === 'ko' ? '측정값 ↔ 기준값 (NASA Exoplanet Archive)' : 'Measured ↔ Reference (NASA Exoplanet Archive)'}
      </span>
      <h3>{target?.name ?? fit.targetId}</h3>

      <div className="transit-compare-legend">
        <span><i className="dot measured" /> {lang === 'ko' ? '내 측정값 (fit)' : 'Measured (fit)'}</span>
        <span><i className="dot reference" /> {lang === 'ko' ? '카탈로그 기준값' : 'Catalog reference'}</span>
      </div>

      <div className="transit-compare-grid">
        <div className="transit-compare-row">
          <div className="transit-compare-label">{lang === 'ko' ? '식 깊이' : 'Depth'}</div>
          <CompareBars measured={measuredDepth} reference={refDepth ?? 0} />
          <div className="transit-compare-values">
            <b>{fmt(measuredDepth, 3)}%</b>
            <span>{refDepth != null ? `${fmt(refDepth, 3)}%` : '—'}</span>
          </div>
        </div>
        <div className="transit-compare-row">
          <div className="transit-compare-label">Rp/R*</div>
          <CompareBars measured={fit.rpRs} reference={archiveRpRs ?? 0} />
          <div className="transit-compare-values">
            <b>{fmt(fit.rpRs)}</b>
            <span>{archiveRpRs != null ? fmt(archiveRpRs) : '—'}</span>
          </div>
        </div>
        <div className="transit-compare-row no-bars">
          <div className="transit-compare-label">{lang === 'ko' ? '공전 주기' : 'Period'}</div>
          <div className="transit-compare-values period">
            <b>{fmt(fit.period, 5)} d</b>
            <span>{refPeriod != null ? `${fmt(refPeriod, 5)} d` : '—'}</span>
          </div>
        </div>
      </div>

      <div className="transit-compare-quality">
        {lang === 'ko' ? '적합 품질' : 'Fit quality'} · χ²_red <b>{fmt(fit.reducedChiSquared, 2)}</b>
        <span className="hint">
          {lang === 'ko' ? '— 단독 판정값이 아니라 해석 근거입니다.' : '— an interpretation cue, not a verdict on its own.'}
        </span>
      </div>

      <div className="inquiry-callout">
        {lang === 'ko'
          ? '기준 Rp/R*는 카탈로그 식 깊이에 Rp/R* = √(depth)를 적용한 비교용 추정값입니다 — 출판된 반지름비와 동일하게 보지 마세요. 측정값이 기준값과 다르다면 비교성 품질·별빛 혼입(blending)·aperture·ROI·잡음·모델 가정을 근거로 차이를 설명하세요.'
          : 'The reference Rp/R* is √(depth) from the catalog depth — a comparison estimate, not the published radius ratio. If your value differs, explain it via comparison-star quality, blending, aperture, ROI, noise, or model assumptions.'}
      </div>
    </section>
  );
}
