import { useEffect, useRef, useState } from 'react';

export interface PersistedWorkflowEnvelope<TStep extends string, TSnapshot> {
  version: number;
  step: TStep;
  snapshot: TSnapshot;
}

export interface UsePersistedWorkflowStepOptions<
  TStep extends string,
  TSnapshot,
  TAvailability,
> {
  storageKey: string;
  version: number;
  defaultStep: TStep;
  currentAvailability: TAvailability;
  emptyAvailability: TAvailability;
  parseStep: (value: string | null) => TStep | null;
  clampStep: (requestedStep: TStep, availability: TAvailability) => TStep;
  snapshot: TSnapshot;
  restoreSnapshot: (raw: unknown) => TSnapshot | null;
  applyRestoredSnapshot: (snapshot: TSnapshot | null, restoredStep: TStep) => void;
  getSnapshotAvailability: (snapshot: TSnapshot | null) => TAvailability;
}

/**
 * Persists a workflow's step + snapshot to sessionStorage — NOT the URL.
 *
 * The Lab lives inside the block's Step 4, and the block (InquiryLayout) already
 * owns the URL with ?blockStep=. When this hook also wrote a ?step= param, two
 * components drove the same query string through separate useSearchParams
 * instances: on a back/forward each tried to restore its own param and reacted
 * to the other's write, ping-ponging into a setState loop (React #185 crash,
 * reported 2026-07-18). It also meant browser-back rewound Lab sub-steps instead
 * of leaving the page.
 *
 * The fix is ownership: the block owns history (which STEP you're on), and the
 * Lab's internal step is view state — kept in sessionStorage so a reload
 * restores it, but out of the URL entirely. Stepper clicks move it; the back
 * button belongs to the block.
 */
export function usePersistedWorkflowStep<
  TStep extends string,
  TSnapshot,
  TAvailability,
>({
  storageKey,
  version,
  defaultStep,
  currentAvailability,
  emptyAvailability,
  parseStep,
  clampStep,
  snapshot,
  restoreSnapshot,
  applyRestoredSnapshot,
  getSnapshotAvailability,
}: UsePersistedWorkflowStepOptions<TStep, TSnapshot, TAvailability>) {
  const [step, setStepState] = useState<TStep>(defaultStep);
  const [hydrated, setHydrated] = useState(false);
  const [hasRestoredSnapshot, setHasRestoredSnapshot] = useState(false);
  const stepRef = useRef(defaultStep);
  const parseStepRef = useRef(parseStep);
  const clampStepRef = useRef(clampStep);
  const currentAvailabilityRef = useRef(currentAvailability);
  const emptyAvailabilityRef = useRef(emptyAvailability);
  const restoreSnapshotRef = useRef(restoreSnapshot);
  const applyRestoredSnapshotRef = useRef(applyRestoredSnapshot);
  const getSnapshotAvailabilityRef = useRef(getSnapshotAvailability);

  const commitStep = (requestedStep: TStep): TStep => {
    const safeStep = clampStepRef.current(requestedStep, currentAvailabilityRef.current);
    if (stepRef.current !== safeStep) {
      stepRef.current = safeStep;
      setStepState(safeStep);
    }
    return safeStep;
  };

  useEffect(() => {
    parseStepRef.current = parseStep;
    clampStepRef.current = clampStep;
    currentAvailabilityRef.current = currentAvailability;
    emptyAvailabilityRef.current = emptyAvailability;
    restoreSnapshotRef.current = restoreSnapshot;
    applyRestoredSnapshotRef.current = applyRestoredSnapshot;
    getSnapshotAvailabilityRef.current = getSnapshotAvailability;
  }, [
    applyRestoredSnapshot,
    clampStep,
    currentAvailability,
    emptyAvailability,
    getSnapshotAvailability,
    parseStep,
    restoreSnapshot,
  ]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Restore step + snapshot from sessionStorage (survives reload, gone when the
  // browser closes — matches the anonymous-work policy). No URL read.
  useEffect(() => {
    setHydrated(false);

    let restoredSnapshot: TSnapshot | null = null;
    let savedStep: TStep | null = null;

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as
          | PersistedWorkflowEnvelope<TStep, unknown>
          | Record<string, unknown>;

        if (parsed && typeof parsed === 'object' && 'version' in parsed && 'snapshot' in parsed) {
          const envelope = parsed as PersistedWorkflowEnvelope<TStep, unknown>;
          savedStep = parseStepRef.current(
            typeof envelope.step === 'string' ? envelope.step : null,
          );
          restoredSnapshot =
            envelope.version === version
              ? restoreSnapshotRef.current(envelope.snapshot)
              : restoreSnapshotRef.current(envelope.snapshot ?? parsed);
        } else {
          savedStep = parseStepRef.current(
            typeof parsed?.step === 'string' ? (parsed.step as string) : null,
          );
          restoredSnapshot = restoreSnapshotRef.current(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to restore persisted workflow state', error);
    }

    const restoredStep = clampStepRef.current(
      savedStep ?? defaultStep,
      restoredSnapshot
        ? getSnapshotAvailabilityRef.current(restoredSnapshot)
        : emptyAvailabilityRef.current,
    );

    setHasRestoredSnapshot(restoredSnapshot !== null);
    applyRestoredSnapshotRef.current(restoredSnapshot, restoredStep);
    stepRef.current = restoredStep;
    setStepState(restoredStep);
    setHydrated(true);
  }, [defaultStep, storageKey, version]);

  // Keep the step within what the current analysis state allows (e.g. a fit was
  // cleared, closing later steps).
  useEffect(() => {
    if (!hydrated) return;
    const safeStep = clampStepRef.current(stepRef.current, currentAvailability);
    if (safeStep !== stepRef.current) {
      stepRef.current = safeStep;
      setStepState(safeStep);
    }
  }, [currentAvailability, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const envelope: PersistedWorkflowEnvelope<TStep, TSnapshot> = {
      version,
      step,
      snapshot,
    };
    sessionStorage.setItem(storageKey, JSON.stringify(envelope));
  }, [hydrated, snapshot, step, storageKey, version]);

  const clearPersistedWorkflow = () => {
    sessionStorage.removeItem(storageKey);
    setHasRestoredSnapshot(false);
  };

  const setStep = (requestedStep: TStep) => {
    commitStep(requestedStep);
  };

  const replaceStep = (requestedStep: TStep) => {
    commitStep(requestedStep);
  };

  return {
    step,
    setStep,
    replaceStep,
    hydrated,
    hasRestoredSnapshot,
    clearPersistedWorkflow,
  };
}
