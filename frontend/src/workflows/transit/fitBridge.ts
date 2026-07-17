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

const KEY_PREFIX = 'easwa:transit-fit:';

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
