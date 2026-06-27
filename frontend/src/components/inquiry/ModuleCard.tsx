import { Link } from 'react-router-dom';
import { ASTRO_FALLBACK_IMAGE } from '../../data/imageSources';
import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { ExplorationModuleConfig } from '../../explorationBlocks/types';
import { ImageWithFallback } from '../layout/ImageWithFallback';
import { useReveal } from '../layout/useReveal';

interface ModuleCardProps {
  module: ExplorationModuleConfig;
  revealDelay?: number;
}

export function ModuleCard({ module, revealDelay = 0 }: ModuleCardProps) {
  const lang = useLangStore((state) => state.lang);
  const firstQuestion = module.steps[0]?.questions[0]?.question;
  const { ref, revealed } = useReveal<HTMLElement>();

  return (
    <article
      ref={ref}
      className={`inquiry-module-card reveal ${revealed ? 'reveal-visible' : ''}`}
      style={revealDelay ? { transitionDelay: `${revealDelay}ms` } : undefined}
    >
      <div className="inquiry-module-card-media">
        <ImageWithFallback
          src={module.image}
          fallbackSrc={ASTRO_FALLBACK_IMAGE}
          alt={localize(module.imageAlt, lang)}
          className="inquiry-module-card-image"
          loading="lazy"
        />
        <span className="inquiry-module-card-source">
          {localize(module.imageCredit ?? module.dataSource.provider, lang)}
        </span>
      </div>
      <div className="inquiry-module-card-body">
        <div className="inquiry-module-card-head">
          <span className="inquiry-module-card-chip">
            {lang === 'ko' ? '공통 탐구블럭' : 'Shared Inquiry Block'}
          </span>
          <h2>{localize(module.title, lang)}</h2>
          <p>{localize(module.subtitle, lang)}</p>
        </div>

        {firstQuestion && (
          <div className="inquiry-question-box">
            <span>{lang === 'ko' ? '대표 탐구 질문' : 'Inquiry question'}</span>
            <strong>{localize(firstQuestion, lang)}</strong>
          </div>
        )}

        <div className="inquiry-module-card-meta">
          <span>{localize(module.dataSource.name, lang)}</span>
          <span>Step 0-6</span>
        </div>

        <ul className="inquiry-module-tags" aria-label={lang === 'ko' ? '탐구 태그' : 'Module tags'}>
          {module.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>

        <Link to={module.entry.href} className="btn-primary inquiry-module-card-action">
          {localize(module.entry.label, lang)}
        </Link>
      </div>
    </article>
  );
}
