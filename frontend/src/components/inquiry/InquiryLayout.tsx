import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { StepPanel } from './StepPanel';

const STEP_SHORT_LABELS: Record<string, Record<string, string>> = {
  step0_intro: { ko: '주제 소개', en: 'Intro' },
  step1_select: { ko: '대상 선택', en: 'Select' },
  step2_metadata: { ko: '메타데이터', en: 'Metadata' },
  step3_analysis_conditions: { ko: '분석 조건', en: 'Conditions' },
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
  comparisonSlot?: ReactNode;
  maxUnlockedStepIndex?: number;
  recordSave?: RecordSaveConfig;
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
  comparisonSlot,
  maxUnlockedStepIndex,
  recordSave,
}: InquiryLayoutProps<TContext>) {
  const lang = useLangStore((state) => state.lang);
  const [activeStepId, setActiveStepId] = useState<InquiryStepId>(
    initialStepId ?? module.steps[0].id,
  );
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setActiveStepId(initialStepId ?? module.steps[0].id);
  }, [initialStepId, module.id, module.steps]);

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
  const goToStep = (delta: number) => {
    const next = module.steps[stepIndex + delta];
    if (next) setActiveStepId(next.id);
  };

  const handleNoteChange = (fieldId: string, value: string) => {
    setNotes((current) => ({ ...current, [fieldId]: value }));
  };

  const renderStepBody = () => {
    if (activeStep.kind === 'intro') {
      return (
        <>
          {introSlot && <div className="inquiry-intro-media">{introSlot}</div>}
          <div className="inquiry-two-column">
          <section className="inquiry-info-panel">
            <span className="inquiry-panel-kicker">{lang === 'ko' ? '학습 목표' : 'Learning Goals'}</span>
            <h3>{localize(module.title, lang)}</h3>
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
      if (selectionSlot) {
        return <>{selectionSlot}</>;
      }
      return (
        <section className="inquiry-info-panel inquiry-selection-card">
          <span className="inquiry-panel-kicker">{lang === 'ko' ? '다음 행동' : 'Next Action'}</span>
          <h3>{lang === 'ko' ? '대상 또는 자료 선택' : 'Select a Target or Dataset'}</h3>
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
          <DataSourcePanel dataSource={module.dataSource} />
          <MetadataPanel fields={result.metadata} />
        </div>
      );
    }

    if (activeStep.kind === 'analysis') {
      return (
        <AnalysisControlPanel
          analysisConfig={module.analysisConfig}
          conditions={result.analysisConditions}
        />
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
        <ReflectionPanel
          prompts={result.interpretationPrompts}
          notes={notes}
          onNoteChange={handleNoteChange}
        />
        {recordSave && <RecordSavePanel config={recordSave} answers={notes} />}
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
          const isLocked = index > maxUnlocked;
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
            </span>
            {stepIndex < module.steps.length - 1 && (
              <button
                type="button"
                className="btn-primary"
                disabled={stepIndex >= maxUnlocked}
                onClick={() => goToStep(1)}
              >
                {lang === 'ko' ? '다음 단계' : 'Next'} →
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
