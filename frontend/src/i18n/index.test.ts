import { describe, expect, it } from 'vitest';
import { getT, strings } from './index';

describe('i18n strings', () => {
  it('keeps Korean and English translation keys in sync', () => {
    expect(Object.keys(strings.ko).sort()).toEqual(Object.keys(strings.en).sort());
  });

  it('returns the selected language and uses the supplied fallback', () => {
    expect(getT('en')('nav.home')).toBe('Home');
    expect(getT('en')('missing.key', 'Fallback')).toBe('Fallback');
  });
});
