import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import A from 'aladin-lite';
import type { Target } from '../../types/target';

interface AladinViewerProps {
  targets: Target[];
  onTargetClick: (target: Target) => void;
  /** Target chosen outside the map (recommended pick, ?target= deep link). The
   *  slew fires the instant Aladin is up — see the effect near the bottom. */
  focusTarget?: Target | null;
  /** Re-aims at the same focusTarget when bumped (repeat button press). */
  focusNonce?: number;
}

export interface AladinViewerHandle {
  gotoTarget: (target: Target) => Promise<'slewed' | 'already-there'>;
}

// Slew then zoom run back to back, so these add up to the wait before the
// learner can act. Trimmed from 1.4/1.1 (2.5s total) — long enough to read as
// "the sky is moving there", short enough not to feel unresponsive.
const SLEW_ANIMATION_SECONDS = 0.8;
const ZOOM_ANIMATION_SECONDS = 0.7;
const ZOOM_FOV = 6;
const CENTER_EPSILON_DEG = 0.08;
const FOV_EPSILON_DEG = 0.05;

function normalizeRa(ra: number) {
  return ((ra % 360) + 360) % 360;
}

function shortestRaDelta(from: number, to: number) {
  const delta = normalizeRa(to) - normalizeRa(from);
  if (delta > 180) return delta - 360;
  if (delta < -180) return delta + 360;
  return delta;
}

function getViewerCenter(viewer: any): [number, number] | null {
  const value =
    (typeof viewer.getRaDec === 'function' && viewer.getRaDec()) ||
    (typeof viewer.getCenter === 'function' && viewer.getCenter());

  if (Array.isArray(value) && value.length >= 2) {
    return [Number(value[0]), Number(value[1])];
  }

  if (value && typeof value === 'object') {
    if ('ra' in value && 'dec' in value) {
      return [Number(value.ra), Number(value.dec)];
    }
    if ('lon' in value && 'lat' in value) {
      return [Number(value.lon), Number(value.lat)];
    }
  }

  return null;
}

function getViewerFov(viewer: any): number {
  const value =
    (typeof viewer.getFoV === 'function' && viewer.getFoV()) ||
    (typeof viewer.getFov === 'function' && viewer.getFov()) ||
    (typeof viewer.getFieldOfView === 'function' && viewer.getFieldOfView());

  if (Array.isArray(value)) {
    return Math.max(...value.map((entry) => Number(entry)));
  }

  if (typeof value === 'number') {
    return value;
  }

  if (value && typeof value === 'object') {
    const values = Object.values(value)
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry));

    if (values.length > 0) {
      return Math.max(...values);
    }
  }

  return 180;
}

export const AladinViewer = forwardRef<AladinViewerHandle, AladinViewerProps>(
function AladinViewer(
  { targets, onTargetClick, focusTarget, focusNonce = 0 }: AladinViewerProps,
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const aladinRef = useRef<any>(null);
  const catalogRef = useRef<any>(null);
  const aladinApiRef = useRef<any>(null);
  const onTargetClickRef = useRef(onTargetClick);
  onTargetClickRef.current = onTargetClick;
  // State, not a ref: the marker effect below has to re-run once Aladin is up.
  // The catalog only exists after the async A.init resolves, while `targets`
  // arrives from a local API call long before that — so the effect used to fire
  // while the catalog was still null, bail out, and never run again, leaving the
  // sky with no clickable targets at all.
  const [aladinReady, setAladinReady] = useState(false);

  const slewTo = useCallback(
    async (target: Target): Promise<'slewed' | 'already-there'> => {
      const viewer = aladinRef.current;
      if (!viewer) {
        throw new Error('Sky viewer is not ready yet.');
      }

      const setCurrentFov = (value: number) => {
        if (typeof viewer.setFoV === 'function') {
          viewer.setFoV(value);
        } else if (typeof viewer.setFov === 'function') {
          viewer.setFov(value);
        }
      };

      const currentCenter = getViewerCenter(viewer);
      const currentFov = getViewerFov(viewer);
      const isAlreadyCentered =
        currentCenter !== null &&
        Math.abs(shortestRaDelta(currentCenter[0], target.ra)) <= CENTER_EPSILON_DEG &&
        Math.abs(currentCenter[1] - target.dec) <= CENTER_EPSILON_DEG;
      const isAlreadyZoomed = Math.abs(currentFov - ZOOM_FOV) <= FOV_EPSILON_DEG;

      if (isAlreadyCentered) {
        return 'already-there';
      }

      if (typeof viewer.stopAnimation === 'function') {
        viewer.stopAnimation();
      }

      if (!isAlreadyCentered) {
        if (typeof viewer.animateToRaDec === 'function') {
          // Watchdog: this build of Aladin sometimes never fires the completion
          // callback (observed live — the promise pended forever, so callers'
          // retries/catches stayed silent and the map just didn't move). If the
          // animation hasn't reported back shortly after its nominal duration,
          // jump directly.
          const animated = await new Promise<boolean>((resolve) => {
            const watchdog = setTimeout(
              () => resolve(false),
              (SLEW_ANIMATION_SECONDS + 1) * 1000
            );
            try {
              viewer.animateToRaDec(target.ra, target.dec, SLEW_ANIMATION_SECONDS, () => {
                clearTimeout(watchdog);
                resolve(true);
              });
            } catch {
              clearTimeout(watchdog);
              resolve(false);
            }
          });
          if (!animated && typeof viewer.gotoRaDec === 'function') {
            viewer.gotoRaDec(target.ra, target.dec);
          }
        } else if (typeof viewer.gotoRaDec === 'function') {
          viewer.gotoRaDec(target.ra, target.dec);
        } else if (typeof viewer.gotoPosition === 'function') {
          viewer.gotoPosition(target.ra, target.dec);
        } else if (typeof viewer.pointTo === 'function') {
          viewer.pointTo(target.ra, target.dec);
        } else {
          throw new Error('This viewer does not support target slewing.');
        }
      }

      if (isAlreadyZoomed) {
        return 'slewed';
      }

      const startFov = getViewerFov(viewer);
      await new Promise<void>((resolve) => {
        const start = performance.now();
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        // Same watchdog as the slew above: rAF freezes entirely in background
        // or occluded tabs, which left the view centered but stuck at the wide
        // FoV. If the tween hasn't finished on time, jump to the final zoom.
        const watchdog = setTimeout(() => {
          setCurrentFov(ZOOM_FOV);
          finish();
        }, (ZOOM_ANIMATION_SECONDS + 1) * 1000);

        const tick = (now: number) => {
          if (settled) return;
          const progress = Math.min(
            (now - start) / (ZOOM_ANIMATION_SECONDS * 1000),
            1
          );
          const eased =
            progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          const nextFov = startFov + (ZOOM_FOV - startFov) * eased;
          setCurrentFov(nextFov);

          if (progress < 1) {
            window.requestAnimationFrame(tick);
          } else {
            setCurrentFov(ZOOM_FOV);
            clearTimeout(watchdog);
            finish();
          }
        };

        window.requestAnimationFrame(tick);
      });

      return 'slewed';
    },
    [],
  );

  useImperativeHandle(ref, () => ({ gotoTarget: slewTo }), [slewTo]);

  // Slew to a target chosen outside the map. Keyed on aladinReady, so it fires
  // the moment Aladin finishes initializing — the previous version lived in
  // SkyExplorer and polled `viewerRef` every 500ms, giving up after 6s. On a
  // cold Render instance (HiPS survey properties come from CDS) init regularly
  // outlasted that window, so the map just sat at the default view until the
  // learner clicked again. Deterministic beats polling. focusNonce re-runs the
  // slew for a repeat press on the same target (learner panned away).
  const focusTargetId = focusTarget?.id ?? null;
  useEffect(() => {
    if (!aladinReady || !focusTarget) return;
    slewTo(focusTarget).catch((error: unknown) => {
      console.warn('Sky focus slew failed', focusTarget.id, error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aladinReady, focusTargetId, focusNonce, slewTo]);

  // Shorten coordinate grid labels: "HH MM SS.mmm" → "HH MM SS"
  useEffect(() => {
    if (!containerRef.current) return;
    const trimCooLabel = (el: Element) => {
      const text = el.textContent ?? '';
      const trimmed = text.replace(/(\d{2} \d{2} \d{2})\.\d+/g, '$1').replace(/([+-]?\d{2} \d{2} \d{2})\.\d+/g, '$1');
      if (trimmed !== text) el.textContent = trimmed;
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            if (node.classList.contains('aladin-overlay-label') || node.classList.contains('aladin-view-label')) {
              trimCooLabel(node);
            }
            node.querySelectorAll('.aladin-overlay-label, .aladin-view-label').forEach(trimCooLabel);
          }
        }
        if (mutation.type === 'characterData' && mutation.target.parentElement) {
          const parent = mutation.target.parentElement;
          if (parent.classList.contains('aladin-overlay-label') || parent.classList.contains('aladin-view-label')) {
            trimCooLabel(parent);
          }
        }
      }
    });
    observer.observe(containerRef.current, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  // Initialize once
  useEffect(() => {
    let cancelled = false;

    Promise.resolve(A.init)
      .then(() => {
        if (cancelled || !containerRef.current) return;

        aladinApiRef.current = A;
        aladinRef.current = A.aladin(containerRef.current, {
          survey: 'P/DSS2/color',
          fov: 180,
          target: '0 +0',
          projection: 'AIT',
          showReticle: false,
          showLayersControl: false,
          showGotoControl: false,
          showFrame: false,
          showCooGrid: true,
        });
        // QA handle: the WebGL view can't be pixel-probed and screenshots of a
        // continuously rendering canvas time out, so automated checks read the
        // center/FoV through this instead (e.g. slew verification).
        (containerRef.current as HTMLDivElement & { __aladin?: unknown }).__aladin =
          aladinRef.current;

        catalogRef.current = A.catalog({
          name: 'Targets',
          shape: 'circle',
          color: '#ff6600',
          sourceSize: 18,
        });
        aladinRef.current.addCatalog(catalogRef.current);

        aladinRef.current.on('objectClicked', (object: any) => {
          if (object?.data?.id) {
            onTargetClickRef.current(object.data as Target);
          }
        });

        setAladinReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize Aladin Lite', error);
      });

    return () => { cancelled = true; };
  }, []);
  // Update markers when targets change — and once Aladin finishes initializing,
  // since the targets are usually already here by then.
  useEffect(() => {
    if (!aladinReady || !catalogRef.current || !aladinApiRef.current) return;
    const api = aladinApiRef.current;

    catalogRef.current.removeAll();
    const sources = targets.map((t) =>
      api.source(t.ra, t.dec, { ...t } as any, {
        popupTitle: t.name,
        popupDesc: `${t.type} | ${t.constellation}`,
      })
    );
    catalogRef.current.addSources(sources);
  }, [targets, aladinReady]);

  return (
    <div className="aladin-shell">
      <div
        ref={containerRef}
        className="aladin-container"
        onContextMenu={(event) => {
          event.preventDefault();
        }}
      />
      <div className="sky-center-reticle" aria-hidden="true">
        <span className="sky-center-reticle-h" />
        <span className="sky-center-reticle-v" />
      </div>
    </div>
  );
});

AladinViewer.displayName = 'AladinViewer';
