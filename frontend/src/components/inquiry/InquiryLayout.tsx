import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type {
  ExplorationModuleAdapter,
  ExplorationModuleConfig,
  InquiryStepId,
} from '../../explorationBlocks/types';
import { AnalysisControlPanel } from './AnalysisControlPanel';
import { ComparisonPanel } from './ComparisonPanel';
import { DataSourcePanel } from './DataSourcePanel';
import { MetadataPanel } from './MetadataPanel';
import { ReflectionPanel } from './ReflectionPanel';
import { RecordSavePanel, type RecordSaveConfig } from './RecordSavePanel';
import {
  AnonSubmitPanel,
  type AnonSubmitConfig,
  type SelfCheckSummary,
} from './AnonSubmitPanel';
import { StepPanel } from './StepPanel';
import {
  inquiryDraftScope,
  loadInquiryDraft,
  saveInquiryDraft,
} from '../../utils/inquiryDraft';

/** Debounce for the autosave write — long enough not to hit localStorage on
 *  every keystroke, short enough that a reload right after typing keeps it. */
const AUTOSAVE_DELAY_MS = 600;

const STEP_SHORT_LABELS: Record<string, Record<string, string>> = {
  step0_intro: { ko: '주제 소개', en: 'Intro' },
  step1_select: { ko: '대상 선택', en: 'Select' },
  step2_metadata: { ko: '자료 확인', en: 'Data Check' },
  step3_analysis_conditions: { ko: '분석 준비', en: 'Prep' },
  step4_run_visualize: { ko: '분석·시각화', en: 'Analyze' },
  step5_compare: { ko: '기준값 비교', en: 'Compare' },
  step6_reflect: { ko: '해석·기록', en: 'Reflect' },
};

interface InquiryLayoutProps<TContext = unknown> {
  module: ExplorationModuleConfig;
  adapter: ExplorationModuleAdapter<TContext>;
  context?: TContext;
  initialStepId?: InquiryStepId;
  contextSlot?: ReactNode;
  analysisSlot?: ReactNode;
  introSlot?: ReactNode;
  selectionSlot?: ReactNode;
  metadataSlot?: ReactNode;
  conditionsSlot?: ReactNode;
  comparisonSlot?: ReactNode;
  resultSummarySlot?: ReactNode;
  maxUnlockedStepIndex?: number;
  /** Optional explicit "confirm selection" control shown under the selection step. */
  selectionConfirm?: {
    ready: boolean;
    label: { ko: string; en: string };
    hint: { ko: string; en: string };
  };
  recordSave?: RecordSaveConfig;
  /** No-login anonymous submission to the Google Sheets sink (Step 6). */
  anonSubmit?: AnonSubmitConfig;
  /** Selected target id. Scopes the autosaved draft, so the same target opened
   *  from the module page and from the Lab shares one set of notes. Omit and the
   *  draft falls back to a per-module key. */
  draftTargetId?: string | null;
}

export function InquiryLayout<TContext = unknown>({
  module,
  adapter,
  context,
  initialStepId,
  contextSlot,
  analysisSlot,
  introSlot,
  selectionSlot,
  metadataSlot,
  conditionsSlot,
  comparisonSlot,
  resultSummarySlot,
  maxUnlockedStepIndex,
  selectionConfirm,
  recordSave,
  anonSubmit,
  draftTargetId,
}: InquiryLayoutProps<TContext>) {
  const lang = useLangStore((state) => state.lang);
  const [activeStepId, setActiveStepId] = useState<InquiryStepId>(
    initialStepId ?? module.steps[0].id,
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Self-check answers live here, not in SelfCheckPanel: that panel unmounts on
  // every step change, and the answers have to survive to the Step 6 submission.
  const [selfCheckAnswers, setSelfCheckAnswers] = useState<Record<string, string | number>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const draftScope = useMemo(
    () => inquiryDraftScope(module.id, draftTargetId),
    [module.id, draftTargetId],
  );
  // Only write after the learner actually edits something. Without this the
  // hydration below would immediately re-save what it just read, and an empty
  // mount would overwrite a real draft with {}.
  const dirtyRef = useRef(false);

  useEffect(() => {
    setActiveStepId(initialStepId ?? module.steps[0].id);
  }, [initialStepId, module.id, module.steps]);

  // Hydrate from the autosaved draft whenever the task (module + target) changes.
  useEffect(() => {
    const draft = loadInquiryDraft(draftScope);
    dirtyRef.current = false;
    setNotes(draft?.notes ?? {});
    setSelfCheckAnswers(draft?.selfChecks ?? {});
    setSavedAt(draft?.savedAt ?? null);
  }, [draftScope]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(() => {
      const at = saveInquiryDraft(draftScope, notes, selfCheckAnswers);
      if (at !== null) setSavedAt(at);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draftScope, notes, selfCheckAnswers]);

  const result = useMemo(
    () => adapter.createInitialResult(module, context),
    [adapter, context, module],
  );
  const primaryAction = useMemo(
    () => adapter.getPrimaryAction(module, context),
    [adapter, context, module],
  );
  const activeStep = module.steps.find((step) => step.id === activeStepId) ?? module.steps[0];
  const stepIndex = module.steps.findIndex((step) => step.id === activeStep.id);
  const maxUnlocked = maxUnlockedStepIndex ?? module.steps.length - 1;
  // On the visualization step the in-body Lab handoff button ("관측자료 분석 →")
  // is the real forward action, so the footer "다음 단계" would be a confusing
  // second primary button — hide it there.
  const hideFooterNext = activeStep.kind === 'visualization' && Boolean(analysisSlot);
  const goToStep = (delta: number) => {
    const next = module.steps[stepIndex + delta];
    if (next) setActiveStepId(next.id);
  };

  const handleNoteChange = (fieldId: string, value: string) => {
    dirtyRef.current = true;
    setNotes((current) => ({ ...current, [fieldId]: value }));
  };

  const handleSelfCheckAnswer = (key: string, value: string | number) => {
    dirtyRef.current = true;
    setSelfCheckAnswers((current) => ({ ...current, [key]: value }));
  };

  // Grading lives here rather than in the submit panel because the correct
  // answers are on the module config, which the panel does not receive.
  const selfCheckSummary = useMemo<SelfCheckSummary>(() => {
    const responses: SelfCheckSummary['responses'] = [];
    let total = 0;
    module.steps.forEach((step) => {
      (step.selfChecks ?? []).forEach((item) => {
        total += 1;
        const answer = selfCheckAnswers[`${step.id}:${item.id}`];
        if (answer === undefined) return;
        responses.push({
          step: step.id,
          id: item.id,
          answer,
          correct: item.type === 'ox' ? answer === item.correct : answer === item.correctIndex,
        });
      });
    });
    return {
      responses,
      total,
      answered: responses.length,
      correct: responses.filter((response) => response.correct).length,
    };
  }, [module.steps, selfCheckAnswers]);

  // Notes are keyed `${stepId}:${fieldId}`, but the backend record template
  // expects bare question ids — configs keep field ids identical to template
  // ids, so stripping the step prefix IS the mapping. Checkbox answers are
  // JSON-string arrays in notes (see StepPanel) and unpack to real arrays here.
  const templateAnswers = useMemo(() => {
    const out: Record<string, unknown> = {};
    module.steps.forEach((step) => {
      step.recordFields.forEach((field) => {
        const raw = notes[`${step.id}:${field.id}`];
        if (raw === undefined || raw.trim() === '') return;
        if (field.input === 'checkbox') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) out[field.id] = parsed;
          } catch {
            // corrupt checkbox note — skip rather than send garbage
          }
        } else {
          out[field.id] = raw;
        }
      });
    });
    return out;
  }, [module.steps, notes]);

  const missingRequiredLabels = useMemo(
    () =>
      module.steps.flatMap((step) =>
        step.recordFields
          .filter((field) => field.required && templateAnswers[field.id] === undefined)
          .map((field) => localize(field.question, lang)),
      ),
    [module.steps, templateAnswers, lang],
  );

  // Progression gate: a step that asks for notes wants at least ONE of them
  // before moving on — enough to keep the record habit without demanding every
  // box (a full-completion gate would stall a classroom on the first snag).
  const isStepAnswered = (step: (typeof module.steps)[number]) =>
    step.recordFields.length === 0 ||
    step.recordFields.some((field) => {
      const raw = notes[`${step.id}:${field.id}`];
      return raw !== undefined && raw.trim() !== '' && raw !== '[]';
    });
  const gateBlocked = !isStepAnswered(activeStep);

  const renderStepBody = () => {
    if (activeStep.kind === 'intro') {
      return (
        <>
          {introSlot && <div className="inquiry-intro-media">{introSlot}</div>}
          <div className="inquiry-two-column">
          <section className="inquiry-info-panel">
            <span className="inquiry-panel-kicker">{lang === 'ko' ? '이 탐구에서 할 일' : 'What You’ll Do'}</span>
            <ul className="inquiry-check-list">
              {module.learningGoals.map((goal, index) => (
                <li key={`${localize(goal, lang)}-${index}`}>{localize(goal, lang)}</li>
              ))}
            </ul>
          </section>
          <section className="inquiry-info-panel">
            <span className="inquiry-panel-kicker">{lang === 'ko' ? '수업 적용' : 'Classroom Use'}</span>
            <h3>{localize(module.classroomUse.level, lang)}</h3>
            <dl className="inquiry-field-list compact">
              <div>
                <dt>{lang === 'ko' ? '권장 시간' : 'Suggested time'}</dt>
                <dd>{localize(module.classroomUse.suggestedTime, lang)}</dd>
              </div>
              <div>
                <dt>{lang === 'ko' ? '운영 방식' : 'Grouping'}</dt>
                <dd>{localize(module.classroomUse.grouping, lang)}</dd>
              </div>
            </dl>
          </section>
        </div>
        </>
      );
    }

    if (activeStep.kind === 'selection') {
      const confirmBlock = selectionConfirm ? (
        <div className="inquiry-selection-confirm">
          {selectionConfirm.ready ? (
            <button
              type="button"
              className="btn-primary"
              disabled={stepIndex >= maxUnlocked}
              onClick={() => goToStep(1)}
            >
              {selectionConfirm.label[lang]}
            </button>
          ) : (
            <p className="inquiry-selection-confirm-hint">{selectionConfirm.hint[lang]}</p>
          )}
        </div>
      ) : null;
      if (selectionSlot) {
        return (
          <>
            {selectionSlot}
            {confirmBlock}
          </>
        );
      }
      return (
        <section className="inquiry-info-panel inquiry-selection-card">
          <span className="inquiry-panel-kicker">{lang === 'ko' ? '다음 행동' : 'Next Action'}</span>
          <p>{primaryAction?.helperText ? localize(primaryAction.helperText, lang) : localize(module.entry.helperText, lang)}</p>
          {primaryAction && (
            <Link to={primaryAction.href} className="btn-primary inquiry-panel-action">
              {localize(primaryAction.label, lang)}
            </Link>
          )}
        </section>
      );
    }

    if (activeStep.kind === 'metadata') {
      return (
        <div className="inquiry-step-stack">
          {metadataSlot}
          <DataSourcePanel dataSource={module.dataSource} />
          <MetadataPanel fields={result.metadata} />
        </div>
      );
    }

    if (activeStep.kind === 'analysis') {
      return (
        <div className="inquiry-step-stack">
          {conditionsSlot}
          <AnalysisControlPanel
            analysisConfig={module.analysisConfig}
            conditions={result.analysisConditions}
          />
        </div>
      );
    }

    if (activeStep.kind === 'visualization') {
      if (analysisSlot) {
        return <div className="inquiry-analysis-slot">{analysisSlot}</div>;
      }
      return (
        <div className="inquiry-placeholder-run">
          <strong>{lang === 'ko' ? '실제 분석 adapter 연결 대기' : 'Waiting for live adapter wiring'}</strong>
          <span>
            {lang === 'ko'
              ? '이 블럭은 공통 구조와 결과 스키마를 먼저 보여주는 placeholder입니다.'
              : 'This block currently demonstrates the shared structure and result schema as a placeholder.'}
          </span>
        </div>
      );
    }

    if (activeStep.kind === 'comparison') {
      if (comparisonSlot) {
        return <>{comparisonSlot}</>;
      }
      return (
        <ComparisonPanel
          comparisonConfig={module.comparisonConfig}
          derivedValues={result.derivedValues}
          comparisonValues={result.comparisonValues}
        />
      );
    }

    return (
      <>
        {resultSummarySlot}
        {result.interpretationPrompts.length > 0 && (
          <ReflectionPanel
            prompts={result.interpretationPrompts}
            notes={notes}
            onNoteChange={handleNoteChange}
          />
        )}
        {recordSave && (
          <RecordSavePanel
            config={recordSave}
            answers={templateAnswers}
            missingRequiredLabels={missingRequiredLabels}
          />
        )}
        {anonSubmit && (
          <AnonSubmitPanel config={anonSubmit} notes={notes} selfCheck={selfCheckSummary} />
        )}
      </>
    );
  };

  return (
    <div className="inquiry-layout">
      <header className="inquiry-layout-header">
        <div>
          <Link to="/" className="back-link">
            &larr; {lang === 'ko' ? '홈' : 'Home'}
          </Link>
          <span className="inquiry-layout-kicker">
            {lang === 'ko' ? '모듈형 탐구블럭' : 'Modular Inquiry Block'}
          </span>
          <h1>{localize(module.title, lang)}</h1>
          <p>{localize(module.description, lang)}</p>
        </div>
      </header>

      {contextSlot && <div className="inquiry-context-slot">{contextSlot}</div>}

      <nav className="transit-step-indicator inquiry-stepper" aria-label={lang === 'ko' ? '탐구 단계' : 'Inquiry steps'}>
        {module.steps.map((step, index) => {
          const isCurrent = index === stepIndex;
          const isCompleted = index < stepIndex;
          const isLocked = index > maxUnlocked || (gateBlocked && index > stepIndex);
          const shortLabel = STEP_SHORT_LABELS[step.id]?.[lang] ?? localize(step.title, lang);
          return (
            <div key={step.id} className="transit-step-indicator-item">
              {index > 0 && (
                <div className={`transit-step-connector ${index <= stepIndex ? 'completed' : ''}`} />
              )}
              <button
                type="button"
                className={`transit-step-circle ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
                disabled={isLocked}
                onClick={() => {
                  if (!isLocked) setActiveStepId(step.id);
                }}
                title={localize(step.title, lang)}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{step.number}</span>
                )}
              </button>
              <span className={`transit-step-label ${isCurrent ? 'current' : ''}`}>{shortLabel}</span>
            </div>
          );
        })}
      </nav>

      <div className="inquiry-layout-grid">
        <main className="inquiry-layout-main">
          <StepPanel
            step={activeStep}
            notes={notes}
            onNoteChange={handleNoteChange}
            selfCheckAnswers={selfCheckAnswers}
            onSelfCheckAnswer={handleSelfCheckAnswer}
          >
            {renderStepBody()}
          </StepPanel>
          <div className="inquiry-step-footer">
            <button
              type="button"
              className="btn-secondary"
              disabled={stepIndex <= 0}
              onClick={() => goToStep(-1)}
            >
              ← {lang === 'ko' ? '이전 단계' : 'Previous'}
            </button>
            <span className="inquiry-step-progress">
              {activeStep.number} / {module.steps[module.steps.length - 1].number}
              {savedAt !== null && (
                <em className="inquiry-autosave-status">
                  {lang === 'ko' ? '이 브라우저에 자동 저장됨 ' : 'Autosaved in this browser '}
                  {new Date(savedAt).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </em>
              )}
            </span>
            {hideFooterNext ? (
              <span className="inquiry-step-footer-spacer" />
            ) : stepIndex < module.steps.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                disabled={stepIndex >= maxUnlocked || gateBlocked}
                title={
                  gateBlocked
                    ? lang === 'ko'
                      ? '탐구 기록을 한 가지 이상 작성하면 넘어갈 수 있습니다'
                      : 'Write at least one inquiry note to continue'
                    : undefined
                }
                onClick={() => goToStep(1)}
              >
                {lang === 'ko' ? '다음 단계' : 'Next'} →
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  document
                    .querySelector('.inquiry-record-fields')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                {lang === 'ko' ? '탐구 마무리 — 기록 작성하기 ↑' : 'Wrap Up — Write Your Notes ↑'}
              </button>
            )}
          </div>
          {gateBlocked && !hideFooterNext && stepIndex < module.steps.length - 1 && (
            <p className="inquiry-step-gate-hint">
              {lang === 'ko'
                ? '다음 단계로 가려면 이 단계의 ✍️ 탐구 기록을 한 가지 이상 작성하세요.'
                : 'Write at least one ✍️ inquiry note in this step to continue.'}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
