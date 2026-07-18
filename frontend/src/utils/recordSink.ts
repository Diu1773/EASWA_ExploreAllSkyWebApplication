// Anonymous result submission to the Google Sheets sink (Apps Script Web App).
// Storage is Google Sheets — Render's free-tier filesystem is ephemeral (wiped
// on every deploy/restart), so the server cannot persist submissions itself.
// Receiver: docs/survey/easwa_record_sink.gs

const ANON_ID_KEY = 'easwa:anon-id';

/** Apps Script Web App URL. Baked in at build time; empty → the sheet sync is
 *  simply skipped and records stay in this browser only. */
export function getRecordSinkUrl(): string | null {
  const url = import.meta.env.VITE_RECORD_SINK_URL as string | undefined;
  return url && url.trim() !== '' ? url.trim() : null;
}

/** Anonymous id: one per browser session, reused within it so every sync from
 *  the same sitting upserts the same sheet row. Deliberately NOT per-browser
 *  (localStorage): on a shared classroom PC a permanent id made learner B's
 *  upserts overwrite learner A's row for the same target. One sitting = one
 *  learner = one row; a new session mints a new id and forks a new row. */
export function getAnonId(): string {
  try {
    const existing = sessionStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(ANON_ID_KEY, fresh);
    return fresh;
  } catch {
    // Storage unavailable (private mode / quota) — one-off id.
    return `anon-${Date.now().toString(36)}`;
  }
}

export interface AnonRecordPayload {
  anon_id: string;
  target_id: string;
  /** Always 'draft': there is no submit button any more — records upload as they
   *  are written. Kept as a column so a future explicit "done" action has a place
   *  to land without a sheet migration. */
  status: 'draft';
  /** null until the Lab fit is bridged back — a draft row can precede the fit. */
  rp_rs: number | null;
  rp_rs_err: number | null;
  depth_pct: number | null;
  period_days: number | null;
  chi2_red: number | null;
  /** All Step-6 reflection textareas bundled as one JSON string. */
  steps_note_json: string;
  /** Block "생각해보기" responses: [{step, id, answer, correct}, …] as JSON. */
  selfcheck_json: string;
  /** Denormalised counts so the sheet can be summarised without parsing JSON. */
  selfcheck_answered: number;
  selfcheck_total: number;
  selfcheck_correct: number;
  /** The Lab's own step-guide answers (O/X, choice, short text), {qid: answer}. */
  lab_guide_json: string;
  lab_guide_answered: number;
  app_version: string;
  user_agent: string;
  /**
   * Whether a Google account was signed in when the row was written.
   *
   * A BOOLEAN ONLY — never the email, name or user id. The sheet is the
   * anonymous sink and stays anonymous; this just lets the researcher tell
   * "logged-in learner whose deliberate saves also live in /my" apart from
   * "anonymous sitting that exists nowhere else", which changes how a row
   * should be read (a logged-in learner's blank notes may simply mean they
   * kept working in their account).
   */
  logged_in: boolean;
}

/**
 * Upsert the learner's row in the sheet, resolving only once the sheet confirms.
 * Called on a debounce as the learner writes; the script keys on
 * (anon_id, target_id), so repeated calls refresh one row instead of piling up.
 *
 * CORS note: `text/plain` keeps this a "simple request" so the browser skips the
 * preflight, which Apps Script would not answer. The deployed Web App does send
 * `Access-Control-Allow-Origin: *` on both the /exec 302 and the redirect it
 * points at, so a plain cors request can read the reply (verified 2026-07-16
 * against the live deployment: status 200, body {"ok":true}).
 *
 * Reading the real reply matters even without a submit button: it is how the UI
 * can honestly say "saved in this browser only" when the upload fails, instead
 * of claiming an upload that never happened.
 */
export async function syncAnonRecord(sinkUrl: string, payload: AnonRecordPayload): Promise<void> {
  const response = await fetch(sinkUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`sink responded ${response.status}`);
  }

  // The script answers {ok:true} on append, {ok:false,error:…} on bad input.
  const text = await response.text();
  let parsed: { ok?: boolean; error?: string };
  try {
    parsed = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    // A login page or Google error page instead of JSON — most often the Web App
    // was deployed with access limited to the owner rather than "모든 사용자".
    throw new Error('sink did not return JSON — check the Web App access setting');
  }

  if (parsed.ok !== true) {
    throw new Error(parsed.error ?? 'sink rejected the submission');
  }
}

/** Fit values the sheet row carries. Structurally compatible with
 *  SavedTransitFit (workflows/transit/fitBridge) so callers pass it as-is. */
export interface AnonSubmitFit {
  rpRs: number;
  rpRsErr: number;
  period: number;
  reducedChiSquared: number;
}

/** What a block needs to declare for its records to reach the sheet. */
export interface AnonSubmitConfig {
  targetId: string;
  /** null until the Lab fit is bridged back — a draft row can precede it. */
  fit: AnonSubmitFit | null;
}

/** "생각해보기" responses, already graded by InquiryLayout (which owns the
 *  module config holding the correct answers). */
export interface SelfCheckSummary {
  responses: Array<{ step: string; id: string; answer: string | number; correct: boolean }>;
  /** Number of self-check items the module defines, answered or not. */
  total: number;
  answered: number;
  correct: number;
}

/** Everything the sheet row needs, minus the bits recordSink fills in itself. */
export interface AnonRecordInput {
  targetId: string;
  status: 'draft';
  fit: {
    rpRs: number;
    rpRsErr: number;
    period: number;
    reducedChiSquared: number;
  } | null;
  notes: Record<string, string>;
  selfCheckResponses: unknown;
  selfCheckAnswered: number;
  selfCheckTotal: number;
  selfCheckCorrect: number;
  labGuideAnswers: Record<string, string>;
  /** Signed-in state at write time. Passed in rather than read from the auth
   *  store here so this module stays a pure shaper (and unit-testable). */
  loggedIn: boolean;
}

/**
 * How the sheet tells real classroom data from local test rows.
 *
 * Primary source is the build-time VITE_APP_VERSION (set to `render` on the
 * deployed service). But that variable lives on the Render dashboard, is baked
 * in at build, and fails SILENTLY when forgotten: the row still uploads, just
 * tagged `dev`, so it blends into local test noise and the researcher's
 * `app_version == 'render'` filter drops the whole class (happened 2026-07-17,
 * recurred 2026-07-18 — the live bundle shipped `dev`).
 *
 * So when the build tag is missing we do NOT fall back to a bare `dev`: we read
 * the runtime host. A non-localhost host is a real deployment, and tagging it
 * `deployed:<host>` keeps it visibly distinct from `dev` — a forgotten variable
 * can never again make live traffic indistinguishable from a test.
 */
export function resolveAppVersion(): string {
  const built = (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim();
  if (built) return built;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal =
      host === 'localhost' || host === '127.0.0.1' || host === '' || host.endsWith('.local');
    return isLocal ? 'dev' : `deployed:${host}`;
  }
  return 'dev';
}

/**
 * Whether the anonymous row is worth pushing to the sheet.
 *
 * A learner counts as having done something if they edited a note/self-check
 * (dirty) OR the Lab produced a fit — the rp/rs measurement is the headline
 * research value, so a learner who ran the analysis but wrote nothing must still
 * reach the sheet. Neither → nothing to send, so the empty row stays skipped.
 * (Extracted as a pure predicate so this rule is unit-tested — the old code
 *  gated on `dirty` alone and silently dropped fit-only learners.)
 */
export function anonRecordWorthSyncing(dirty: boolean, hasFit: boolean): boolean {
  return dirty || hasFit;
}

/** Single place that shapes the row, so an autosave and a submission can never
 *  disagree about what a record looks like. */
export function buildAnonRecordPayload(input: AnonRecordInput): AnonRecordPayload {
  const { fit } = input;
  return {
    anon_id: getAnonId(),
    target_id: input.targetId,
    status: input.status,
    rp_rs: fit ? fit.rpRs : null,
    rp_rs_err: fit ? fit.rpRsErr : null,
    depth_pct: fit ? fit.rpRs * fit.rpRs * 100 : null,
    period_days: fit ? fit.period : null,
    chi2_red: fit ? fit.reducedChiSquared : null,
    steps_note_json: JSON.stringify(input.notes),
    selfcheck_json: JSON.stringify(input.selfCheckResponses),
    selfcheck_answered: input.selfCheckAnswered,
    selfcheck_total: input.selfCheckTotal,
    selfcheck_correct: input.selfCheckCorrect,
    lab_guide_json: JSON.stringify(input.labGuideAnswers),
    lab_guide_answered: Object.values(input.labGuideAnswers).filter(
      (answer) => typeof answer === 'string' && answer.trim() !== '',
    ).length,
    app_version: resolveAppVersion(),
    user_agent: navigator.userAgent.slice(0, 160),
    logged_in: input.loggedIn,
  };
}
