import { describe, expect, it } from 'vitest';
import {
  buildLabHref,
  getExplorerContext,
} from './explorerNavigation';

describe('explorer learning mode navigation', () => {
  it('defaults to guided mode', () => {
    const context = getExplorerContext(
      new URLSearchParams('module=tess&topic=exoplanet_transit'),
    );

    expect(context.learningMode).toBe('guided');
  });

  it('preserves advanced mode in the lab URL', () => {
    const context = getExplorerContext(
      new URLSearchParams('module=tess&topic=exoplanet_transit&level=advanced'),
    );

    expect(
      buildLabHref('WASP-18-b', context, [['workflow', 'transit']]),
    ).toContain('level=advanced');
  });
});
