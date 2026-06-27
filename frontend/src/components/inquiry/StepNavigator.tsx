import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { InquiryStepConfig, InquiryStepId } from '../../explorationBlocks/types';

interface StepNavigatorProps {
  steps: InquiryStepConfig[];
  activeStepId: InquiryStepId;
  onStepChange: (stepId: InquiryStepId) => void;
}

export function StepNavigator({ steps, activeStepId, onStepChange }: StepNavigatorProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <nav className="inquiry-step-nav" aria-label={lang === 'ko' ? '탐구 단계' : 'Inquiry steps'}>
      {steps.map((step) => {
        const active = step.id === activeStepId;
        return (
          <button
            key={step.id}
            type="button"
            className={`inquiry-step-nav-item ${active ? 'active' : ''}`}
            onClick={() => onStepChange(step.id)}
            aria-current={active ? 'step' : undefined}
          >
            <span className="inquiry-step-nav-number">Step {step.number}</span>
            <span className="inquiry-step-nav-title">{localize(step.title, lang)}</span>
          </button>
        );
      })}
    </nav>
  );
}
