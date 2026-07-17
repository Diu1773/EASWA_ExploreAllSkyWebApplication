// Bridges a completed transit fit from the fullscreen Lab to the guided block.
// The Lab writes a compact result to sessionStorage on a successful fit; the
// exoplanet block reads it (keyed by target id) to drive the Step 5 comparison
// (measured fit value vs NASA Exoplanet Archive) and to gate Steps 5-6.
// Session-scoped like the drafts (utils/inquiryDraft.ts): anonymous work must
// not outlive the browser on a shared classroom PC.

export interface SavedTransitFitCurve {
  /** Orbital phase relative to the fitted T0, sorted ascending (downsampled). */
  phase: number[];
  flux: number[];
  model: number[];
}

export interface SavedTransitFit {
  targetId: string;
  rpRs: number;
  rpRsErr: number;
  period: number;
  reducedChiSquared: number;
  savedAt: number;
  t0?: number;
  /** Downsampled light curve + best-fit model for the Step 5 HOPS-style overlay. */
  curve?: SavedTransitFitCurve;
  /** Paper-ready diagnostics (residual RMS/MAD, clipping, reference deltas, …).
   *  Computed in the Lab, displayed in the block's Step 5 — the Lab's fit step
   *  itself only surfaces χ²_red, so this ride-along is what the comparison
   *  step renders. Merged in by TransitLab after the fit lands. */
  validationStats?: import('./validationStats').TransitValidationStats;
}

import type { TransitFitResponse } from '../../types/transitFit';

const KEY_PREFIX = 'easwa:transit-fit:';

/**
 * Build the bridge entry from a fit response. Shared by the two writers:
 * useTransitFit right after a fit lands, and TransitLab when a restored draft
 * carries a fitResult but the (session-scoped) bridge is empty — without the
 * latter, a logged-in learner resuming a draft saw their fit in the Lab while
 * the block's Steps 5–6 stayed locked until they re-ran the fit.
 */
export function buildSavedTransitFit(fit: TransitFitResponse): SavedTransitFit {
  // Downsampled phase-folded curve for the Step 5 HOPS-style overlay.
  let curve: SavedTransitFitCurve | undefined;
  const times = fit.data_time;
  const flux = fit.data_flux;
  const residuals = fit.residuals;
  if (
    times.length > 1 &&
    times.length === flux.length &&
    flux.length === residuals.length &&
    fit.period > 0
  ) {
    const stride = Math.max(1, Math.ceil(times.length / 240));
    const samples: Array<{ p: number; f: number; m: number }> = [];
    for (let i = 0; i < times.length; i += stride) {
      let p = (times[i] - fit.t0) / fit.period;
      p -= Math.round(p);
      samples.push({ p, f: flux[i], m: flux[i] - residuals[i] });
    }
    samples.sort((a, b) => a.p - b.p);
    curve = {
      phase: samples.map((s) => Number(s.p.toFixed(6))),
      flux: samples.map((s) => Number(s.f.toFixed(6))),
      model: samples.map((s) => Number(s.m.toFixed(6))),
    };
  }

  return {
    targetId: fit.target_id,
    rpRs: fit.fitted_params.rp_rs,
    rpRsErr: fit.fitted_params.rp_rs_err,
    period: fit.period,
    reducedChiSquared: fit.fitted_params.reduced_chi_squared,
    savedAt: Date.now(),
    t0: fit.t0,
    curve,
  };
}

/** Fired on the window after a fit is saved so same-tab views (Lab Steps 5–6)
 *  can re-read it immediately, without waiting for a focus/navigation event. */
export const TRANSIT_FIT_SAVED_EVENT = 'easwa:transit-fit-saved';

export function saveTransitFit(fit: SavedTransitFit): void {
  if (!fit.targetId) return;
  try {
    sessionStorage.setItem(KEY_PREFIX + fit.targetId, JSON.stringify(fit));
  } catch {
    // Storage may be unavailable (private mode / quota) — non-fatal.
  }
  try {
    window.dispatchEvent(new CustomEvent(TRANSIT_FIT_SAVED_EVENT, { detail: fit.targetId }));
  } catch {
    // SSR / no window — non-fatal.
  }
}

/** Remove a saved fit (e.g. a leftover from a previous learner on a shared/demo
 *  machine) so Steps 5–6 revert to their "no result yet" state. Dispatches the
 *  saved event so same-tab views re-read immediately. */
export function clearTransitFit(targetId: string): void {
  if (!targetId) return;
  try {
    sessionStorage.removeItem(KEY_PREFIX + targetId);
  } catch {
    // Storage unavailable — non-fatal.
  }
  try {
    window.dispatchEvent(new CustomEvent(TRANSIT_FIT_SAVED_EVENT, { detail: targetId }));
  } catch {
    // SSR / no window — non-fatal.
  }
}

export function loadTransitFit(targetId: string): SavedTransitFit | null {
  if (!targetId) return null;
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + targetId);
    return raw ? (JSON.parse(raw) as SavedTransitFit) : null;
  } catch {
    return null;
  }
}
