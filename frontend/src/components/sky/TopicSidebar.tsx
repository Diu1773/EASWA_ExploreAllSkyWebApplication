import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchTopics } from '../../api/client';
import { DEFAULT_TRANSIT_FILTERS, useAppStore } from '../../stores/useAppStore';
import type { Topic, TransitTargetFilters } from '../../types/target';
import { useT, useLangStore } from '../../i18n';

const TOPIC_CODES: Record<string, string> = {
  eclipsing_binary: 'EB',
  variable_star: 'VAR',
  stellar_cmd: 'CMD',
  exoplanet_transit: 'Exoplanet Transit',
  open_cluster_cmd: 'OC',
};

const TOPIC_LOCALES: Record<string, { name: string; description: string }> = {
  eclipsing_binary: {
    name: 'Eclipsing Binary Investigation',
    description: 'Analyze eclipsing-binary light curves to investigate orbital periods and eclipse depths.',
  },
  variable_star: {
    name: 'Variable Star Investigation',
    description: 'Observe and analyze brightness changes in pulsating and long-period variable stars.',
  },
  stellar_cmd: {
    name: 'Color-Magnitude Diagram Investigation',
    description: 'Compare variable and eclipsing binary targets by color index, brightness, period, and CMD position.',
  },
  exoplanet_transit: {
    name: 'Exoplanet Transit Investigation',
    description: 'Investigate exoplanet transit light curves using TESS observations.',
  },
  microlensing: {
    name: 'Microlensing Investigation',
    description: 'Analyze Galactic bulge microlensing events using continuous observations from three KMTNet sites.',
  },
  open_cluster_cmd: {
    name: 'Open Cluster CMD Investigation',
    description: 'Draw open-cluster color-magnitude diagrams from Gaia DR3 photometry to investigate age and distance.',
  },
};

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function TopicSidebar() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const gearButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const selectedTopic = useAppStore((s) => s.selectedTopic);
  const transitFilters = useAppStore((s) => s.transitFilters);
  const setTopic = useAppStore((s) => s.setTopic);
  const setTransitFilters = useAppStore((s) => s.setTransitFilters);
  const [draftFilters, setDraftFilters] = useState<TransitTargetFilters>(transitFilters);
  const tr = useT();
  const lang = useLangStore((s) => s.lang);

  useEffect(() => {
    fetchTopics().then(setTopics);
  }, []);

  useEffect(() => {
    setDraftFilters(transitFilters);
  }, [transitFilters]);

  // Calculate panel position from gear button rect when opening
  useEffect(() => {
    if (settingsOpen && gearButtonRef.current) {
      const rect = gearButtonRef.current.getBoundingClientRect();
      const panelWidth = 240;
      const panelHeight = 260;
      const viewportMargin = 10;
      const preferredLeft = rect.right - panelWidth;
      const preferredTop = rect.bottom + 8;
      const clampedLeft = Math.min(
        Math.max(viewportMargin, preferredLeft),
        Math.max(viewportMargin, window.innerWidth - panelWidth - viewportMargin),
      );
      const clampedTop =
        preferredTop + panelHeight + viewportMargin <= window.innerHeight
          ? preferredTop
          : Math.max(viewportMargin, rect.top - panelHeight - 8);
      setPanelPos({ top: clampedTop, left: clampedLeft });
    }
  }, [settingsOpen]);

  // Close settings when clicking outside (exclude gear button to avoid open/close race)
  useEffect(() => {
    if (!settingsOpen) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        settingsPanelRef.current && !settingsPanelRef.current.contains(target) &&
        gearButtonRef.current && !gearButtonRef.current.contains(target)
      ) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [settingsOpen]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDraft = useCallback((patch: Partial<TransitTargetFilters>) => {
    setDraftFilters((current) => {
      const next = { ...current, ...patch };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setTransitFilters(next);
        setTopic('exoplanet_transit');
      }, 800);
      return next;
    });
  }, [setTransitFilters, setTopic]);

  return (
    <div className={`topic-bar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {!sidebarCollapsed && (
        <>
          <div className="topic-bar-cards">
            {topics.map((t) => (
              <div key={t.id} className="topic-bar-card-wrap">
                <button
                  className={`topic-bar-card ${selectedTopic === t.id ? 'active' : ''}`}
                  onClick={() => setTopic(t.id)}
                  type="button"
                >
                  <div className="topic-bar-preview">
                    {t.preview_image_url && (
                      <img
                        src={t.preview_image_url}
                        alt={`${lang === 'ko' ? t.name : TOPIC_LOCALES[t.id]?.name ?? t.name} preview`}
                      />
                    )}
                    <div className="topic-bar-preview-overlay">
                      <span className="topic-bar-code">{TOPIC_CODES[t.id] ?? t.icon}</span>
                      {t.preview_label && (
                        <span className="topic-bar-credit">{t.preview_label}</span>
                      )}
                    </div>
                    {t.id === 'exoplanet_transit' && (
                      <button
                        ref={gearButtonRef}
                        className={`topic-bar-gear ${settingsOpen ? 'open' : ''}`}
                        type="button"
                        title={tr('explorer.filterTitle')}
                        onClick={(e) => { e.stopPropagation(); setSettingsOpen((v) => !v); }}
                      >
                        <GearIcon />
                      </button>
                    )}
                  </div>
                  <div className="topic-bar-info">
                    <span className="topic-bar-name">
                      {lang === 'ko' ? t.name : TOPIC_LOCALES[t.id]?.name ?? t.name}
                    </span>
                    <span className="topic-bar-desc">
                      {lang === 'ko'
                        ? t.description
                        : TOPIC_LOCALES[t.id]?.description ?? t.description}
                    </span>
                  </div>
                </button>

              </div>
            ))}
          </div>
        </>
      )}

      <button
        className="topic-bar-toggle"
        type="button"
        onClick={toggleSidebar}
        title={sidebarCollapsed
          ? (lang === 'ko' ? '탐구 패널 열기' : 'Open activity panel')
          : (lang === 'ko' ? '탐구 패널 닫기' : 'Close activity panel')}
      >
        {sidebarCollapsed ? tr('explorer.openPanel') : tr('explorer.closePanel')}
      </button>

      {settingsOpen && panelPos && createPortal(
        <div
          className="topic-bar-settings-panel"
          ref={settingsPanelRef}
          style={{ top: panelPos.top, left: panelPos.left }}
        >
          <label className="topic-settings-field">
            <span>{tr('explorer.filter.maxTargets')}</span>
            <input type="number" min={1} max={100} value={draftFilters.maxTargets}
              onChange={(e) => updateDraft({ maxTargets: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} />
          </label>
          <label className="topic-settings-field">
            <span>{tr('explorer.filter.minDepth')}</span>
            <input type="number" min={0.1} max={10} step={0.1} value={draftFilters.minDepthPct}
              onChange={(e) => updateDraft({ minDepthPct: Math.max(0.1, Math.min(10, Number(e.target.value) || 0.1)) })} />
          </label>
          <label className="topic-settings-field">
            <span>{tr('explorer.filter.maxPeriod')}</span>
            <input type="number" min={0.2} max={30} step={0.1} value={draftFilters.maxPeriodDays}
              onChange={(e) => updateDraft({ maxPeriodDays: Math.max(0.2, Math.min(30, Number(e.target.value) || 0.2)) })} />
          </label>
          <label className="topic-settings-field">
            <span>{tr('explorer.filter.maxHostV')}</span>
            <input type="number" min={6} max={16} step={0.1} value={draftFilters.maxHostVmag}
              onChange={(e) => updateDraft({ maxHostVmag: Math.max(6, Math.min(16, Number(e.target.value) || 6)) })} />
          </label>
          <div className="topic-settings-actions">
            <button className="btn-sm" onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setDraftFilters(DEFAULT_TRANSIT_FILTERS);
              setTransitFilters(DEFAULT_TRANSIT_FILTERS);
              setTopic('exoplanet_transit');
            }}>{tr('explorer.filter.reset')}</button>
            <button className="btn-sm" onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setTransitFilters(draftFilters);
              setTopic('exoplanet_transit');
              setSettingsOpen(false);
            }}>{tr('explorer.filter.apply')}</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
