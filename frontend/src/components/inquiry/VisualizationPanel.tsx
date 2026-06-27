import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { InquiryVisualizationResult, VisualizationConfig } from '../../explorationBlocks/types';

interface VisualizationPanelProps {
  visualizationConfig: VisualizationConfig;
  visualizations: InquiryVisualizationResult[];
}

export function VisualizationPanel({ visualizationConfig, visualizations }: VisualizationPanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '시각화' : 'Visualization'}</span>
      <h3>{localize(visualizationConfig.primaryView, lang)}</h3>
      <div className="inquiry-visual-list">
        {visualizations.map((visual) => (
          <div key={visual.id} className={`inquiry-visual-item ${visual.status}`}>
            <strong>{localize(visual.title, lang)}</strong>
            <span>{localize(visual.description, lang)}</span>
            <em>{visual.status}</em>
          </div>
        ))}
      </div>
      <div className="inquiry-list-block">
        <strong>{lang === 'ko' ? '해석 단서' : 'Interpretation cues'}</strong>
        <ul>
          {visualizationConfig.interpretationCues.map((cue, index) => (
            <li key={`${localize(cue, lang)}-${index}`}>{localize(cue, lang)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
