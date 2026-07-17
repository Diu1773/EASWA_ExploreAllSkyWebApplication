import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RETRY_FLAG_PREFIX = 'easwa:chunk-retry:';

/**
 * React.lazy that survives a deploy.
 *
 * Chunk filenames are content-hashed and the old container's assets vanish on
 * every Render deploy, so a tab opened before the deploy asks for a chunk that
 * no longer exists the moment it first needs it (e.g. Step 0's 3D scene) — and
 * crashes into the router's error screen. One hard reload fetches the new
 * index.html with the new chunk names and recovers silently; a sessionStorage
 * flag stops a reload loop when the fetch keeps failing (offline, mid-deploy).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.lazy's
// own signature; props variance needs `any` here.
export function lazyWithRetry<T extends ComponentType<any>>(
  chunkName: string,
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const flagKey = RETRY_FLAG_PREFIX + chunkName;
    try {
      const mod = await factory();
      try {
        sessionStorage.removeItem(flagKey);
      } catch {
        // storage unavailable — retry bookkeeping just degrades
      }
      return mod;
    } catch (error) {
      let alreadyRetried = false;
      try {
        alreadyRetried = sessionStorage.getItem(flagKey) !== null;
        if (!alreadyRetried) sessionStorage.setItem(flagKey, String(Date.now()));
      } catch {
        // without storage we cannot guard a loop — fall through to the throw
        alreadyRetried = true;
      }
      if (!alreadyRetried) {
        window.location.reload();
        // Keep the Suspense boundary pending while the reload takes over.
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}
