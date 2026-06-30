import { useEffect, useState } from 'react';
import { fetchTargets } from '../api/client';
import { useAppStore } from '../stores/useAppStore';
import type { Target } from '../types/target';

export function useSkyTargets() {
  const [targets, setTargets] = useState<Target[]>([]);
  // Full unfiltered catalog for the topic — lets name search find any target,
  // even ones the property filters (depth/period/magnitude) currently exclude.
  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedTopic = useAppStore((s) => s.selectedTopic);
  const transitFilters = useAppStore((s) => s.transitFilters);

  // Filtered set drives the map markers; refetches when the user changes filters.
  useEffect(() => {
    let cancelled = false;

    if (!selectedTopic) {
      setTargets([]);
      return () => { cancelled = true; };
    }

    setLoading(true);
    fetchTargets(
      selectedTopic,
      selectedTopic === 'exoplanet_transit' ? transitFilters : undefined
    )
      .then((nextTargets) => {
        if (!cancelled) setTargets(nextTargets);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load targets', error);
          setTargets([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedTopic, transitFilters]);

  // Full catalog (no property filters) for search; only depends on the topic.
  useEffect(() => {
    let cancelled = false;

    if (!selectedTopic) {
      setAllTargets([]);
      return () => { cancelled = true; };
    }

    fetchTargets(selectedTopic)
      .then((all) => {
        if (!cancelled) setAllTargets(all);
      })
      .catch(() => {
        // Search falls back to the filtered set if the full fetch fails.
        if (!cancelled) setAllTargets([]);
      });

    return () => { cancelled = true; };
  }, [selectedTopic]);

  return { targets, allTargets, loading, selectedTopic };
}
