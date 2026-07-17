import { afterEach, describe, expect, it, vi } from 'vitest';
import { anonRecordWorthSyncing, resolveAppVersion } from './recordSink';

// F1 — the "real class vs local test" tag must never silently collapse to a bare
// `dev` on a deployed host (the 2026-07-17 incident, recurred 2026-07-18: the
// live bundle shipped app_version=dev, so the researcher's `render` filter
// dropped the whole class).
describe('resolveAppVersion', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the explicit build tag when set (production dashboard = render)', () => {
    vi.stubEnv('VITE_APP_VERSION', 'render');
    expect(resolveAppVersion()).toBe('render');
  });

  it('trims a padded build tag', () => {
    vi.stubEnv('VITE_APP_VERSION', '  render  ');
    expect(resolveAppVersion()).toBe('render');
  });

  it('falls back to deployed:<host> when the build tag is missing on a real host', () => {
    vi.stubEnv('VITE_APP_VERSION', '');
    vi.stubGlobal('window', { location: { hostname: 'easwa-webapp.onrender.com' } });
    expect(resolveAppVersion()).toBe('deployed:easwa-webapp.onrender.com');
  });

  it('reports dev only on a genuinely local host', () => {
    vi.stubEnv('VITE_APP_VERSION', '');
    for (const host of ['localhost', '127.0.0.1', 'macbook.local']) {
      vi.stubGlobal('window', { location: { hostname: host } });
      expect(resolveAppVersion()).toBe('dev');
    }
  });

  it('a missing tag on a deployed host is never indistinguishable from dev', () => {
    vi.stubEnv('VITE_APP_VERSION', '');
    vi.stubGlobal('window', { location: { hostname: 'easwa-webapp.onrender.com' } });
    expect(resolveAppVersion()).not.toBe('dev');
  });
});

// F2 — a learner who ran the analysis but wrote nothing must still land their
// rp/rs measurement in the sheet. The old gate keyed on `dirty` alone and
// silently dropped fit-only learners.
describe('anonRecordWorthSyncing', () => {
  it('skips a blank learner (no edits, no fit)', () => {
    expect(anonRecordWorthSyncing(false, false)).toBe(false);
  });

  it('syncs once the learner edits a note or self-check', () => {
    expect(anonRecordWorthSyncing(true, false)).toBe(true);
  });

  it('syncs a fit-only learner — the fit is the headline value', () => {
    expect(anonRecordWorthSyncing(false, true)).toBe(true);
  });

  it('syncs when both are present', () => {
    expect(anonRecordWorthSyncing(true, true)).toBe(true);
  });
});
