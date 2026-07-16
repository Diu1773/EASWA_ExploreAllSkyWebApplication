// Auto-saved learner input for the guided inquiry block (notes + self-checks).
//
// Why localStorage rather than the backend: the block is used without login, and
// backend drafts are per-user (routers/drafts.py requires get_current_user). Even
// for logged-in users the Render free plan mounts no persistent disk, so the
// SQLite file is wiped on every deploy/restart. The browser is therefore the only
// place an anonymous learner's work survives a reload. Research collection is a
// separate path: the Step 6 anonymous submission to the Google Sheets sink.
//
// This also repairs a silent data loss: the block at /modules/... and the block
// at /lab/... are different React trees, so walking Step 4 → target detail → Lab
// used to unmount the layout and drop everything typed in Steps 0–3. Both trees
// now hydrate from the same key.

const KEY_PREFIX = 'easwa:inquiry-draft:';

/** Bump when the stored shape changes; older drafts are then ignored rather
 *  than crashing the layout with a half-matching object. */
const SCHEMA_VERSION = 1;

export interface InquiryDraft {
  v: number;
  /** Record fields + reflection prompts, keyed `${stepId}:${fieldId}`. */
  notes: Record<string, string>;
  /** Self-check answers, keyed `${stepId}:${itemId}`. */
  selfChecks: Record<string, string | number>;
  savedAt: number;
}

/** Scope a draft to one learner task. Module + target, so switching target does
 *  not resurrect the previous target's notes. */
export function inquiryDraftScope(moduleId: string, targetId: string | null | undefined): string {
  return `${moduleId}:${targetId && targetId.trim() !== '' ? targetId : 'no-target'}`;
}

function keyFor(scope: string): string {
  return KEY_PREFIX + scope;
}

export function loadInquiryDraft(scope: string | null): InquiryDraft | null {
  if (!scope) return null;
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InquiryDraft>;
    if (parsed.v !== SCHEMA_VERSION) return null;
    return {
      v: SCHEMA_VERSION,
      notes: parsed.notes ?? {},
      selfChecks: parsed.selfChecks ?? {},
      savedAt: parsed.savedAt ?? 0,
    };
  } catch {
    // Unavailable (private mode / quota) or corrupt — start clean rather than throw.
    return null;
  }
}

/** Returns the save timestamp, or null if storage refused the write. */
export function saveInquiryDraft(
  scope: string | null,
  notes: Record<string, string>,
  selfChecks: Record<string, string | number>,
): number | null {
  if (!scope) return null;
  const savedAt = Date.now();
  try {
    localStorage.setItem(
      keyFor(scope),
      JSON.stringify({ v: SCHEMA_VERSION, notes, selfChecks, savedAt } satisfies InquiryDraft),
    );
    return savedAt;
  } catch {
    return null;
  }
}

export function clearInquiryDraft(scope: string | null): void {
  if (!scope) return;
  try {
    localStorage.removeItem(keyFor(scope));
  } catch {
    // non-fatal
  }
}
