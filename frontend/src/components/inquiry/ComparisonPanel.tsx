import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { ComparisonConfig, KeyValueField } from '../../explorationBlocks/types';

interface ComparisonPanelProps {
  comparisonConfig: ComparisonConfig;
  derivedValues: KeyValueField[];
  comparisonValues: KeyValueField[];
}

export function ComparisonPanel({
  comparisonConfig,
  derivedValues,
  comparisonValues,
}: ComparisonPanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '비교와 기준' : 'Comparison'}</span>
      <h3>{localize(comparisonConfig.referenceSource, lang)}</h3>
      <p>{localize(comparisonConfig.interpretationRule, lang)}</p>
      <div className="inquiry-compare-grid">
        <div>
          <strong>{lang === 'ko' ? '산출값' : 'Derived values'}</strong>
          <dl className="inquiry-field-list compact">
            {derivedValues.map((field) => (
              <div key={field.id}>
                <dt>{localize(field.label, lang)}</dt>
                <dd>{localize(field.value, lang)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <strong>{lang === 'ko' ? '비교값' : 'Comparison values'}</strong>
          <dl className="inquiry-field-list compact">
            {comparisonValues.map((field) => (
              <div key={field.id}>
                <dt>{localize(field.label, lang)}</dt>
                <dd>{localize(field.value, lang)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="inquiry-list-block">
        <strong>{lang === 'ko' ? '품질 기준' : 'Quality criteria'}</strong>
        <ul>
          {comparisonConfig.qualityCriteria.map((criterion, index) => (
            <li key={`${localize(criterion, lang)}-${index}`}>{localize(criterion, lang)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
