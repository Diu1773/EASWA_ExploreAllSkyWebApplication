import { useEffect, useRef, useState } from 'react';
import { AladinViewer, type AladinViewerHandle } from './AladinViewer';
import { TopicSidebar } from './TopicSidebar';
import { TargetPopup } from './TargetPopup';
import { EmbeddedSkyFilters } from './EmbeddedSkyFilters';
import { useAppStore } from '../../stores/useAppStore';
import { useSkyTargets } from '../../hooks/useSkyTargets';
import type { Target } from '../../types/target';
import { useT } from '../../i18n';

interface SkyExplorerProps {
  embedded?: boolean;
  onSelectTarget?: (target: Target) => void;
  /** Externally selected target (recommended-pick button, ?target= deep link).
   *  The map slews to it — clicking ON the map already self-frames, but those
   *  paths bypass the map entirely and used to leave it pointing elsewhere. */
  focusTarget?: Target | null;
}

export function SkyExplorer({ embedded = false, onSelectTarget, focusTarget }: SkyExplorerProps) {
  const { targets, allTargets, loading, selectedTopic } = useSkyTargets();
  const t = useT();
  const [nameSearch, setNameSearch] = useState('');
  const [popupTarget, setPopupTarget] = useState<Target | null>(null);
  const [gotoMessage, setGotoMessage] = useState<string | null>(null);
  const [gotoMessageTone, setGotoMessageTone] = useState<'info' | 'error' | null>(null);
  const [gotoInProgress, setGotoInProgress] = useState(false);
  const [gotoReadyTargetId, setGotoReadyTargetId] = useState<string | null>(null);
  const setCurrentTarget = useAppStore((s) => s.setCurrentTarget);
  const viewerRef = useRef<AladinViewerHandle>(null);

  const q = nameSearch.trim().toLowerCase();
  // Search runs over the full catalog (not just the filter-passing markers) so a
  // learner can always find the same target the instructor names, then click it.
  const searchPool = allTargets.length > 0 ? allTargets : targets;
  const filteredTargets = q
    ? searchPool.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.constellation.toLowerCase().includes(q)
      )
    : targets;
  const searchEmpty = q.length > 0 && filteredTargets.length === 0;

  useEffect(() => {
    setPopupTarget(null);
    setGotoMessage(null);
    setGotoMessageTone(null);
    setGotoInProgress(false);
    setGotoReadyTargetId(null);
    setCurrentTarget(null);
    setNameSearch('');
  }, [selectedTopic]);

  // Slew to an externally chosen target. Aladin initializes asynchronously and
  // gotoTarget throws until it is up, so retry briefly instead of giving up on
  // the first mount (the recommended-pick click usually lands before A.init).
  const focusTargetId = focusTarget?.id ?? null;
  useEffect(() => {
    if (!focusTarget) return;
    let cancelled = false;
    let attempts = 0;
    const tryGoto = () => {
      if (cancelled) return;
      attempts += 1;
      const viewer = viewerRef.current;
      if (viewer) {
        viewer.gotoTarget(focusTarget).catch((error: unknown) => {
          if (cancelled) return;
          if (attempts < 12) {
            setTimeout(tryGoto, 500);
          } else {
            // Give-up is worth a trace: a silently dead slew looks like "the
            // map ignores my selection" and is painful to diagnose after.
            console.warn('SkyExplorer focus slew gave up', focusTarget.id, error);
          }
        });
      } else if (attempts < 12) {
        setTimeout(tryGoto, 500);
      } else {
        console.warn('SkyExplorer focus slew: viewer never became ready', focusTarget.id);
      }
    };
    tryGoto();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTargetId]);

  const handleTargetClick = (target: Target) => {
    setPopupTarget(target);
    setGotoMessage(null);
    setGotoMessageTone(null);
    setGotoInProgress(false);
    // Unlock detail view immediately so users can navigate on first click
    setCurrentTarget(target);
    if (gotoReadyTargetId !== target.id) {
      setGotoReadyTargetId(target.id);
    }
    // Embedded picker: a click selects the target and auto-frames it, so the
    // chosen target's sky image is shown immediately (no separate button).
    if (onSelectTarget) {
      onSelectTarget(target);
      if (viewerRef.current) {
        setGotoInProgress(true);
        viewerRef.current
          .gotoTarget(target)
          .catch(() => {})
          .finally(() => setGotoInProgress(false));
      }
    }
  };

  const handleGoto = async () => {
    if (!popupTarget || !viewerRef.current) return;

    setGotoMessage(null);
    setGotoMessageTone(null);
    setGotoInProgress(true);

    try {
      const result = await viewerRef.current.gotoTarget(popupTarget);
      setCurrentTarget(popupTarget);
      setGotoReadyTargetId(popupTarget.id);
      if (result === 'already-there') {
        setGotoMessage(t('popup.alreadyThere'));
        setGotoMessageTone('info');
      }
    } catch (error) {
      console.error('Failed to slew to target', error);
      setGotoMessage(
        error instanceof Error ? error.message : t('popup.slewFailed')
      );
      setGotoMessageTone('error');
    } finally {
      setGotoInProgress(false);
    }
  };

  return (
    <div className={`sky-explorer${embedded ? ' sky-explorer-embedded' : ''}`}>
      {!embedded && <TopicSidebar />}
      {embedded && selectedTopic === 'exoplanet_transit' && <EmbeddedSkyFilters />}
      <div className="sky-map-area" style={{ flex: 1, position: 'relative' }}>
        <AladinViewer
          ref={viewerRef}
          targets={filteredTargets}
          onTargetClick={handleTargetClick}
        />

        {/* Search overlay — full-catalog name/constellation search */}
        <div className="sky-search-overlay">
          <div className="sky-search-box">
            <svg
              className="sky-search-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="sky-search-input"
              placeholder={t('explorer.searchPlaceholder')}
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
            />
            {nameSearch && (
              <button
                type="button"
                className="sky-search-clear"
                aria-label={t('explorer.searchClear')}
                onClick={() => setNameSearch('')}
              >
                ×
              </button>
            )}
          </div>
          {q && !searchEmpty && (
            <span className="sky-search-count">
              {filteredTargets.length} / {searchPool.length}
            </span>
          )}
          {searchEmpty && (
            <span className="sky-search-empty">{t('explorer.searchNoMatch')}</span>
          )}
        </div>

        {loading && (
          <div className="sky-loading-overlay">
            <span className="sky-loading-spinner" />
            <span>{t('explorer.loading')}</span>
          </div>
        )}
        {!loading && selectedTopic === 'exoplanet_transit' && targets.length === 0 && (
          <div className="transit-empty-state">
            {t('explorer.noTransitTargets')}
          </div>
        )}
        {popupTarget && (
          <TargetPopup
            embedded={embedded}
            gotoHint={gotoMessage}
            gotoHintTone={gotoMessageTone}
            gotoInProgress={gotoInProgress}
            gotoUnlocked={gotoReadyTargetId === popupTarget.id}
            onGoto={handleGoto}
            target={popupTarget}
            onClose={() => {
              setPopupTarget(null);
              setGotoMessage(null);
              setGotoMessageTone(null);
              setGotoInProgress(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
