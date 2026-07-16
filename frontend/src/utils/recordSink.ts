// Anonymous result submission to the Google Sheets sink (Apps Script Web App).
// Storage is Google Sheets — Render's free-tier filesystem is ephemeral (wiped
// on every deploy/restart), so the server cannot persist submissions itself.
// Receiver: docs/survey/easwa_record_sink.gs

const ANON_ID_KEY = 'easwa:anon-id';
const SUBMITTED_KEY_PREFIX = 'easwa:anon-submitted:';

/** Apps Script Web App URL. Baked in at build time; empty → feature disabled
 *  (button stays visible but disabled, per the "no hidden features" principle). */
export function getRecordSinkUrl(): string | null {
  const url = import.meta.env.VITE_RECORD_SINK_URL as string | undefined;
  return url && url.trim() !== '' ? url.trim() : null;
}

/** Anonymous id: generated once per browser and reused for every submission,
 *  so repeated submissions from the same device can be grouped without login. */
export function getAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ANON_ID_KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (private mode / quota) — one-off id.
    return `anon-${Date.now().toString(36)}`;
  }
}

export function hasSubmittedAnonRecord(targetId: string): boolean {
  try {
    return localStorage.getItem(SUBMITTED_KEY_PREFIX + targetId) !== null;
  } catch {
    return false;
  }
}

export function markAnonRecordSubmitted(targetId: string): void {
  try {
    localStorage.setItem(SUBMITTED_KEY_PREFIX + targetId, String(Date.now()));
  } catch {
    // non-fatal
  }
}

export interface AnonRecordPayload {
  anon_id: string;
  target_id: string;
  /** 'draft' for an autosave, 'submitted' once the learner presses the button.
   *  The sheet upserts on (anon_id, target_id), so a row exists from the first
   *  autosave and the button only flips its status — work is never lost because
   *  someone closed the tab before pressing anything. */
  status: 'draft' | 'submitted';
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
}

/**
 * Upsert the learner's row in the sheet, resolving only once the sheet confirms.
 * Used both for the periodic autosave (status 'draft') and for the explicit
 * submission (status 'submitted') — the script keys on (anon_id, target_id), so
 * repeated calls update one row instead of piling up new ones.
 *
 * CORS note: `text/plain` keeps this a "simple request" so the browser skips the
 * preflight, which Apps Script would not answer. The deployed Web App does send
 * `Access-Control-Allow-Origin: *` on both the /exec 302 and the redirect it
 * points at, so a plain cors request can read the reply (verified 2026-07-16
 * against the live deployment: status 200, body {"ok":true}).
 *
 * This used to be `mode: 'no-cors'`, which made the response opaque and forced
 * an OPTIMISTIC result — a submission that never reached the sheet still showed
 * "제출됨". Reading the real reply is the whole point: a learner who is told
 * their work was submitted when it was not has lost it silently.
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

/** Everything the sheet row needs, minus the bits recordSink fills in itself. */
export interface AnonRecordInput {
  targetId: string;
  status: 'draft' | 'submitted';
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
    app_version: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev',
    user_agent: navigator.userAgent.slice(0, 160),
  };
}
