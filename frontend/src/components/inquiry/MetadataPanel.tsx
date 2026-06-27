import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { KeyValueField } from '../../explorationBlocks/types';

interface MetadataPanelProps {
  fields: KeyValueField[];
  title?: string;
}

export function MetadataPanel({ fields, title }: MetadataPanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '메타데이터' : 'Metadata'}</span>
      <h3>{title ?? (lang === 'ko' ? '자료와 대상 정보' : 'Dataset and Target Info')}</h3>
      <dl className="inquiry-field-list">
        {fields.map((field) => (
          <div key={field.id}>
            <dt>{localize(field.label, lang)}</dt>
            <dd>
              {localize(field.value, lang)}
              {field.description && <small>{localize(field.description, lang)}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
