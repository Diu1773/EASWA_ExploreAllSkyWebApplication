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
}

export function SkyExplorer({ embedded = false, onSelectTarget }: SkyExplorerProps) {
  const { targets, loading, selectedTopic } = useSkyTargets();
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
  const filteredTargets = q
    ? targets.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.constellation.toLowerCase().includes(q)
      )
    : targets;

  useEffect(() => {
    setPopupTarget(null);
    setGotoMessage(null);
    setGotoMessageTone(null);
    setGotoInProgress(false);
    setGotoReadyTargetId(null);
    setCurrentTarget(null);
    setNameSearch('');
  }, [selectedTopic]);

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

        {/* Search overlay */}
        <div className="sky-search-overlay">
          <input
            type="search"
            className="sky-search-input"
            placeholder={t('explorer.searchPlaceholder')}
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
          />
          {q && (
            <span className="sky-search-count">
              {filteredTargets.length} / {targets.length}
            </span>
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
