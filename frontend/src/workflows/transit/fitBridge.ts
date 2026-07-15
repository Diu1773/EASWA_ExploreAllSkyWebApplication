// Bridges a completed transit fit from the fullscreen Lab to the guided block.
// The Lab writes a compact result to localStorage on a successful fit; the
// exoplanet block reads it (keyed by target id) to drive the Step 5 comparison
// (measured fit value vs NASA Exoplanet Archive) and to gate Steps 5-6.

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
}

const KEY_PREFIX = 'easwa:transit-fit:';

/** Fired on the window after a fit is saved so same-tab views (Lab Steps 5–6)
 *  can re-read it immediately, without waiting for a focus/navigation event. */
export const TRANSIT_FIT_SAVED_EVENT = 'easwa:transit-fit-saved';

export function saveTransitFit(fit: SavedTransitFit): void {
  if (!fit.targetId) return;
  try {
    localStorage.setItem(KEY_PREFIX + fit.targetId, JSON.stringify(fit));
  } catch {
    // localStorage may be unavailable (private mode / quota) — non-fatal.
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
    localStorage.removeItem(KEY_PREFIX + targetId);
  } catch {
    // localStorage unavailable — non-fatal.
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
    const raw = localStorage.getItem(KEY_PREFIX + targetId);
    return raw ? (JSON.parse(raw) as SavedTransitFit) : null;
  } catch {
    return null;
  }
}
