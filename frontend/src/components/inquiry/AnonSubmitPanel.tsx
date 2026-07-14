import { useEffect, useState } from 'react';
import { useLangStore } from '../../i18n';
import {
  getAnonId,
  getRecordSinkUrl,
  hasSubmittedAnonRecord,
  markAnonRecordSubmitted,
  submitAnonRecord,
} from '../../utils/recordSink';

/** Fit values needed for the anonymous submission. Structurally compatible
 *  with SavedTransitFit (workflows/transit/fitBridge) so callers pass it as-is. */
export interface AnonSubmitFit {
  rpRs: number;
  rpRsErr: number;
  period: number;
  reducedChiSquared: number;
}

export interface AnonSubmitConfig {
  targetId: string;
  /** null until the Lab fit is bridged back — button stays disabled. */
  fit: AnonSubmitFit | null;
}

interface AnonSubmitPanelProps {
  config: AnonSubmitConfig;
  /** Step-6 reflection notes (InquiryLayout notes state), keyed by prompt id. */
  notes: Record<string, string>;
}

type SubmitState = 'idle' | 'sending' | 'done';

/**
 * Anonymous, no-login result submission (Step 6). Sends the bridged transit
 * fit + reflection notes to the Google Sheets sink (Apps Script Web App) —
 * Render's free filesystem is ephemeral, so the sheet is the only persistent
 * store for anonymous submissions. Complements the login-gated RecordSavePanel.
 */
export function AnonSubmitPanel({ config, notes }: AnonSubmitPanelProps) {
  const lang = useLangStore((s) => s.lang);
  const sinkUrl = getRecordSinkUrl();
  const [state, setState] = useState<SubmitState>('idle');

  // Duplicate-submission guard persists across reloads (localStorage flag).
  useEffect(() => {
    setState(hasSubmittedAnonRecord(config.targetId) ? 'done' : 'idle');
  }, [config.targetId]);

  const disabledReason = !sinkUrl
    ? lang === 'ko'
      ? '제출 서버 미설정 — 관리자가 VITE_RECORD_SINK_URL을 설정해야 합니다.'
      : 'Submission server not configured — set VITE_RECORD_SINK_URL.'
    : !config.fit
      ? lang === 'ko'
        ? '분석 완료 후 제출할 수 있습니다.'
        : 'Finish the Lab analysis first, then submit.'
      : null;

  const handleSubmit = async () => {
    if (!sinkUrl || !config.fit || state !== 'idle') return;
    setState('sending');
    const fit = config.fit;
    try {
      await submitAnonRecord(sinkUrl, {
        anon_id: getAnonId(),
        target_id: config.targetId,
        rp_rs: fit.rpRs,
        rp_rs_err: fit.rpRsErr,
        depth_pct: fit.rpRs * fit.rpRs * 100,
        period_days: fit.period,
        chi2_red: fit.reducedChiSquared,
        steps_note_json: JSON.stringify(notes),
        app_version: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev',
        user_agent: navigator.userAgent.slice(0, 160),
      });
      // Optimistic: with no-cors the response is opaque, so reaching here only
      // means the request was dispatched (see recordSink.ts).
      markAnonRecordSubmitted(config.targetId);
      setState('done');
    } catch {
      setState('idle');
    }
  };

  const buttonLabel =
    state === 'done'
      ? lang === 'ko'
        ? '제출됨'
        : 'Submitted'
      : state === 'sending'
        ? lang === 'ko'
          ? '제출 중…'
          : 'Submitting…'
        : lang === 'ko'
          ? '결과 제출 (익명)'
          : 'Submit Result (Anonymous)';

  return (
    <section className="inquiry-record-save inquiry-anon-submit">
      <span className="inquiry-panel-kicker">
        {lang === 'ko' ? '결과 제출 (익명)' : 'Anonymous Submission'}
      </span>
      {state === 'done' ? (
        <p className="inquiry-record-save-done">
          {lang === 'ko'
            ? '제출되었습니다 — 익명으로 수집되어 수업·연구 개선에만 사용됩니다.'
            : 'Submitted — collected anonymously, used only to improve the lessons.'}
        </p>
      ) : (
        <>
          <p>
            {lang === 'ko'
              ? '로그인 없이 측정 결과(RP/R*·식깊이·주기)와 탐구 기록을 익명으로 제출합니다. 개인 정보는 수집하지 않습니다.'
              : 'Submit your measured values (RP/R*, depth, period) and notes anonymously — no login, no personal data.'}
          </p>
          <button
            type="button"
            className="btn-secondary"
            disabled={disabledReason !== null || state === 'sending'}
            title={disabledReason ?? undefined}
            onClick={handleSubmit}
          >
            {buttonLabel}
          </button>
          {disabledReason && <p className="inquiry-record-save-hint">{disabledReason}</p>}
        </>
      )}
    </section>
  );
}
