import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { useLangStore } from '../../i18n';

// Chrome / Firefox / Safari word the stale-chunk failure differently.
const CHUNK_ERROR_RE =
  /(Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed)/i;

const RELOAD_FLAG_KEY = 'easwa:route-error-reload';
const RELOAD_FLAG_WINDOW_MS = 15_000;

/**
 * Replaces react-router's default "Hey developer 👋" screen.
 *
 * The error that actually reaches learners is the stale-chunk one: every deploy
 * swaps the container and the old content-hashed assets vanish, so a tab opened
 * before the deploy crashes the moment it lazy-loads a chunk. That case heals
 * itself with one reload (fresh index.html → fresh chunk names) — do it
 * automatically, with a time-windowed flag so a genuinely broken network cannot
 * reload-loop. Everything else gets a calm Korean explanation and a way out,
 * instead of an English developer hint.
 */
export function RouteErrorScreen() {
  const error = useRouteError();
  const lang = useLangStore((s) => s.lang);

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'statusText' in error
        ? String((error as { statusText?: unknown }).statusText ?? '')
        : String(error ?? '');
  const isStaleChunk = CHUNK_ERROR_RE.test(message);

  useEffect(() => {
    if (!isStaleChunk) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) ?? 0);
      if (Date.now() - last > RELOAD_FLAG_WINDOW_MS) {
        sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // Storage unavailable — leave the manual reload button to the user.
    }
  }, [isStaleChunk]);

  return (
    <div className="route-error-screen">
      <h1>
        {isStaleChunk
          ? lang === 'ko'
            ? '앱이 새 버전으로 업데이트되었습니다'
            : 'The app was just updated'
          : lang === 'ko'
            ? '문제가 발생했습니다'
            : 'Something went wrong'}
      </h1>
      <p>
        {isStaleChunk
          ? lang === 'ko'
            ? '이전 화면이 남아 있어 새로 불러와야 합니다. 잠시 후 자동으로 새로고침되며, 되지 않으면 아래 버튼을 눌러주세요. 작성 중이던 기록은 이 브라우저에 저장되어 있습니다.'
            : 'This tab was opened before the update and needs a refresh. It will reload automatically; if not, use the button below. Your notes are saved in this browser.'
          : lang === 'ko'
            ? '화면을 표시하는 중 오류가 발생했습니다. 새로고침하면 대부분 해결됩니다. 작성 중이던 기록은 이 브라우저에 저장되어 있습니다.'
            : 'An error occurred while rendering this page. A refresh usually fixes it. Your notes are saved in this browser.'}
      </p>
      <div className="route-error-actions">
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          {lang === 'ko' ? '새로고침' : 'Reload'}
        </button>
        <a className="btn-secondary" href="/">
          {lang === 'ko' ? '홈으로' : 'Go home'}
        </a>
      </div>
      {!isStaleChunk && message && <code className="route-error-detail">{message.slice(0, 300)}</code>}
    </div>
  );
}
