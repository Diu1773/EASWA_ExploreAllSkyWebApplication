import type { Observation } from '../../types/target';
import { useLangStore } from '../../i18n';

interface ThumbnailStripProps {
  observations: Observation[];
  selectedIds: string[];
}

export function ThumbnailStrip({
  observations,
  selectedIds,
}: ThumbnailStripProps) {
  const lang = useLangStore((s) => s.lang);
  const selected = observations.filter((o) => selectedIds.includes(o.id));

  return (
    <div className="thumbnail-strip">
      <h4>{lang === 'ko' ? '선택한 프레임' : 'Selected Frames'} ({selected.length})</h4>
      <div className="thumbnails">
        {selected.map((obs) => (
          <div key={obs.id} className="thumbnail-card">
            <div className="thumbnail-placeholder">
              <span>{obs.mission === 'TESS' ? `S${obs.sector}` : obs.filter_band}</span>
            </div>
            <span className="thumbnail-label">
              {obs.display_label ?? new Date(obs.epoch).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
