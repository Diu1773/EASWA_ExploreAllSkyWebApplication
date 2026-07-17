import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteMyWorkflowDraft } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLangStore } from '../../i18n';
import { clearTargetWork, hasTargetWork } from '../../utils/inquiryDraft';

interface StartOverButtonProps {
  moduleId: string;
  targetId: string | null | undefined;
  /** Bumps whenever the layout autosaves, so the button appears as soon as there
   *  is something to clear rather than only on the next mount. */
  savedAt: number | null;
}

/**
 * Wipes this target's in-progress work and starts the learner over at Step 0.
 *
 * Work is session-scoped, so closing the browser already gives the next learner
 * a clean start. This button covers the same-tab cases: handing over the PC
 * without closing it, or redoing a target from scratch.
 *
 * Boundary (사용자 결정 2026-07-17): deliberate saves survive, in-progress work
 * does not. So 기록보관함(/my) records are untouched, while the browser stores,
 * the anon id, AND the logged-in learner's backend draft all go. Clearing only
 * the browser used to be a lie for signed-in users: the draft id stayed in the
 * URL, so the reload restored from the server what the click had just deleted.
 *
 * Two-step confirm rather than window.confirm: this throws away real work, and a
 * native dialog is easy to dismiss on reflex. The second press is a different
 * label in the danger colour, so nobody destroys a record by muscle memory.
 */
export function StartOverButton({ moduleId, targetId, savedAt }: StartOverButtonProps) {
  const lang = useLangStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const [armed, setArmed] = useState(false);
  const [clearing, setClearing] = useState(false);
  const timerRef = useRef<number | null>(null);
  // Re-checked on every autosave and target change. The block's notes are only
  // one of the stores: a learner who ran the analysis but wrote nothing still
  // leaves a Lab draft and a fitted curve behind for the next person.
  const hasWork = hasTargetWork(moduleId, targetId);

  // Disarm on its own — a half-pressed destructive control should not sit there
  // waiting for an accidental second click minutes later.
  useEffect(() => {
    if (!armed || clearing) return;
    timerRef.current = window.setTimeout(() => setArmed(false), 5000);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [armed, clearing]);

  // savedAt is not read directly — it is the signal to re-evaluate hasWork.
  void savedAt;

  const draftId = searchParams.get('draft');
  // A logged-in learner always carries a draft id, so hide the button only when
  // there is genuinely nothing anywhere.
  if (!targetId || (!hasWork && !(draftId && user))) return null;

  const handleClick = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setClearing(true);

    // Server first: if this fails we still clear locally, but the learner would
    // otherwise reload straight back into the state they asked us to delete.
    if (draftId && user) {
      try {
        await deleteMyWorkflowDraft(draftId);
      } catch {
        // Already gone (404) or offline — the URL strip below still prevents a
        // restore, and the next autosave would only re-create an empty draft.
      }
    }

    clearTargetWork(moduleId, targetId);

    // Drop the draft/step params and hard-navigate. Not reload(): the draft id
    // in the URL is exactly what re-hydrates the deleted state, and dropping
    // blockStep returns the learner to Step 0 — which is what "새로 시작" means.
    // A full navigation (not React state reset) is the only way to be sure none
    // of the several trees keeps a copy in memory.
    const next = new URLSearchParams(window.location.search);
    next.delete('draft');
    next.delete('seedRecord');
    next.delete('record');
    next.delete('blockStep');
    next.delete('step');
    const query = next.toString();
    window.location.replace(window.location.pathname + (query ? `?${query}` : ''));
  };

  return (
    <button
      type="button"
      className={`inquiry-start-over${armed ? ' armed' : ''}`}
      onClick={handleClick}
      disabled={clearing}
      title={
        lang === 'ko'
          ? '이 대상의 기록·생각해보기·분석 결과를 모두 지우고 Step 1부터 새로 시작합니다. 이미 저장한 기록(내 기록)은 그대로 남습니다.'
          : 'Delete every note, self-check answer and analysis result for this target and start again from Step 1. Records you already saved to My Records are kept.'
      }
    >
      {clearing
        ? lang === 'ko'
          ? '지우는 중…'
          : 'Clearing…'
        : armed
          ? lang === 'ko'
            ? '정말 지울까요? 다시 누르면 삭제'
            : 'Delete everything? Press again'
          : lang === 'ko'
            ? '기록 지우고 새로 시작'
            : 'Clear and start over'}
    </button>
  );
}
