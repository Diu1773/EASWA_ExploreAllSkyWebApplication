import { useMemo } from 'react';
import { useLangStore } from '../../i18n';
import type { Target } from '../../types/target';
import type { SavedTransitFit } from '../../workflows/transit/fitBridge';
import { TransitValidationStatsPanel } from '../lab/TransitValidationStatsPanel';

interface TransitComparisonProps {
  fit: SavedTransitFit;
  target: Target | null;
}

const fmt = (value: number, digits = 4) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

/**
 * 측정값 − 기준값. 절대차와 상대차를 함께 준다.
 *
 * 절대차만 주면 "0.303%p 차이"가 큰 건지 작은 건지 학습자가 판단할 수 없고,
 * 상대차만 주면 기준값이 작을 때 과장된다. 둘 다 보여주고 판단은 학습자가 한다.
 * unit이 '%p'인 이유: 두 백분율(식 깊이)의 차는 퍼센트가 아니라 퍼센트포인트다.
 */
function diffOf(measured: number, reference: number | null | undefined, digits: number) {
  if (reference == null || !Number.isFinite(reference) || !Number.isFinite(measured)) return null;
  const d = measured - reference;
  const sign = d >= 0 ? '+' : '-';
  const abs = `${sign}${fmt(Math.abs(d), digits)}`;
  const rel = reference !== 0 ? `${sign}${Math.abs((d / reference) * 100).toFixed(1)}%` : null;
  return { abs, rel };
}

/** 한 줄 = 항목 · 내 측정 · 문헌값 · 차이. */
function CompareRow({
  label, measured, reference, diff, diffUnit, lang,
}: {
  label: string;
  measured: string;
  reference: string;
  diff: { abs: string; rel: string | null } | null;
  diffUnit: string;
  lang: 'ko' | 'en';
}) {
  return (
    <div className="transit-compare-row">
      <div className="transit-compare-label">{label}</div>
      <div className="transit-compare-cell">
        <span className="cap">{lang === 'ko' ? '내 측정' : 'Measured'}</span>
        <b>{measured}</b>
      </div>
      <div className="transit-compare-cell">
        <span className="cap">{lang === 'ko' ? '문헌값' : 'Reference'}</span>
        <span className="ref">{reference}</span>
      </div>
      <div className="transit-compare-cell diff">
        <span className="cap">{lang === 'ko' ? '차이' : 'Difference'}</span>
        {diff ? (
          <span>
            <b>{diff.abs}{diffUnit}</b>
            {diff.rel && <span className="rel"> ({diff.rel})</span>}
          </span>
        ) : (
          <span className="ref">—</span>
        )}
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

      {/* 값을 위아래로 나열만 하던 표. "얼마나 차이가 나는가"가 이 단계의 핵심
          질문인데 그 수치가 어디에도 없어서, 학습자가 두 숫자를 눈으로 빼야 했다.
          이제 차이를 한 열로 따로 세운다. 막대는 뺐다 — 위 곡선 겹침 그림이
          이미 그 역할을 하고, 같은 정보를 두 번 그리면 화면만 무거워진다. */}
      <div className="transit-compare-grid">
        <CompareRow
          label={lang === 'ko' ? '식 깊이' : 'Depth'}
          measured={`${fmt(measuredDepth, 3)}%`}
          reference={refDepth != null ? `${fmt(refDepth, 3)}%` : '—'}
          diff={diffOf(measuredDepth, refDepth, 3)}
          diffUnit="%p"
          lang={lang}
        />
        <CompareRow
          label="Rp/R*"
          measured={fmt(fit.rpRs)}
          reference={archiveRpRs != null ? fmt(archiveRpRs) : '—'}
          diff={diffOf(fit.rpRs, archiveRpRs, 4)}
          diffUnit=""
          lang={lang}
        />
      </div>

      {/* Rp/R*가 어디서 나오는지: 식 깊이의 제곱근이다. Step 0의 '깊이 ∝ (Rp/R★)²'
          공식이 여기서 실제 숫자로 닫힌다. fit이 실제로 산출하는 값이라 이 유도는
          정확하다(measuredDepth = fit.rpRs² × 100 이므로 √(깊이)로 역산하면 rpRs). */}
      <p className="transit-compare-derivation">
        {lang === 'ko' ? (
          <>
            <b>Rp/R*는 식 깊이에서 나옵니다.</b> 행성이 별을 가린 <em>넓이</em> 비율이
            식 깊이이고, 반지름 비는 그 제곱근입니다:{' '}
            <code>Rp/R* = √(식 깊이) = √{(measuredDepth / 100).toFixed(5)} = {fmt(fit.rpRs)}</code>
          </>
        ) : (
          <>
            <b>Rp/R* comes from the transit depth.</b> Depth is the fraction of the star&apos;s{' '}
            <em>area</em> the planet blocks, so the radius ratio is its square root:{' '}
            <code>Rp/R* = √(depth) = √{(measuredDepth / 100).toFixed(5)} = {fmt(fit.rpRs)}</code>
          </>
        )}
      </p>

      {/* 공전 주기는 '비교'가 아니다: 앱은 주기를 계산하지 않고 NASA 아카이브 값을
          그대로 위상 접기·적합 입력으로 쓴다. 이걸 '내 측정 3.361 / 문헌 3.361 /
          차이 +0.0%'로 보여주면, 계산해서 정답을 맞힌 것처럼 읽혀 거짓이 된다.
          단일 관측(식 1회)으로는 주기를 못 구한다 — 왜인지까지 함께 알린다. */}
      {refPeriod != null && (
        <div className="transit-period-source">
          <div className="transit-period-source-head">
            <span className="transit-period-source-label">
              {lang === 'ko' ? '공전 주기' : 'Orbital period'}
            </span>
            <b>{fmt(refPeriod, 5)} d</b>
            <span className="transit-period-source-tag">
              {lang === 'ko' ? 'NASA 아카이브 값' : 'NASA Archive value'}
            </span>
          </div>
          <p className="transit-period-source-note">
            {lang === 'ko'
              ? '주기는 측정한 값이 아니라 NASA Exoplanet Archive에서 가져온 값입니다. 이 분석은 이 주기로 광도곡선을 위상 접기 했습니다. 단일 관측에는 식이 한 번뿐이라 주기를 직접 구할 수 없고 — 주기는 식과 식 사이 간격에서 나옵니다 — 여러 번의 식을 관측해야 측정할 수 있습니다.'
              : 'The period is not a measured value — it is taken from the NASA Exoplanet Archive and used to phase-fold this light curve. A single observation shows only one transit, so the period cannot be derived from it: period comes from the spacing between transits, which needs several observed transits.'}
          </p>
        </div>
      )}

      <div className="transit-compare-quality">
        {lang === 'ko' ? '적합 품질' : 'Fit quality'} · χ²_red <b>{fmt(fit.reducedChiSquared, 2)}</b>
        <span className="hint">
          {lang === 'ko' ? '— 단독 판정값이 아니라 해석 근거입니다.' : '— an interpretation cue, not a verdict on its own.'}
        </span>
      </div>

      {/* Paper-ready diagnostics used to live in the Lab's (removed) record step,
          duplicating this comparison. They ride along on the bridged fit now. */}
      {fit.validationStats && <TransitValidationStatsPanel stats={fit.validationStats} />}

      <div className="inquiry-callout">
        {lang === 'ko'
          ? '여기 기준값은 NASA Exoplanet Archive가 주는 식 깊이에서 √(식 깊이)로 되짚어 계산한 것입니다. 논문이 직접 싣는 Rp/R*는 주연감광까지 함께 맞춰 얻은 값이라 이 되짚은 값과는 원래 조금 다릅니다. 그러니 두 값이 벌어졌다고 해서 측정이 틀린 것은 아닙니다. 차이가 어디서 왔는지 찾아보세요. 비교성 선택, 주변 별빛이 섞이는 정도, 구경과 ROI 설정이 흔한 원인입니다.'
          : 'This reference comes from working backwards from the transit depth in the NASA Exoplanet Archive, as √(depth). Papers that report Rp/R* directly fit it together with limb darkening, so their value already differs a little from this back-calculation. A gap between the two does not mean your measurement is wrong. Look for where the difference came from: comparison-star choice, how much light from nearby stars is blended in, and your aperture and ROI settings are the usual causes.'}
      </div>
    </section>
  );
}
