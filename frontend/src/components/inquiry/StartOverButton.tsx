import { useEffect, useRef, useState } from 'react';
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
 * Wipes this target's autosaved work (and the session's anon id) and reloads.
 *
 * Work is session-scoped now, so closing the browser already gives the next
 * learner a clean start. This button covers the same-tab cases: handing over
 * the PC without closing it, or redoing a target from scratch.
 *
 * Two-step confirm rather than window.confirm: this throws away real work, and a
 * native dialog is easy to dismiss on reflex. The second press is a different
 * label in the danger colour, so nobody destroys a record by muscle memory.
 */
export function StartOverButton({ moduleId, targetId, savedAt }: StartOverButtonProps) {
  const lang = useLangStore((s) => s.lang);
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<number | null>(null);
  // Re-checked on every autosave and target change. The block's notes are only
  // one of the stores: a learner who ran the analysis but wrote nothing still
  // leaves a Lab draft and a fitted curve behind for the next person.
  const hasWork = hasTargetWork(moduleId, targetId);

  // Disarm on its own — a half-pressed destructive control should not sit there
  // waiting for an accidental second click minutes later.
  useEffect(() => {
    if (!armed) return;
    timerRef.current = window.setTimeout(() => setArmed(false), 5000);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [armed]);

  // savedAt is not read directly — it is the signal to re-evaluate hasWork.
  void savedAt;

  if (!targetId || !hasWork) return null;

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    clearTargetWork(moduleId, targetId);
    // Reload rather than reset React state: the notes, self-checks, Lab guide
    // answers and workflow snapshot are spread across several trees, and a fresh
    // mount is the only way to be sure none of them survives in memory.
    window.location.reload();
  };

  return (
    <button
      type="button"
      className={`inquiry-start-over${armed ? ' armed' : ''}`}
      onClick={handleClick}
      title={
        lang === 'ko'
          ? '이 대상에 대해 저장된 기록·생각해보기·분석 결과를 모두 지우고, 다음 사람의 새 기록으로 시작합니다.'
          : 'Delete every note, self-check answer and analysis result for this target, and start a fresh record for the next person.'
      }
    >
      {armed
        ? lang === 'ko'
          ? '정말 지울까요? 다시 누르면 삭제'
          : 'Delete everything? Press again'
        : lang === 'ko'
          ? '기록 지우고 새로 시작'
          : 'Clear and start over'}
    </button>
  );
}
