import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchMyWorkflowDraft } from '../api/client';
import { normalizeWorkflowDraftSearchParams } from '../workflows/core/draftRoute';
import {
  buildWorkflowSessionStorageKey,
} from '../utils/workflowSession';

interface UseWorkflowDraftRouteOptions {
  workflowId: string;
  subjectId: string | null | undefined;
  enableDrafts: boolean;
  userPresent: boolean;
  onError?: (message: string) => void;
}

interface WorkflowDraftRouteState {
  draftId: string | null;
  seedRecordId: number | null;
  draftRestoreReady: boolean;
}

export function useWorkflowDraftRoute({
  workflowId,
  subjectId,
  enableDrafts,
  userPresent,
  onError,
}: UseWorkflowDraftRouteOptions): WorkflowDraftRouteState {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftRestoreReady, setDraftRestoreReady] = useState(true);

  const draftParam = searchParams.get('draft');
  const seedRecordParam = searchParams.get('seedRecord');
  const legacyRecordParam = searchParams.get('record');
  const parsedDraftId = draftParam && draftParam.trim() !== '' ? draftParam : null;
  const parsedSeedRecordId = seedRecordParam ? Number(seedRecordParam) : null;
  const parsedLegacyRecordId = legacyRecordParam ? Number(legacyRecordParam) : null;

  useEffect(() => {
    const nextParams = normalizeWorkflowDraftSearchParams({
      searchParams,
      enableDrafts,
      subjectId,
      userPresent,
    });
    if (!nextParams) return;
    setSearchParams(nextParams, { replace: true });
  }, [
    enableDrafts,
    searchParams,
    setSearchParams,
    subjectId,
    userPresent,
  ]);

  useEffect(() => {
    if (!enableDrafts || !subjectId || !parsedDraftId || !userPresent) {
      setDraftRestoreReady(true);
      return;
    }

    const storageKey = buildWorkflowSessionStorageKey({
      workflowId,
      subjectId,
      source: { kind: 'draft', id: parsedDraftId },
    });
    if (sessionStorage.getItem(storageKey)) {
      setDraftRestoreReady(true);
      return;
    }

    let cancelled = false;
    setDraftRestoreReady(false);

    void (async () => {
      try {
        const draft = await fetchMyWorkflowDraft(parsedDraftId);
        if (cancelled) return;
        if (draft?.envelope) {
          sessionStorage.setItem(storageKey, JSON.stringify(draft.envelope));
        }
      } catch (error) {
        if (cancelled) return;
        // A brand-new draft id has nothing on the server yet — the normalizer
        // mints one on first visit, so this 404 is the normal cold-start path,
        // not a failure to surface.
        const isNewDraft =
          error instanceof Error && /not found/i.test(error.message);
        if (!isNewDraft) {
          console.error('Failed to restore workflow draft', error);
          onError?.(
            error instanceof Error ? error.message : 'Failed to restore saved draft.'
          );
        }
      } finally {
        if (!cancelled) {
          setDraftRestoreReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enableDrafts, onError, parsedDraftId, subjectId, userPresent, workflowId]);

  return {
    draftId: parsedDraftId,
    seedRecordId:
      parsedSeedRecordId !== null && Number.isFinite(parsedSeedRecordId)
        ? parsedSeedRecordId
        : parsedLegacyRecordId !== null && Number.isFinite(parsedLegacyRecordId)
          ? parsedLegacyRecordId
          : null,
    draftRestoreReady,
  };
}
