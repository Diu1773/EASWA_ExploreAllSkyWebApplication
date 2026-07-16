import type { ReactNode } from 'react';
import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { InquiryStepConfig } from '../../explorationBlocks/types';
import { SelfCheckPanel } from './SelfCheckPanel';

interface StepPanelProps {
  step: InquiryStepConfig;
  children: ReactNode;
  notes: Record<string, string>;
  onNoteChange: (fieldId: string, value: string) => void;
  selfCheckAnswers: Record<string, string | number>;
  onSelfCheckAnswer: (key: string, value: string | number) => void;
}

export function StepPanel({
  step,
  children,
  notes,
  onNoteChange,
  selfCheckAnswers,
  onSelfCheckAnswer,
}: StepPanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-step-panel" aria-labelledby={`inquiry-${step.id}`}>
      <div className="inquiry-step-panel-head">
        <span>Step {step.number}</span>
        <h2 id={`inquiry-${step.id}`}>{localize(step.title, lang)}</h2>
        <p>{localize(step.summary, lang)}</p>
      </div>

      <div className="inquiry-prompt-list">
        {step.questions.map((prompt) => (
          <div key={prompt.id} className="inquiry-prompt">
            <strong>{localize(prompt.question, lang)}</strong>
            {prompt.helperText && <span>{localize(prompt.helperText, lang)}</span>}
          </div>
        ))}
      </div>

      <div className="inquiry-step-body">{children}</div>

      {step.selfChecks && step.selfChecks.length > 0 && (
        <SelfCheckPanel
          items={step.selfChecks}
          scope={step.id}
          answers={selfCheckAnswers}
          onAnswer={onSelfCheckAnswer}
        />
      )}

      {/* Mirrors the self-check panel (kicker + bold prompt) so the step-specific
          question — not the generic "탐구 기록" heading — is what the eye lands on. */}
      <section className="inquiry-record-fields">
        <span className="inquiry-panel-kicker">{lang === 'ko' ? '✍️ 탐구 기록' : '✍️ Inquiry Notes'}</span>
        {step.recordFields.map((field) => {
          const fieldId = `${step.id}:${field.id}`;
          return (
            <label key={field.id} className="inquiry-record-field">
              <strong>{localize(field.question, lang)}</strong>
              {field.helperText && (
                <span className="inquiry-record-hint">{localize(field.helperText, lang)}</span>
              )}
              <textarea
                value={notes[fieldId] ?? ''}
                onChange={(event) => onNoteChange(fieldId, event.target.value)}
                placeholder={lang === 'ko' ? '여기에 기록하세요' : 'Write your notes here'}
              />
            </label>
          );
        })}
      </section>
    </section>
  );
}
