import { useEffect, useState } from 'react';

/**
 * Presenter escape hatch for 생각해보기.
 *
 * The answer gate keeps the 생각해보기 panel open and the "다음" button disabled
 * until every question is answered — which is the point for a learner, and a
 * problem for whoever is demonstrating the app on a projector: they have to
 * solve every self-check in front of the room before they can show the next
 * screen.
 *
 * Turning it off is a **double-click on the 생각해보기 fold button**. A single
 * click keeps its normal meaning (fold / unfold), so a learner who clicks
 * around never finds this; a double-click on a fold button is not something
 * anyone does by accident. Double-click again to turn it back on.
 *
 * Session-scoped on purpose: it survives a reload during the same demo and is
 * gone when the browser closes, so a shared classroom machine cannot inherit
 * it. Same reasoning as the anonymous drafts (utils/inquiryDraft.ts).
 */
const KEY = 'easwa:selfcheck-skip';
const CHANGE_EVENT = 'easwa:selfcheck-skip-change';

export function isSelfCheckSkipOn(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    // Private mode / blocked storage: the gate simply stays on.
    return false;
  }
}

/** Flips the flag and returns the new state. */
export function toggleSelfCheckSkip(): boolean {
  const next = !isSelfCheckSkipOn();
  try {
    if (next) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
  return next;
}

/** Re-renders the caller when the flag changes anywhere on the page. */
export function useSelfCheckSkip(): boolean {
  const [on, setOn] = useState(isSelfCheckSkipOn);
  useEffect(() => {
    const sync = () => setOn(isSelfCheckSkipOn());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  return on;
}
