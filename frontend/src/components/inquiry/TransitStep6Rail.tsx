import { Link } from 'react-router-dom';
import { useLangStore } from '../../i18n';
import type { SavedTransitFit } from '../../workflows/transit/fitBridge';
import type { Target } from '../../types/target';
import { FitOverlayPlot } from './TransitComparison';

interface TransitStep6RailProps {
  fit: SavedTransitFit;
  target: Target | null;
  /** Step 6 lives at this URL; the ledger rows link back to earlier steps. */
  moduleHref: string;
}

const fmt = (value: number | null | undefined, digits = 4) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';

/**
 * Step 6 side rail for the transit block.
 *
 * The step asks the learner to say how far their result is from the published
 * value and why. Until now the screen showed only the difference, so "how far
 * from what" had to be reconstructed from memory or by walking back to Step 5 —
 * the record question's own helper text tells them to draw on values from the
 * earlier steps, and none of those values were on the screen.
 *
 * So: the fitted curve, a measured/published/difference table, and a short
 * ledger of what was chosen at each earlier step, all pinned beside the
 * questions. Every number comes from the saved fit or the target row; nothing
 * is recomputed here beyond the published Rp/R*, which the archive gives as a
 * depth (same conversion Step 5 uses).
 */
export function TransitStep6Rail({ fit, target, moduleHref }: TransitStep6RailProps) {
  const lang = useLangStore((state) => state.lang);
  const ko = lang === 'ko';

  const measuredDepthPct = fit.rpRs * fit.rpRs * 100;
  const referenceDepthPct =
    typeof target?.transit_depth_pct === 'number' && Number.isFinite(target.transit_depth_pct)
      ? target.transit_depth_pct
      : null;
  const referenceRpRs =
    referenceDepthPct !== null && referenceDepthPct >= 0 ? Math.sqrt(referenceDepthPct / 100) : null;

  const rpRsDelta =
    referenceRpRs !== null && referenceRpRs !== 0
      ? ((fit.rpRs - referenceRpRs) / referenceRpRs) * 100
      : null;
  const depthDelta = referenceDepthPct !== null ? measuredDepthPct - referenceDepthPct : null;

  const stats = fit.validationStats;
  const residualPpm =
    stats?.residuals.rms != null && Number.isFinite(stats.residuals.rms)
      ? Math.round(stats.residuals.rms * 1e6)
      : null;

  const stepLink = (stepId: string) => `${moduleHref}&blockStep=${stepId}`;

  return (
    <div className="transit-step6-rail">
      {fit.curve && fit.curve.phase.length > 4 && (
        <figure className="transit-step6-figure">
          <FitOverlayPlot
            fit={fit}
            refDepth={referenceDepthPct}
            archiveRpRs={referenceRpRs}
            lang={lang}
          />
          <figcaption>
            {ko ? '4단계 광도곡선 · 실선 적합 · 점선 문헌값' : 'Step 4 light curve · solid fit · dashed published'}
          </figcaption>
        </figure>
      )}

      <div className="transit-step6-compare">
        <table>
          <thead>
            <tr>
              <th />
              <th>{ko ? '측정값' : 'Measured'}</th>
              <th>{ko ? '문헌값' : 'Published'}</th>
              <th>{ko ? '차이' : 'Difference'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Rp/R*</td>
              <td>{fmt(fit.rpRs)}</td>
              <td>{fmt(referenceRpRs)}</td>
              <td className="delta">
                {rpRsDelta === null ? '—' : `${rpRsDelta >= 0 ? '+' : ''}${rpRsDelta.toFixed(1)} %`}
              </td>
            </tr>
            <tr>
              <td>{ko ? '식 깊이' : 'Depth'}</td>
              <td>{fmt(measuredDepthPct, 3)} %</td>
              <td>{referenceDepthPct === null ? '—' : `${fmt(referenceDepthPct, 3)} %`}</td>
              <td className="delta">
                {depthDelta === null ? '—' : `${depthDelta >= 0 ? '+' : ''}${depthDelta.toFixed(3)} %p`}
              </td>
            </tr>
          </tbody>
        </table>
        <span className="transit-step6-compare-src">
          {ko ? '문헌값 · NASA Exoplanet Archive' : 'Published values · NASA Exoplanet Archive'}
        </span>
      </div>

      <div className="transit-step6-ledger">
        <Link className="transit-step6-row" to={stepLink('step1_select')}>
          <span className="transit-step6-row-n">1</span>
          <span className="transit-step6-row-body">
            <strong>{ko ? '대상 선택' : 'Target'}</strong>
            <span className="transit-step6-row-v">
              {target?.name ?? fit.targetId}
              {target?.magnitude_range ? ` · ${target.magnitude_range}` : ''}
              {target?.period_days
                ? ` · P ${target.period_days.toFixed(4)} d${ko ? ' (문헌값)' : ' (published)'}`
                : ''}
            </span>
          </span>
        </Link>

        {stats && (
          <Link className="transit-step6-row" to={stepLink('step2_metadata')}>
            <span className="transit-step6-row-n">2</span>
            <span className="transit-step6-row-body">
              <strong>{ko ? '자료 확인' : 'Data'}</strong>
              <span className="transit-step6-row-v">
                {ko
                  ? `TESS · 측정점 ${stats.sample.retainedPoints}개 (제외 ${stats.sample.clippedPoints}) · 21″/px`
                  : `TESS · ${stats.sample.retainedPoints} points kept (${stats.sample.clippedPoints} clipped) · 21″/px`}
              </span>
            </span>
          </Link>
        )}

        {fit.setup && (
          <Link className="transit-step6-row" to={stepLink('step3_analysis_conditions')}>
            <span className="transit-step6-row-n">3</span>
            <span className="transit-step6-row-body">
              <strong>{ko ? '분석 준비' : 'Settings'}</strong>
              <span className="transit-step6-row-v">
                {ko
                  ? `구경 ${fit.setup.apertureRadius} px · 고리 ${fit.setup.innerAnnulus}–${fit.setup.outerAnnulus} px · 비교성 ${fit.setup.comparisonCount}`
                  : `aperture ${fit.setup.apertureRadius} px · annulus ${fit.setup.innerAnnulus}–${fit.setup.outerAnnulus} px · ${fit.setup.comparisonCount} comparisons`}
              </span>
            </span>
          </Link>
        )}

        <Link className="transit-step6-row" to={stepLink('step4_run_visualize')}>
          <span className="transit-step6-row-n">4</span>
          <span className="transit-step6-row-body">
            <strong>{ko ? '분석·시각화' : 'Analysis'}</strong>
            <span className="transit-step6-row-v">
              {residualPpm !== null ? `${ko ? '잔차' : 'residual'} ${residualPpm} ppm · ` : ''}
              χ²/dof {fmt(fit.reducedChiSquared, 2)}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
