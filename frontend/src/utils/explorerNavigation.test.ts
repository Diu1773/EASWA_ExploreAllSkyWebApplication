import { describe, expect, it } from 'vitest';
import {
  alignExplorerContext,
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

  it('keeps the CMD inquiry topic for variable and eclipsing-binary targets', () => {
    const context = getExplorerContext(
      new URLSearchParams('module=explorer&topic=stellar_cmd&level=guided'),
    );
    const aligned = alignExplorerContext(context, 'variable_star');

    expect(aligned.topicId).toBe('stellar_cmd');
    expect(buildLabHref('delta_cep', aligned)).toContain('topic=stellar_cmd');
  });
});
