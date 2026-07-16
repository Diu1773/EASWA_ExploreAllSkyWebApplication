import { useEffect, useState } from 'react';
import { useLangStore } from '../../i18n';
import {
  buildAnonRecordPayload,
  getRecordSinkUrl,
  hasSubmittedAnonRecord,
  markAnonRecordSubmitted,
  syncAnonRecord,
} from '../../utils/recordSink';
import { loadLabDraft } from '../../utils/inquiryDraft';

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

/** "생각해보기" responses collected across the steps, already graded by
 *  InquiryLayout (which owns the module config holding the correct answers). */
export interface SelfCheckSummary {
  responses: Array<{ step: string; id: string; answer: string | number; correct: boolean }>;
  /** Number of self-check items the module defines, answered or not. */
  total: number;
  answered: number;
  correct: number;
}

interface AnonSubmitPanelProps {
  config: AnonSubmitConfig;
  /** Step-6 reflection notes (InquiryLayout notes state), keyed by prompt id. */
  notes: Record<string, string>;
  selfCheck: SelfCheckSummary;
}

type SubmitState = 'idle' | 'sending' | 'done';

/**
 * Anonymous, no-login result submission (Step 6). Sends the bridged transit
 * fit + reflection notes to the Google Sheets sink (Apps Script Web App) —
 * Render's free filesystem is ephemeral, so the sheet is the only persistent
 * store for anonymous submissions. Complements the login-gated RecordSavePanel.
 */
export function AnonSubmitPanel({ config, notes, selfCheck }: AnonSubmitPanelProps) {
  const lang = useLangStore((s) => s.lang);
  const sinkUrl = getRecordSinkUrl();
  const [state, setState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const writtenNoteCount = Object.values(notes).filter((note) => note.trim() !== '').length;
  // The Lab keeps its own "생각해보기" answers (O/X, choice, short text) in its
  // draft — a separate store from the block's notes, so they were never reaching
  // the sheet. Read them at submit time rather than threading state through the
  // Lab, which lives in a different React tree on the /lab route.
  const labGuideAnswers = loadLabDraft(config.targetId)?.guideAnswers ?? {};
  const labGuideCount = Object.values(labGuideAnswers).filter(
    (answer) => typeof answer === 'string' && answer.trim() !== '',
  ).length;

  // Duplicate-submission guard persists across reloads (localStorage flag).
  useEffect(() => {
    setState(hasSubmittedAnonRecord(config.targetId) ? 'done' : 'idle');
    setSubmitError(null);
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
    setSubmitError(null);
    setState('sending');
    const fit = config.fit;
    try {
      // Same row the autosave has been refreshing all along — this only flips it
      // to status 'submitted'.
      await syncAnonRecord(
        sinkUrl,
        buildAnonRecordPayload({
          targetId: config.targetId,
          status: 'submitted',
          fit,
          notes,
          selfCheckResponses: selfCheck.responses,
          selfCheckAnswered: selfCheck.answered,
          selfCheckTotal: selfCheck.total,
          selfCheckCorrect: selfCheck.correct,
          labGuideAnswers,
        }),
      );
      // Reaching here means the sheet answered {ok:true} — the row exists.
      markAnonRecordSubmitted(config.targetId);
      setState('done');
    } catch (error) {
      // Surface it. Silently dropping back to idle looked identical to "not
      // pressed yet", so a learner would walk away believing they submitted.
      setSubmitError(error instanceof Error ? error.message : String(error));
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

          {/* What actually goes in the row. Shown before sending because the
              submission is otherwise invisible — and because learners who wrote
              notes but never pressed the button lose all of it silently. */}
          <dl className="inquiry-submit-summary">
            <div>
              <dt>{lang === 'ko' ? '측정 결과' : 'Measured values'}</dt>
              <dd>
                {config.fit
                  ? `Rp/R* ${config.fit.rpRs.toFixed(4)} · ${lang === 'ko' ? '식깊이' : 'depth'} ${(
                      config.fit.rpRs * config.fit.rpRs * 100
                    ).toFixed(2)}%`
                  : lang === 'ko'
                    ? '분석 미완료'
                    : 'Analysis not finished'}
              </dd>
            </div>
            <div>
              <dt>{lang === 'ko' ? '탐구 기록' : 'Inquiry notes'}</dt>
              <dd>
                {lang === 'ko'
                  ? `${writtenNoteCount}개 문항 작성`
                  : `${writtenNoteCount} answered`}
              </dd>
            </div>
            <div>
              <dt>{lang === 'ko' ? '생각해보기 (탐구 단계)' : 'Self-checks (block)'}</dt>
              <dd>
                {selfCheck.answered} / {selfCheck.total} {lang === 'ko' ? '응답' : 'answered'}
              </dd>
            </div>
            <div>
              <dt>{lang === 'ko' ? '생각해보기 (정밀 분석)' : 'Self-checks (Lab)'}</dt>
              <dd>
                {labGuideCount} {lang === 'ko' ? '응답' : 'answered'}
              </dd>
            </div>
          </dl>

          <p className="inquiry-submit-pending">
            {lang === 'ko'
              ? '기록은 작성하는 대로 자동 전송되고 있습니다 — 아래 버튼은 “다 했다”는 표시입니다.'
              : 'Your notes upload automatically as you write — this button just marks them final.'}
          </p>

          {submitError && (
            <p className="inquiry-submit-error">
              {lang === 'ko'
                ? '제출하지 못했습니다 — 기록은 이 브라우저에 남아 있으니 다시 눌러 주세요.'
                : 'Submission failed — your notes are still saved in this browser, please try again.'}
              <span>{submitError}</span>
            </p>
          )}

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
