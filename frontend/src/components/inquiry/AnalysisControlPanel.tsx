import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { AnalysisConfig, KeyValueField } from '../../explorationBlocks/types';

interface AnalysisControlPanelProps {
  analysisConfig: AnalysisConfig;
  conditions: KeyValueField[];
}

export function AnalysisControlPanel({ analysisConfig, conditions }: AnalysisControlPanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '분석 조건' : 'Analysis Conditions'}</span>
      <h3>{localize(analysisConfig.method, lang)}</h3>
      <div className="inquiry-callout">
        {lang === 'ko'
          ? '자동화된 분석도 입력 조건과 모델 가정을 숨기지 않습니다.'
          : 'Automated analysis still exposes input conditions and model assumptions.'}
      </div>
      <dl className="inquiry-field-list">
        {conditions.map((field) => (
          <div key={field.id}>
            <dt>{localize(field.label, lang)}</dt>
            <dd>
              {localize(field.value, lang)}
              {field.description && <small>{localize(field.description, lang)}</small>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="inquiry-list-block">
        <strong>{lang === 'ko' ? '모델/분석 가정' : 'Assumptions'}</strong>
        <ul>
          {analysisConfig.assumptions.map((assumption, index) => (
            <li key={`${localize(assumption, lang)}-${index}`}>{localize(assumption, lang)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
