import { describe, expect, it } from 'vitest';
import type { TransitComparisonDiagnostic } from '../../types/transit';
import type { TransitFitResponse } from '../../types/transitFit';
import { computeTransitValidationStats } from './validationStats';

const fitResultFixture: TransitFitResponse = {
  target_id: 'wasp-26-b',
  period: 2.7566,
  t0: 2093.15,
  reference_t0: 2093.15,
  limb_darkening_source: null,
  limb_darkening_filter: null,
  used_batman: true,
  used_mcmc: false,
  preprocessing: {
    fit_mode: 'bjd_window',
    fit_window_phase: 0.12,
    bjd_start: 2093.0,
    bjd_end: 2093.3,
    limb_darkening_source: null,
    limb_darkening_filter: null,
    baseline_order: 0,
    sigma_clip_sigma: 0,
    sigma_clip_iterations: 0,
    retained_points: 4,
    clipped_points: 1,
  },
  fitted_params: {
    rp_rs: 0.1,
    rp_rs_err: 0.01,
    a_rs: 8,
    a_rs_err: 0.5,
    inclination: 88,
    inclination_err: 0.2,
    u1: 0.3,
    u1_err: 0.01,
    u2: 0.2,
    u2_err: 0.01,
    chi_squared: 3.6,
    reduced_chi_squared: 1.2,
    degrees_of_freedom: 3,
  },
  initial_params: {
    rp_rs: 0.11,
    rp_rs_err: 0,
    a_rs: 7.5,
    a_rs_err: 0,
    inclination: 87.5,
    inclination_err: 0,
    u1: 0.28,
    u1_err: 0,
    u2: 0.18,
    u2_err: 0,
    chi_squared: 0,
    reduced_chi_squared: 0,
    degrees_of_freedom: 0,
  },
  model_curve: {
    phase: [-0.1, 0, 0.1],
    flux: [1.0, 0.99, 1.0],
  },
  initial_curve: {
    phase: [-0.1, 0, 0.1],
    flux: [1.0, 0.991, 1.0],
  },
  model_time: [2092.87434, 2093.15, 2093.42566],
  data_time: [2093.05, 2093.15, 2093.25, 2093.35],
  data_phase: [-0.036276, 0, 0.036276, 0.072552],
  data_flux: [1.0, 0.99, 1.0, 1.001],
  data_error: [0.001, 0.001, 0.002, 0.001],
  residuals: [0.0, -0.001, 0.001, 0.0],
};

function comparison(label: string, rms: number, mad: number, weight: number): TransitComparisonDiagnostic {
  return {
    label,
    position: { x: 10, y: 10 },
    aperture_radius: 3,
    inner_annulus: 5,
    outer_annulus: 7,
    valid_frame_count: 4,
    median_flux: 1200,
    differential_rms: rms,
    differential_mad: mad,
    ensemble_weight: weight,
    light_curve: {
      target_id: label,
      period_days: null,
      x_label: 'BTJD',
      y_label: 'Normalized Flux',
      points: [],
    },
  };
}

describe('computeTransitValidationStats', () => {
  it('summarizes fit residuals, clipping, and catalog agreement', () => {
    const stats = computeTransitValidationStats({
      fitResult: fitResultFixture,
      referenceDepthPct: 0.81,
      referencePeriodDays: 2.7565,
      comparisonDiagnostics: [
        comparison('C1', 0.0012, 0.0008, 0.7),
        comparison('C2', 0.0016, 0.0011, 0.3),
      ],
    });

    expect(stats.sample.dataPoints).toBe(4);
    expect(stats.sample.clippedFraction).toBeCloseTo(0.2);
    expect(stats.residuals.rms).toBeCloseTo(0.0007071);
    expect(stats.residuals.normalizedRms).toBeCloseTo(0.55902);
    expect(stats.referenceComparison.measuredDepthPct).toBeCloseTo(1);
    expect(stats.referenceComparison.depthDifferencePctPoints).toBeCloseTo(0.19);
    expect(stats.referenceComparison.referenceRpRs).toBeCloseTo(0.09);
    expect(stats.referenceComparison.periodDifferenceSeconds).toBeCloseTo(8.64);
    expect(stats.comparisonQuality.effectiveComparisonCount).toBeCloseTo(1.7241);
    expect(stats.flags).toContain(
      'Small fitted sample; report this as exploratory unless the ROI is justified.'
    );
    expect(stats.flags).toContain('More than 10% of fitted points were clipped.');
  });
});
