// Auto-saved learner input for the guided inquiry block (notes + self-checks).
//
// Why the browser rather than the backend: the block is used without login, and
// backend drafts are per-user (routers/drafts.py requires get_current_user). Even
// for logged-in users the Render free plan mounts no persistent disk, so the
// SQLite file is wiped on every deploy/restart. Research collection is a separate
// path: the anonymous sync to the Google Sheets sink.
//
// Why sessionStorage rather than localStorage: this is anonymous work, and
// localStorage made it behave like an account — it outlived the browser, so on a
// shared classroom PC the next learner inherited the previous one's notes, and
// note fields that had since been REMOVED from the UI kept resurrecting from old
// saves and riding along into the sheet payload (2026-07-17: a real row arrived
// carrying six "D" test notes from fields that no longer exist). Session scope
// keeps the reload/crash protection within one sitting and guarantees a clean
// start the next time the browser opens. (사용자 지시: "익명인데 왜 로컬스토리지에
// 저장되는거야 캐시마냥" — 익명 작업은 세션 한정으로.)
//
// This also repairs a silent data loss: the block at /modules/... and the block
// at /lab/... are different React trees, so walking Step 4 → Lab used to unmount
// the layout and drop everything typed in Steps 0–3. Both trees hydrate from the
// same key (same tab → same sessionStorage).

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
    const raw = sessionStorage.getItem(keyFor(scope));
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
    sessionStorage.setItem(
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
    sessionStorage.removeItem(keyFor(scope));
  } catch {
    // non-fatal
  }
}

// ---------------------------------------------------------------------------
// Lab (정밀 분석) draft
//
// The Lab keeps its own inputs, separate from the block above it: the StepGuide
// "생각해보기" answers (O/X, multiple choice, short text). They did not survive
// a reload — the answers sat in a component useState that unmounts on every Lab
// step change. Same scope reasoning as the block draft above: reload-safe within
// the session, gone when the browser closes.
// ---------------------------------------------------------------------------

const LAB_KEY_PREFIX = 'easwa:lab-draft:';

/** Fired after a Lab draft write so the block layout on the same page can react:
 *  bump its "저장됨" indicator, re-evaluate the start-over button, and schedule a
 *  sheet sync. Without it, a learner who ONLY answered the Lab's 생각해보기
 *  never triggered the sheet upsert — lab_guide_json only rode along when some
 *  block note happened to change too. */
export const LAB_DRAFT_SAVED_EVENT = 'easwa:lab-draft-saved';

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
    const raw = sessionStorage.getItem(labKeyFor(targetId));
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
    sessionStorage.setItem(
      labKeyFor(targetId),
      JSON.stringify({ v: SCHEMA_VERSION, guideAnswers, recordAnswers, savedAt } satisfies LabDraft),
    );
    try {
      window.dispatchEvent(new CustomEvent(LAB_DRAFT_SAVED_EVENT, { detail: targetId }));
    } catch {
      // no window (tests) — non-fatal
    }
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
 * Closing the browser now does this on its own (everything is session-scoped),
 * so this button covers the remaining case: handing the PC to the next learner
 * without closing the tab, or one learner deciding to redo from scratch.
 */
/** Is there anything saved for this target? Checks every store clearTargetWork
 *  touches — a leftover Lab draft or fitted curve counts even when the block's
 *  notes are empty, which is exactly the shape a previous learner leaves behind
 *  after doing the analysis but not the write-up. */
export function hasTargetWork(moduleId: string, targetId: string | null | undefined): boolean {
  if (!targetId) return false;
  try {
    return (
      sessionStorage.getItem(keyFor(inquiryDraftScope(moduleId, targetId))) !== null ||
      sessionStorage.getItem(labKeyFor(targetId)) !== null ||
      sessionStorage.getItem(`easwa:transit-fit:${targetId}`) !== null ||
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
    sessionStorage.removeItem(keyFor(inquiryDraftScope(moduleId, targetId)));
    sessionStorage.removeItem(labKeyFor(targetId));
    sessionStorage.removeItem(`easwa:transit-fit:${targetId}`);

    // Lab step-guide fold state ("easwa_guide_open_<step>_<suffix>") and the
    // workflow snapshot are keyed by step/workflow, not by target — match by
    // prefix and, for the session snapshot, by the target id inside the key.
    Object.keys(localStorage)
      .filter((key) => key.startsWith('easwa_guide_open_'))
      .forEach((key) => localStorage.removeItem(key));

    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('workflow-session:') && key.includes(targetId))
      .forEach((key) => sessionStorage.removeItem(key));

    // Start over = a new learner as far as the sheet is concerned. Keeping the
    // anon id here used to make "same person redoing" one row, but on a shared
    // PC it meant the NEXT learner upserted into the PREVIOUS learner's row and
    // destroyed it. A forked draft row is noise; an overwritten row is data loss.
    sessionStorage.removeItem('easwa:anon-id');
  } catch {
    // Storage unavailable (private mode / quota) — nothing to clear anyway.
  }
}

/**
 * Wipe every learner's in-progress work in this tab, for every target.
 *
 * Used on sign-out: closing the browser already clears session-scoped work, but
 * logging out and staying in the tab did not — so the next person at a shared
 * classroom PC still saw the previous learner's self-check answers and fitted
 * curve (사용자 보고 2026-07-17: "비로그인 상태가 됐는데, 왜 아직도 결과물이 남아있지?").
 *
 * Nothing deliberate is lost: /my records stay on the server, a signed-in
 * learner's analysis lives on in their backend draft, and the anonymous sheet
 * row is already sent. The anon id rotates so the next person is a new row.
 */
export function clearAllLearnerWork(): void {
  try {
    Object.keys(sessionStorage)
      .filter(
        (key) =>
          key.startsWith(KEY_PREFIX) ||
          key.startsWith(LAB_KEY_PREFIX) ||
          key.startsWith('easwa:transit-fit:') ||
          key.startsWith('workflow-session:') ||
          key === 'easwa:anon-id',
      )
      .forEach((key) => sessionStorage.removeItem(key));

    Object.keys(localStorage)
      .filter((key) => key.startsWith('easwa_guide_open_'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/**
 * One-time boot sweep: learner work used to live in localStorage, so browsers
 * that visited before the session-scope change still carry old drafts, fits and
 * the permanent anon id — including notes for fields that no longer exist in the
 * UI (the "D"-spam keys that resurfaced into the sheet on 2026-07-17). Nothing
 * reads these keys any more; delete them so they cannot leak again.
 */
export function sweepLegacyLocalWork(): void {
  try {
    Object.keys(localStorage)
      .filter(
        (key) =>
          key.startsWith(KEY_PREFIX) ||
          key.startsWith(LAB_KEY_PREFIX) ||
          key.startsWith('easwa:transit-fit:') ||
          key === 'easwa:anon-id',
      )
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable — nothing to sweep.
  }
}
