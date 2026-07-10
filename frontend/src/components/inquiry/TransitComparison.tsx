import { useMemo } from 'react';
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
 * HOPS-style overlay: the learner's phase-folded data + their best-fit model
 * (accent) + the expected model built from the catalog depth (dashed gray),
 * with a residual sub-panel — differences read as curve separation, not text.
 */
function FitOverlayPlot({
  fit,
  refDepth,
  archiveRpRs,
  lang,
}: {
  fit: SavedTransitFit;
  refDepth: number | null;
  archiveRpRs: number | null;
  lang: string;
}) {
  const ko = lang === 'ko';
  const curve = fit.curve!;

  const geometry = useMemo(() => {
    const W = 680;
    const H = 470;
    const L = 58;
    const R = 14;
    const mainT = 14;
    const mainB = 310;
    const resT = 340;
    const resB = 428;
    const innerW = W - L - R;

    const phases = curve.phase;
    const xMin = Math.min(...phases);
    const xMax = Math.max(...phases);
    const xPad = (xMax - xMin) * 0.04 || 0.01;
    const x0 = xMin - xPad;
    const x1 = xMax + xPad;
    const xOf = (p: number) => L + ((p - x0) / (x1 - x0)) * innerW;

    // Expected model: scale the fitted model's dip by catalog/fit depth ratio.
    const fitDepth = fit.rpRs * fit.rpRs;
    const k = refDepth != null && fitDepth > 0 ? refDepth / 100 / fitDepth : null;
    const expected = k != null ? curve.model.map((m) => 1 - k * (1 - m)) : null;

    const allY = [...curve.flux, ...curve.model, ...(expected ?? [])];
    let yMin = Math.min(...allY);
    let yMax = Math.max(...allY);
    const yPad = (yMax - yMin) * 0.08 || 0.001;
    yMin -= yPad;
    yMax += yPad;
    const yOf = (v: number) => mainT + (1 - (v - yMin) / (yMax - yMin)) * (mainB - mainT);

    const residuals = curve.flux.map((f, i) => f - curve.model[i]);
    const rAbs = Math.max(...residuals.map((r) => Math.abs(r)), 1e-6) * 1.25;
    const rOf = (v: number) => resT + (1 - (v + rAbs) / (2 * rAbs)) * (resB - resT);
    const mean = residuals.reduce((s, r) => s + r, 0) / residuals.length;
    const std = Math.sqrt(
      residuals.reduce((s, r) => s + (r - mean) * (r - mean), 0) / residuals.length,
    );

    const toLine = (ys: number[]) =>
      ys.map((v, i) => `${xOf(phases[i]).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');

    // ticks
    const xTicks: number[] = [];
    const step = (x1 - x0) / 4;
    for (let i = 0; i <= 4; i++) xTicks.push(x0 + step * i);
    const yTicks: number[] = [];
    const ySpan = yMax - yMin;
    const yStep = ySpan / 3;
    for (let i = 0; i <= 3; i++) yTicks.push(yMin + yStep * i);

    return {
      W, H, L, R, mainT, mainB, resT, resB, innerW,
      xOf, yOf, rOf, xTicks, yTicks,
      fitLine: toLine(curve.model),
      expLine: expected ? toLine(expected) : null,
      residuals, rAbs, stdPermil: std * 1000,
    };
  }, [curve, fit.rpRs, refDepth]);

  const g = geometry;
  return (
    <div className="transit-hops">
      <svg viewBox={`0 0 ${g.W} ${g.H}`} role="img">
        {/* main panel frame */}
        <rect className="hops-frame" x={g.L} y={g.mainT} width={g.innerW} height={g.mainB - g.mainT} />
        <rect className="hops-frame" x={g.L} y={g.resT} width={g.innerW} height={g.resB - g.resT} />
        {g.xTicks.map((t) => (
          <g key={`x${t}`}>
            <text className="hops-text" x={g.xOf(t)} y={g.resB + 16} textAnchor="middle">
              {t.toFixed(3)}
            </text>
            <line className="hops-tick" x1={g.xOf(t)} y1={g.resB} x2={g.xOf(t)} y2={g.resB + 4} />
          </g>
        ))}
        {g.yTicks.map((t) => (
          <text key={`y${t}`} className="hops-text" x={g.L - 6} y={g.yOf(t) + 3} textAnchor="end">
            {t.toFixed(3)}
          </text>
        ))}
        <text className="hops-text" x={g.L + g.innerW / 2} y={g.H - 8} textAnchor="middle">
          {ko ? '위상 (phase)' : 'phase'}
        </text>
        <text
          className="hops-text"
          x={16}
          y={(g.mainT + g.mainB) / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${(g.mainT + g.mainB) / 2})`}
        >
          {ko ? '상대 밝기' : 'relative flux'}
        </text>
        <text
          className="hops-text"
          x={16}
          y={(g.resT + g.resB) / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${(g.resT + g.resB) / 2})`}
        >
          {ko ? '잔차' : 'residuals'}
        </text>

        {/* data + models */}
        {fit.curve!.phase.map((p, i) => (
          <circle key={`d${i}`} className="hops-data" cx={g.xOf(p)} cy={g.yOf(fit.curve!.flux[i])} r={2.1} />
        ))}
        {g.expLine && <polyline className="hops-expected" points={g.expLine} />}
        <polyline className="hops-fit" points={g.fitLine} />

        {/* residual panel */}
        <line className="hops-zero" x1={g.L} y1={g.rOf(0)} x2={g.L + g.innerW} y2={g.rOf(0)} />
        {fit.curve!.phase.map((p, i) => (
          <circle key={`r${i}`} className="hops-data" cx={g.xOf(p)} cy={g.rOf(g.residuals[i])} r={1.7} />
        ))}
        <text className="hops-text" x={g.L + 8} y={g.resT + 14}>
          STD = {g.stdPermil.toFixed(1)} ‰
        </text>

        {/* legend */}
        <g className="hops-legend">
          <rect x={g.L + 8} y={g.mainT + 8} width={280} height={54} rx={5} />
          <line className="hops-fit" x1={g.L + 18} y1={g.mainT + 24} x2={g.L + 44} y2={g.mainT + 24} />
          <text className="hops-text strong" x={g.L + 50} y={g.mainT + 28}>
            {ko ? `내 적합 모델 (Rp/R* = ${fmt(fit.rpRs)})` : `Best-fit model (Rp/R* = ${fmt(fit.rpRs)})`}
          </text>
          <line className="hops-expected" x1={g.L + 18} y1={g.mainT + 44} x2={g.L + 44} y2={g.mainT + 44} />
          <text className="hops-text" x={g.L + 50} y={g.mainT + 48}>
            {archiveRpRs != null
              ? ko
                ? `기대 모델 (카탈로그 Rp/R* = ${fmt(archiveRpRs)})`
                : `Expected model (catalog Rp/R* = ${fmt(archiveRpRs)})`
              : ko
                ? '기대 모델 (카탈로그 깊이 없음)'
                : 'Expected model (no catalog depth)'}
          </text>
        </g>
      </svg>
      <p className="transit-hops-caption">
        {ko
          ? '점 = 내 관측(위상 접기) · 실선 = 내 적합 · 점선 = 카탈로그 깊이를 내 적합 모양에 적용한 기대 모델. 두 곡선의 깊이 차이가 곧 측정-기준 차이입니다.'
          : 'Points = my phase-folded data · solid = my fit · dashed = expected model (catalog depth applied to my fit shape). The depth gap between the curves IS the measured-vs-reference difference.'}
      </p>
    </div>
  );
}

/**
 * Step 5 (기준값 비교): HOPS-style overlay of the learner's data, their fit and
 * the catalog-based expected model (when curve data exists), with the numeric
 * measured-vs-reference comparison below; falls back to bars for older saves.
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
  const hasCurve = !!(fit.curve && fit.curve.phase.length > 4);

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">
        {lang === 'ko' ? '측정값 ↔ 기준값 (NASA Exoplanet Archive)' : 'Measured ↔ Reference (NASA Exoplanet Archive)'}
      </span>
      <h3>{target?.name ?? fit.targetId}</h3>

      {hasCurve && (
        <FitOverlayPlot fit={fit} refDepth={refDepth} archiveRpRs={archiveRpRs} lang={lang} />
      )}

      <div className="transit-compare-legend">
        <span><i className="dot measured" /> {lang === 'ko' ? '내 측정값 (fit)' : 'Measured (fit)'}</span>
        <span><i className="dot reference" /> {lang === 'ko' ? '카탈로그 기준값' : 'Catalog reference'}</span>
      </div>

      <div className="transit-compare-grid">
        <div className={`transit-compare-row${hasCurve ? ' no-bars' : ''}`}>
          <div className="transit-compare-label">{lang === 'ko' ? '식 깊이' : 'Depth'}</div>
          {!hasCurve && <CompareBars measured={measuredDepth} reference={refDepth ?? 0} />}
          <div className="transit-compare-values">
            <b>{fmt(measuredDepth, 3)}%</b>
            <span>{refDepth != null ? `${fmt(refDepth, 3)}%` : '—'}</span>
          </div>
        </div>
        <div className={`transit-compare-row${hasCurve ? ' no-bars' : ''}`}>
          <div className="transit-compare-label">Rp/R*</div>
          {!hasCurve && <CompareBars measured={fit.rpRs} reference={archiveRpRs ?? 0} />}
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
