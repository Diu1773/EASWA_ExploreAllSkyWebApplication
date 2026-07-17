import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { AnonCollectionNotice } from './AnonCollectionNotice';
import { StartOverButton } from './StartOverButton';
import { StepPanel } from './StepPanel';
import {
  LAB_DRAFT_SAVED_EVENT,
  inquiryDraftScope,
  loadInquiryDraft,
  loadLabDraft,
  saveInquiryDraft,
} from '../../utils/inquiryDraft';
import {
  buildAnonRecordPayload,
  getRecordSinkUrl,
  syncAnonRecord,
  type AnonSubmitConfig,
  type SelfCheckSummary,
} from '../../utils/recordSink';

/** Debounce for the autosave write — long enough not to hit localStorage on
 *  every keystroke, short enough that a reload right after typing keeps it. */
const AUTOSAVE_DELAY_MS = 600;

/** Debounce before pushing a draft row to the sheet. Deliberately far longer
 *  than the local one: this is a network round-trip to Apps Script (which has
 *  execution quotas), and the intent is "they stopped typing", not "they typed".
 *  The local autosave already covers a crash a second after the last keystroke. */
const SHEET_SYNC_DELAY_MS = 4000;

type SheetSyncState = 'idle' | 'syncing' | 'synced' | 'failed';

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
  // The active step rides in the URL (?blockStep=, replace — no history spam).
  // Without it, walking Step 4 → Lab and pressing the browser back button
  // remounted this layout at Step 0: the page came back, the position didn't.
  // A reload keeps the step for the same reason.
  // NOT ?step= — that name belongs to the Lab's internal stepper
  // (usePersistedWorkflowStep), which deletes it whenever the Lab sits on its
  // default step. Sharing the name made the two owners overwrite each other.
  const BLOCK_STEP_PARAM = 'blockStep';
  const [searchParams, setSearchParams] = useSearchParams();
  const resolveStep = (raw: string | null): InquiryStepId | null =>
    raw && module.steps.some((step) => step.id === raw) ? (raw as InquiryStepId) : null;
  const [activeStepId, setActiveStepId] = useState<InquiryStepId>(
    () => resolveStep(searchParams.get(BLOCK_STEP_PARAM)) ?? initialStepId ?? module.steps[0].id,
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Self-check answers live here, not in SelfCheckPanel: that panel unmounts on
  // every step change, and the answers have to survive to the Step 6 submission.
  const [selfCheckAnswers, setSelfCheckAnswers] = useState<Record<string, string | number>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [sheetSyncState, setSheetSyncState] = useState<SheetSyncState>('idle');
  const draftScope = useMemo(
    () => inquiryDraftScope(module.id, draftTargetId),
    [module.id, draftTargetId],
  );
  // Only write after the learner actually edits something. Without this the
  // hydration below would immediately re-save what it just read, and an empty
  // mount would overwrite a real draft with {}.
  const dirtyRef = useRef(false);

  // Re-resolve on module switch and on external URL changes (back/forward).
  // The URL wins over initialStepId so returning into a tree that passes one
  // (the Lab passes step4) still lands on where the learner actually was.
  useEffect(() => {
    setActiveStepId(
      resolveStep(searchParams.get(BLOCK_STEP_PARAM)) ?? initialStepId ?? module.steps[0].id,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStepId, module.id, module.steps, searchParams]);

  // Mirror the active step into the URL. replace, not push: per-step history
  // entries made the back button walk every step before leaving the page.
  useEffect(() => {
    if (searchParams.get(BLOCK_STEP_PARAM) === activeStepId) return;
    const next = new URLSearchParams(searchParams);
    next.set(BLOCK_STEP_PARAM, activeStepId);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepId, searchParams, setSearchParams]);

  // Hydrate from the autosaved draft whenever the task (module + target) changes.
  useEffect(() => {
    const draft = loadInquiryDraft(draftScope);
    dirtyRef.current = false;
    setNotes(draft?.notes ?? {});
    setSelfCheckAnswers(draft?.selfChecks ?? {});
    setSavedAt(draft?.savedAt ?? null);
  }, [draftScope]);

  // Start each step at the top. Changing step swaps the panel content but not the
  // scroll offset, so pressing "다음 단계" from the bottom of a long step landed
  // the learner mid-way down the next one — often past its heading, looking like
  // nothing happened. Not window.scrollTo: body is overflow:hidden and the real
  // scroller is the app shell's <main>.
  useEffect(() => {
    const scroller = document.querySelector('.app-main');
    scroller?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStepId]);

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

  // A URL can point past the gate (stale bookmark, hand-edited ?step=): demote
  // to the last unlocked step. Runs as an effect, not at init, because the fit
  // that unlocks Steps 5–6 is read in a mount effect — clamping eagerly would
  // demote a legitimately unlocked learner during that first frame.
  useEffect(() => {
    if (stepIndex > maxUnlocked) {
      setActiveStepId(module.steps[Math.max(maxUnlocked, 0)].id);
    }
  }, [stepIndex, maxUnlocked, module.steps]);
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

  // A Lab draft save (생각해보기 O/X, 서술) counts as learner work too: bump the
  // footer's "저장됨" time, let the start-over button re-evaluate, and make the
  // sheet sync below re-run — otherwise a learner who only answered inside the
  // Lab never reached the sheet and saw no autosave signal at all.
  const [labDraftPulse, setLabDraftPulse] = useState(0);
  useEffect(() => {
    const onLabDraftSaved = (event: Event) => {
      const savedTargetId = (event as CustomEvent<string>).detail;
      if (draftTargetId && savedTargetId !== draftTargetId) return;
      dirtyRef.current = true;
      setSavedAt(Date.now());
      setLabDraftPulse((n) => n + 1);
    };
    window.addEventListener(LAB_DRAFT_SAVED_EVENT, onLabDraftSaved);
    return () => window.removeEventListener(LAB_DRAFT_SAVED_EVENT, onLabDraftSaved);
  }, [draftTargetId]);

  // Push a draft row to the sheet once the learner stops typing. Without this a
  // record only reached the sheet if someone remembered to press submit at the
  // very end — anyone who closed the tab first left nothing behind. The script
  // upserts on (anon_id, target_id), so this keeps refreshing one row rather
  // than appending. Local autosave still runs at 600ms; this is the slow lane.
  const anonTargetId = anonSubmit?.targetId ?? null;
  const anonFit = anonSubmit?.fit ?? null;
  useEffect(() => {
    if (!anonTargetId || !dirtyRef.current) return;
    const sinkUrl = getRecordSinkUrl();
    if (!sinkUrl) return;
    const timer = setTimeout(() => {
      setSheetSyncState('syncing');
      syncAnonRecord(
        sinkUrl,
        buildAnonRecordPayload({
          targetId: anonTargetId,
          status: 'draft',
          fit: anonFit,
          notes,
          selfCheckResponses: selfCheckSummary.responses,
          selfCheckAnswered: selfCheckSummary.answered,
          selfCheckTotal: selfCheckSummary.total,
          selfCheckCorrect: selfCheckSummary.correct,
          labGuideAnswers: loadLabDraft(anonTargetId)?.guideAnswers ?? {},
        }),
      )
        .then(() => setSheetSyncState('synced'))
        // Non-fatal: the notes are already safe in this browser and the next
        // edit retries. A network error mid-typing is not the learner's problem.
        .catch(() => setSheetSyncState('failed'));
    }, SHEET_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [anonTargetId, anonFit, notes, selfCheckSummary, labDraftPulse]);

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

  // The selection step now gates "다음 단계" directly on having a target — no
  // separate "이 대상으로 확인" button. Picking a target on the map (which pops
  // its info panel showing it as selected) is the confirmation.
  const selectionUnmet =
    activeStep.kind === 'selection' && Boolean(selectionConfirm) && !selectionConfirm?.ready;
  const gateBlocked = !isStepAnswered(activeStep) || selectionUnmet;

  // Why "다음 단계" is unavailable, or null when it is. Never hide the button:
  // a missing control reads as a broken page (the learner finished the Lab fit
  // and had no way forward), whereas a disabled one with a reason teaches.
  const nextBlockedReason: string | null = selectionUnmet
    ? selectionConfirm?.hint[lang] ??
      (lang === 'ko' ? '먼저 지도에서 대상을 선택하세요.' : 'Select a target on the map first.')
    : !isStepAnswered(activeStep)
    ? lang === 'ko'
      ? '다음 단계로 가려면 이 단계의 ✍️ 탐구 기록을 한 가지 이상 작성하세요.'
      : 'Write at least one ✍️ inquiry note in this step to continue.'
    : stepIndex >= maxUnlocked
      ? activeStep.kind === 'visualization'
        ? lang === 'ko'
          ? '정밀 분석(Lab)에서 모델 적합까지 마치면 다음 단계가 열립니다.'
          : 'Finish the model fit in the Lab to unlock the next step.'
        : lang === 'ko'
          ? '이 단계를 완료하면 다음 단계가 열립니다.'
          : 'Complete this step to unlock the next one.'
      : null;

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
      // No "이 대상으로 확인" button: selecting a target on the map (which shows
      // it as selected in the popup) is the confirmation, and the footer's
      // "다음 단계" stays disabled with a reason until one is picked
      // (selectionUnmet → nextBlockedReason above).
      if (selectionSlot) {
        return <>{selectionSlot}</>;
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
        {anonSubmit && <AnonCollectionNotice />}
      </>
    );
  };

  return (
    <div className="inquiry-layout">
      <header className="inquiry-layout-header">
        {/* Column, not a bare div: back-link (inline <a>) and kicker
            (inline-flex) used to run together on one line — "← 홈모듈형 탐구블럭". */}
        <div className="inquiry-layout-header-copy">
          <Link to="/" className="back-link">
            &larr; {lang === 'ko' ? '홈' : 'Home'}
          </Link>
          <h1>{localize(module.title, lang)}</h1>
          <p>{localize(module.description, lang)}</p>
        </div>
        {/* Hides itself when there is nothing saved for this target. */}
        <StartOverButton moduleId={module.id} targetId={draftTargetId} savedAt={savedAt} />
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
                <em className={`inquiry-autosave-status${sheetSyncState === 'failed' ? ' failed' : ''}`}>
                  {sheetSyncState === 'syncing'
                    ? lang === 'ko'
                      ? '자동 저장 중…'
                      : 'Autosaving…'
                    : sheetSyncState === 'synced'
                      ? lang === 'ko'
                        ? '자동 저장됨 '
                        : 'Autosaved '
                      : sheetSyncState === 'failed'
                        ? lang === 'ko'
                          ? '이 브라우저에만 저장됨 (전송 실패) '
                          : 'Saved in this browser only (upload failed) '
                        : lang === 'ko'
                          ? '이 브라우저에 자동 저장됨 '
                          : 'Autosaved in this browser '}
                  {sheetSyncState !== 'syncing' &&
                    new Date(savedAt).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                </em>
              )}
            </span>
            {stepIndex < module.steps.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                disabled={nextBlockedReason !== null}
                title={nextBlockedReason ?? undefined}
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
          {nextBlockedReason !== null && stepIndex < module.steps.length - 1 && (
            <p className="inquiry-step-gate-hint">{nextBlockedReason}</p>
          )}
        </main>
      </div>
    </div>
  );
}
