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
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '분석 설정' : 'Analysis Settings'}</span>
      <h3>{localize(analysisConfig.method, lang)}</h3>
      <div className="inquiry-callout">
        {lang === 'ko'
          ? '아래는 이번 분석에 실제로 쓰이는 설정과 가정입니다 — 결과가 이상하게 나오면 여기로 돌아와 확인하세요.'
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
