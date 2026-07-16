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

// ---------------------------------------------------------------------------
// Lab (정밀 분석) draft
//
// The Lab keeps its own inputs, separate from the block above it: the StepGuide
// "생각해보기" answers (O/X, multiple choice, short text) and the Step 6 record
// template answers. Neither survived a reload — the guide answers sat in a
// component useState that unmounts on every Lab step change, and recordAnswers
// only persisted through the login-gated backend draft. Same reasoning as the
// block draft above: the browser is the only free, no-login, restart-proof store.
// ---------------------------------------------------------------------------

const LAB_KEY_PREFIX = 'easwa:lab-draft:';

export interface LabDraft {
  v: number;
  /** StepGuide answers, keyed by question id. */
  guideAnswers: Record<string, string>;
  /** Lab record-template answers, keyed by question id. */
  recordAnswers: Record<string, unknown>;
  savedAt: number;
}

function labKeyFor(targetId: string): string {
  return LAB_KEY_PREFIX + targetId;
}

export function loadLabDraft(targetId: string | null | undefined): LabDraft | null {
  if (!targetId) return null;
  try {
    const raw = localStorage.getItem(labKeyFor(targetId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LabDraft>;
    if (parsed.v !== SCHEMA_VERSION) return null;
    return {
      v: SCHEMA_VERSION,
      guideAnswers: parsed.guideAnswers ?? {},
      recordAnswers: parsed.recordAnswers ?? {},
      savedAt: parsed.savedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export function saveLabDraft(
  targetId: string | null | undefined,
  guideAnswers: Record<string, string>,
  recordAnswers: Record<string, unknown>,
): number | null {
  if (!targetId) return null;
  const savedAt = Date.now();
  try {
    localStorage.setItem(
      labKeyFor(targetId),
      JSON.stringify({ v: SCHEMA_VERSION, guideAnswers, recordAnswers, savedAt } satisfies LabDraft),
    );
    return savedAt;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Start over
// ---------------------------------------------------------------------------

/**
 * Wipe every trace of one learner's work on one target.
 *
 * Autosave is what makes a reload safe, but it also means a shared classroom PC
 * hands the next person the previous one's notes, half-answered self-checks and
 * fitted curve. There was no way to get a clean start short of clearing site
 * data in the browser.
 *
 * Deliberately scoped to a target rather than "clear everything": the anon id
 * survives, so a learner who starts over is still the same row in the sheet
 * instead of silently forking into a second one.
 *
 * The Lab's analysis state lives in sessionStorage under a key built from the
 * workflow scope (see utils/workflowSession), and drafts/records live in
 * localStorage — so this sweeps both by prefix rather than guessing every id.
 */
/** Is there anything saved for this target? Checks every store clearTargetWork
 *  touches — a leftover Lab draft or fitted curve counts even when the block's
 *  notes are empty, which is exactly the shape a previous learner leaves behind
 *  after doing the analysis but not the write-up. */
export function hasTargetWork(moduleId: string, targetId: string | null | undefined): boolean {
  if (!targetId) return false;
  try {
    return (
      localStorage.getItem(keyFor(inquiryDraftScope(moduleId, targetId))) !== null ||
      localStorage.getItem(labKeyFor(targetId)) !== null ||
      localStorage.getItem(`easwa:transit-fit:${targetId}`) !== null ||
      Object.keys(sessionStorage).some(
        (key) => key.startsWith('workflow-session:') && key.includes(targetId),
      )
    );
  } catch {
    return false;
  }
}

export function clearTargetWork(moduleId: string, targetId: string | null | undefined): void {
  if (!targetId) return;
  try {
    localStorage.removeItem(keyFor(inquiryDraftScope(moduleId, targetId)));
    localStorage.removeItem(labKeyFor(targetId));
    localStorage.removeItem(`easwa:transit-fit:${targetId}`);

    // Lab step-guide fold state ("easwa_guide_open_<step>_<suffix>") and the
    // workflow snapshot are keyed by step/workflow, not by target — match by
    // prefix and, for the session snapshot, by the target id inside the key.
    Object.keys(localStorage)
      .filter((key) => key.startsWith('easwa_guide_open_'))
      .forEach((key) => localStorage.removeItem(key));

    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('workflow-session:') && key.includes(targetId))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Storage unavailable (private mode / quota) — nothing to clear anyway.
  }
}
