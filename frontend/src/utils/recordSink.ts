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
  rp_rs: number;
  rp_rs_err: number;
  depth_pct: number;
  period_days: number;
  chi2_red: number;
  /** All Step-6 reflection textareas bundled as one JSON string. */
  steps_note_json: string;
  /** "생각해보기" responses: [{step, id, answer, correct}, …] as a JSON string. */
  selfcheck_json: string;
  /** Denormalised counts so the sheet can be summarised without parsing JSON. */
  selfcheck_answered: number;
  selfcheck_total: number;
  selfcheck_correct: number;
  app_version: string;
  user_agent: string;
}

/**
 * POST to the Apps Script sink.
 *
 * CORS note: Apps Script Web Apps don't answer preflight (OPTIONS) requests,
 * so we avoid triggering one — `text/plain` keeps this a "simple request" and
 * `mode: 'no-cors'` lets the browser send it cross-origin regardless.
 * The trade-off: the response is opaque (status/body unreadable), so success
 * is OPTIMISTIC — resolving here means "the request was dispatched", not
 * "the row was appended". Delivery is verified by checking the sheet.
 */
export async function submitAnonRecord(sinkUrl: string, payload: AnonRecordPayload): Promise<void> {
  await fetch(sinkUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
}
