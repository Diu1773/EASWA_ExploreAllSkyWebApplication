import { DEFAULT_TRANSIT_FILTERS, useAppStore } from '../../stores/useAppStore';
import { useLangStore } from '../../i18n';
import type { TransitTargetFilters } from '../../types/target';

const clampNum = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Compact source-filter bar for the embedded sky picker (exoplanet targets).
 * Writes to the shared transitFilters store; useSkyTargets refetches on change.
 */
export function EmbeddedSkyFilters() {
  const lang = useLangStore((s) => s.lang);
  const filters = useAppStore((s) => s.transitFilters);
  const setTransitFilters = useAppStore((s) => s.setTransitFilters);

  const patch = (next: Partial<TransitTargetFilters>) =>
    setTransitFilters({ ...filters, ...next });

  return (
    <div className="sky-embed-filters">
      <span className="sky-embed-filters-title">{lang === 'ko' ? '대상 필터' : 'Filters'}</span>
      <label>
        <span>{lang === 'ko' ? '개수' : 'Max'}</span>
        <input
          type="number"
          min={1}
          max={100}
          value={filters.maxTargets}
          onChange={(e) => patch({ maxTargets: clampNum(Number(e.target.value) || 1, 1, 100) })}
        />
      </label>
      <label>
        <span>{lang === 'ko' ? '최소 식깊이 %' : 'Min depth %'}</span>
        <input
          type="number"
          min={0.1}
          max={10}
          step={0.1}
          value={filters.minDepthPct}
          onChange={(e) => patch({ minDepthPct: clampNum(Number(e.target.value) || 0.1, 0.1, 10) })}
        />
      </label>
      <label>
        <span>{lang === 'ko' ? '최대 주기(일)' : 'Max period (d)'}</span>
        <input
          type="number"
          min={0.2}
          max={30}
          step={0.1}
          value={filters.maxPeriodDays}
          onChange={(e) => patch({ maxPeriodDays: clampNum(Number(e.target.value) || 0.2, 0.2, 30) })}
        />
      </label>
      <label>
        <span>{lang === 'ko' ? '최대 밝기 V' : 'Max V mag'}</span>
        <input
          type="number"
          min={6}
          max={16}
          step={0.1}
          value={filters.maxHostVmag}
          onChange={(e) => patch({ maxHostVmag: clampNum(Number(e.target.value) || 6, 6, 16) })}
        />
      </label>
      <button
        type="button"
        className="btn-sm"
        onClick={() => setTransitFilters(DEFAULT_TRANSIT_FILTERS)}
      >
        {lang === 'ko' ? '초기화' : 'Reset'}
      </button>
    </div>
  );
}
