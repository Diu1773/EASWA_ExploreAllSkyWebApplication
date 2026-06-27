// Bridges a completed transit fit from the fullscreen Lab to the guided block.
// The Lab writes a compact result to localStorage on a successful fit; the
// exoplanet block reads it (keyed by target id) to drive the Step 5 comparison
// (measured fit value vs NASA Exoplanet Archive) and to gate Steps 5-6.

export interface SavedTransitFit {
  targetId: string;
  rpRs: number;
  rpRsErr: number;
  period: number;
  reducedChiSquared: number;
  savedAt: number;
}

const KEY_PREFIX = 'easwa:transit-fit:';

export function saveTransitFit(fit: SavedTransitFit): void {
  if (!fit.targetId) return;
  try {
    localStorage.setItem(KEY_PREFIX + fit.targetId, JSON.stringify(fit));
  } catch {
    // localStorage may be unavailable (private mode / quota) — non-fatal.
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
