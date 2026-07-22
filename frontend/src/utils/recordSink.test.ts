import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  anonRecordWorthSyncing,
  buildAnonRecordPayload,
  resolveAppVersion,
  type AnonRecordInput,
} from './recordSink';

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

// F3 — the sheet is the ANONYMOUS sink. `logged_in` tells the researcher whether
// a row came from a signed-in learner (whose deliberate saves also live in /my)
// without ever naming them, so the row stays anonymous. Anyone later tempted to
// "just also send the email" has to delete a failing test to do it.
describe('buildAnonRecordPayload — logged_in', () => {
  const input = (loggedIn: boolean): AnonRecordInput => ({
    targetId: 'wasp_6_b',
    status: 'draft',
    fit: null,
    notes: {},
    selfCheckResponses: [],
    selfCheckAnswered: 0,
    selfCheckTotal: 4,
    selfCheckCorrect: 0,
    labGuideAnswers: {},
    loggedIn,
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubBrowser = () => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    vi.stubGlobal('navigator', { userAgent: 'vitest' });
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
  };

  it('carries the signed-in state as a real boolean, both ways', () => {
    stubBrowser();
    expect(buildAnonRecordPayload(input(true)).logged_in).toBe(true);
    expect(buildAnonRecordPayload(input(false)).logged_in).toBe(false);
  });

  it('never carries anything that identifies the learner', () => {
    stubBrowser();
    const payload = buildAnonRecordPayload(input(true));
    const identityish = /email|mail|name|user_id|userid|picture|avatar|sub|profile/i;
    const leaked = Object.keys(payload).filter(
      // user_agent is an environment string, not an identity — exempt by name.
      (key) => key !== 'user_agent' && identityish.test(key),
    );
    expect(leaked).toEqual([]);
  });

  // F4 — site feedback (app quality) rides on its own columns and stays separate
  // from the learning record; defaults to 0/'' so an untouched panel is silent.
  it('carries optional site feedback, defaulting to empty', () => {
    stubBrowser();
    const blank = buildAnonRecordPayload(input(true));
    expect(blank.site_rating).toBe(0);
    expect(blank.site_feedback).toBe('');

    const withFeedback = buildAnonRecordPayload({ ...input(false), siteRating: 4, siteFeedback: '좋아요' });
    expect(withFeedback.site_rating).toBe(4);
    expect(withFeedback.site_feedback).toBe('좋아요');
  });

  it('caps site feedback length so a giant paste cannot bloat the row', () => {
    stubBrowser();
    const payload = buildAnonRecordPayload({ ...input(false), siteFeedback: 'x'.repeat(5000) });
    expect(payload.site_feedback.length).toBe(2000);
  });
});
