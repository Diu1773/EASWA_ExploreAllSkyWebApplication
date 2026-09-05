/**
 * "Answer everything on this screen before moving on."
 *
 * Skipping 생각해보기 and record fields is what produced the empty columns in
 * the 2026-07-24 log — 정밀 분석 서술 6문항에 응답 4건, Step 6 「다시 한다면」 0건
 * (docs/survey/앱응답_문제기록_2026-09-04.md P-1·P-2·P-4). The gate makes an
 * explicit "모르겠다" the cheapest way past, which is a usable answer; a blank
 * is not.
 *
 * Off on localhost: building and checking screens means walking through them
 * repeatedly, and filling every box each time makes that impossible. The check
 * is on hostname rather than import.meta.env.PROD because the local 5895 server
 * serves the production build too.
 *
 * `?gate=1` forces it on (so the behaviour can be checked before it ships) and
 * `?gate=0` forces it off (an escape hatch if a session stalls). The choice is
 * remembered for the browser session so it survives the block → Lab hop, which
 * crosses routes.
 */

const OVERRIDE_KEY = 'easwa:answer-gate';

export function isAnswerGateOn(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get('gate');
    if (flag === '1' || flag === '0') {
      sessionStorage.setItem(OVERRIDE_KEY, flag);
      return flag === '1';
    }
    const remembered = sessionStorage.getItem(OVERRIDE_KEY);
    if (remembered === '1' || remembered === '0') return remembered === '1';
  } catch {
    /* private mode or a blocked storage — fall through to the hostname rule */
  }
  try {
    const host = window.location.hostname;
    return !(host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]');
  } catch {
    return false;
  }
}

/** A stored answer counts only when it is a non-empty string that is not an empty list. */
export function isAnswerFilled(raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  const text = String(raw).trim();
  return text !== '' && text !== '[]';
}
