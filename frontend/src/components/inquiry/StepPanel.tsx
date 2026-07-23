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
  /** Rendered AFTER the record fields (탐구 기록). Used for the Step 6 site
   *  feedback so it comes below the inquiry notes — the notes are the point of
   *  this step, tool feedback is an afterthought. */
  afterRecordSlot?: ReactNode;
}

export function StepPanel({
  step,
  children,
  notes,
  onNoteChange,
  selfCheckAnswers,
  onSelfCheckAnswer,
  afterRecordSlot,
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
      {step.recordFields.length > 0 && (
        <section className="inquiry-record-fields">
          <span className="inquiry-panel-kicker">{lang === 'ko' ? '✍️ 탐구 기록' : '✍️ Inquiry Notes'}</span>
          {step.recordFields.map((field) => {
            const fieldId = `${step.id}:${field.id}`;
            const raw = notes[fieldId] ?? '';
            const requiredMark = field.required ? (
              <em className="inquiry-record-required" title={lang === 'ko' ? '필수' : 'Required'}>
                *
              </em>
            ) : null;

            if (field.input === 'radio' && field.options) {
              return (
                <div key={field.id} className="inquiry-record-field">
                  <strong>
                    {localize(field.question, lang)} {requiredMark}
                  </strong>
                  {field.helperText && (
                    <span className="inquiry-record-hint">{localize(field.helperText, lang)}</span>
                  )}
                  <div className="inquiry-record-choice" role="radiogroup">
                    {field.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`inquiry-record-choice-btn${raw === option.value ? ' chosen' : ''}`}
                        aria-pressed={raw === option.value}
                        onClick={() => onNoteChange(fieldId, option.value)}
                      >
                        {localize(option.label, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            if (field.input === 'checkbox' && field.options) {
              // Multi-select stored as a JSON string array so the shared notes
              // map stays Record<string, string>; parsed back at save time.
              let selected: string[] = [];
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) selected = parsed.filter((v): v is string => typeof v === 'string');
              } catch {
                selected = [];
              }
              const toggle = (value: string) => {
                const next = selected.includes(value)
                  ? selected.filter((v) => v !== value)
                  : [...selected, value];
                onNoteChange(fieldId, next.length > 0 ? JSON.stringify(next) : '');
              };
              return (
                <div key={field.id} className="inquiry-record-field">
                  <strong>
                    {localize(field.question, lang)} {requiredMark}
                  </strong>
                  {field.helperText && (
                    <span className="inquiry-record-hint">{localize(field.helperText, lang)}</span>
                  )}
                  <div className="inquiry-record-choice">
                    {field.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`inquiry-record-choice-btn${selected.includes(option.value) ? ' chosen' : ''}`}
                        aria-pressed={selected.includes(option.value)}
                        onClick={() => toggle(option.value)}
                      >
                        {localize(option.label, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <label key={field.id} className="inquiry-record-field">
                <strong>
                  {localize(field.question, lang)} {requiredMark}
                </strong>
                {field.helperText && (
                  <span className="inquiry-record-hint">{localize(field.helperText, lang)}</span>
                )}
                <textarea
                  value={raw}
                  onChange={(event) => onNoteChange(fieldId, event.target.value)}
                  placeholder={lang === 'ko' ? '여기에 기록하세요' : 'Write your notes here'}
                />
              </label>
            );
          })}
        </section>
      )}

      {afterRecordSlot}
    </section>
  );
}
