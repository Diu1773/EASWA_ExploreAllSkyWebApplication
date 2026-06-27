import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteMyWorkflowDraft,
  deleteMyRecordSubmission,
  downloadMyRecordPhotometryCsv,
  fetchMyWorkflowDrafts,
  fetchMyRecordSubmissions,
} from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import type { RecordListItem, WorkflowDraftItem } from '../../types/record';
import { useLangStore } from '../../i18n';

type PendingDeleteTarget =
  | { kind: 'record'; item: RecordListItem }
  | { kind: 'draft'; item: WorkflowDraftItem }
  | null;

export function MyAnalyses() {
  const user = useAuthStore((s) => s.user);
  const lang = useLangStore((s) => s.lang);
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [drafts, setDrafts] = useState<WorkflowDraftItem[]>([]);
  const [activeTab, setActiveTab] = useState<'drafts' | 'records'>('drafts');
  const [loading, setLoading] = useState(false);
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<PendingDeleteTarget>(null);
  const [activeAction, setActiveAction] = useState<{
    id: string;
    type: 'download-record' | 'delete-record' | 'delete-draft';
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    Promise.all([fetchMyWorkflowDrafts(), fetchMyRecordSubmissions()])
      .then(([draftItems, recordItems]) => {
        if (cancelled) return;
        setDrafts(draftItems);
        setRecords(recordItems);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load saved analyses', error);
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load saved analyses.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!pendingDeleteTarget) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeAction?.type?.startsWith('delete') && event.key === 'Escape') {
        setPendingDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingDeleteTarget, activeAction]);

  useEffect(() => {
    if (activeTab === 'drafts' && drafts.length === 0 && records.length > 0) {
      setActiveTab('records');
      return;
    }
    if (activeTab === 'records' && records.length === 0 && drafts.length > 0) {
      setActiveTab('drafts');
    }
  }, [activeTab, drafts.length, records.length]);

  const handleDownloadCsv = async (recordId: number) => {
    setErrorMessage(null);
    setActiveAction({ id: String(recordId), type: 'download-record' });
    try {
      await downloadMyRecordPhotometryCsv(recordId);
    } catch (error) {
      console.error('Failed to download saved photometry CSV', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to download saved photometry CSV.'
      );
    } finally {
      setActiveAction((current) =>
        current?.id === String(recordId) && current.type === 'download-record'
          ? null
          : current
      );
    }
  };

  const handleConfirmDeleteTarget = async () => {
    if (!pendingDeleteTarget) return;
    setErrorMessage(null);
    try {
      if (pendingDeleteTarget.kind === 'record') {
        const record = pendingDeleteTarget.item;
        setActiveAction({ id: String(record.submission_id), type: 'delete-record' });
        await deleteMyRecordSubmission(record.submission_id);
        setRecords((current) =>
          current.filter((item) => item.submission_id !== record.submission_id)
        );
      } else {
        const draft = pendingDeleteTarget.item;
        setActiveAction({ id: draft.draft_id, type: 'delete-draft' });
        await deleteMyWorkflowDraft(draft.draft_id);
        setDrafts((current) => current.filter((item) => item.draft_id !== draft.draft_id));
      }
      setPendingDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete saved analysis item', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to delete saved analysis item.'
      );
    } finally {
      setActiveAction((current) => (current?.type?.startsWith('delete') ? null : current));
    }
  };

  if (!user) {
    return (
      <div className="page-placeholder">
        <h2>{lang === 'ko' ? '내 분석 기록' : 'My Analyses'}</h2>
        <p>{lang === 'ko' ? '분석 기록을 보려면 로그인하세요.' : 'Please sign in to view your analysis history.'}</p>
        <a href="/api/auth/login" className="btn-primary">
          {lang === 'ko' ? 'Google로 로그인' : 'Sign in with Google'}
        </a>
      </div>
    );
  }

  return (
    <div className="page-placeholder">
      <h2>{lang === 'ko' ? '내 분석 기록' : 'My Analyses'}</h2>
      <p className="hint">
        {lang === 'ko'
          ? 'Google 계정에 저장된 분석 기록입니다. 읽기 전용으로 열거나 새 초안을 만들어 Lab에서 분석을 이어갈 수 있습니다.'
          : 'Saved records attached to your Google account appear here. Open them read-only or create a new draft to continue editing in Lab.'}
      </p>

      {loading && <p className="hint">{lang === 'ko' ? '분석 기록 불러오는 중...' : 'Loading saved analyses...'}</p>}
      {errorMessage && <p className="hint error-text">{errorMessage}</p>}

      {!loading && !errorMessage && drafts.length === 0 && records.length === 0 && (
        <div className="page-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <strong>{lang === 'ko' ? '아직 저장된 분석이 없습니다' : 'No analyses yet'}</strong>
          <p>
            {lang === 'ko'
              ? 'Transit Lab 또는 Microlensing Lab에서 탐구를 시작하고 최종 기록을 저장하세요.'
              : 'Start in Transit Lab or Microlensing Lab and submit the final record form. Submitted records will show up here.'}
          </p>
        </div>
      )}

      {!loading && !errorMessage && (drafts.length > 0 || records.length > 0) && (
        <div
          className="analysis-tab-row"
          role="tablist"
          aria-label={lang === 'ko' ? '저장된 분석 구분' : 'Saved analysis sections'}
        >
          <button
            type="button"
            className={`analysis-tab ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
            role="tab"
            aria-selected={activeTab === 'drafts'}
          >
            {lang === 'ko' ? '초안' : 'Drafts'}
            <span className="analysis-tab-count">{drafts.length}</span>
          </button>
          <button
            type="button"
            className={`analysis-tab ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
            role="tab"
            aria-selected={activeTab === 'records'}
          >
            {lang === 'ko' ? '완료 기록' : 'Records'}
            <span className="analysis-tab-count">{records.length}</span>
          </button>
        </div>
      )}

      {!loading && activeTab === 'drafts' && drafts.length === 0 && records.length > 0 && (
        <div className="page-empty-state analysis-tab-empty">
          <strong>{lang === 'ko' ? '현재 초안이 없습니다' : 'No drafts right now'}</strong>
          <p>{lang === 'ko' ? '저장된 결과는 완료 기록 탭에서 확인할 수 있습니다.' : 'Saved records are available in the Records tab.'}</p>
        </div>
      )}

      {!loading && activeTab === 'drafts' && drafts.length > 0 && (
        <>
          <h3 className="settings-section">{lang === 'ko' ? '초안' : 'Drafts'}</h3>
          <div className="analysis-record-list">
            {drafts.map((draft) => (
              <article key={draft.draft_id} className="analysis-record-card">
                <div className="analysis-record-head">
                  <div>
                    <span className="analysis-record-kicker">{lang === 'ko' ? '초안' : 'Draft'}</span>
                    <h3>{draft.title?.trim() || `${draft.target_id} ${lang === 'ko' ? '초안' : 'draft'}`}</h3>
                  </div>
                  <span className="analysis-launcher-tag">{draft.target_id}</span>
                </div>
                <div className="analysis-record-meta">
                  <span>{lang === 'ko' ? '수정' : 'Updated'} {draft.updated_at}</span>
                  {draft.last_opened_at && <span>{lang === 'ko' ? '최근 열기' : 'Opened'} {draft.last_opened_at}</span>}
                  <span>{draft.workflow}</span>
                  <span>v{draft.workflow_version}</span>
                  <span>{draft.status}</span>
                  {draft.seed_record_id !== null && draft.seed_record_id !== undefined && (
                    <span>{lang === 'ko' ? '원본 기록' : 'Seed record'} #{draft.seed_record_id}</span>
                  )}
                </div>
                <div className="analysis-record-actions">
                  <Link
                    to={`/lab/${draft.target_id}?draft=${encodeURIComponent(draft.draft_id)}${
                      draft.seed_record_id !== null && draft.seed_record_id !== undefined
                        ? `&seedRecord=${draft.seed_record_id}`
                        : ''
                    }`}
                    className="btn-sm"
                  >
                    {lang === 'ko' ? '초안 계속하기' : 'Continue Draft'}
                  </Link>
                  {draft.seed_record_id !== null && draft.seed_record_id !== undefined && (
                    <Link to={`/records/${draft.seed_record_id}`} className="btn-sm">
                      {lang === 'ko' ? '원본 기록 열기' : 'Open Seed Record'}
                    </Link>
                  )}
                  <Link to={`/target/${draft.target_id}`} className="btn-sm">
                    {lang === 'ko' ? '대상 보기' : 'View Target'}
                  </Link>
                  <button
                    type="button"
                    className="btn-sm analysis-record-delete-trigger"
                    disabled={
                      activeAction?.id === draft.draft_id && activeAction.type === 'delete-draft'
                    }
                    onClick={() => setPendingDeleteTarget({ kind: 'draft', item: draft })}
                  >
                    {activeAction?.id === draft.draft_id && activeAction.type === 'delete-draft'
                      ? lang === 'ko' ? '삭제 중...' : 'Deleting...'
                      : lang === 'ko' ? '삭제' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!loading && activeTab === 'records' && records.length === 0 && drafts.length > 0 && (
        <div className="page-empty-state analysis-tab-empty">
          <strong>{lang === 'ko' ? '아직 완료 기록이 없습니다' : 'No records yet'}</strong>
          <p>{lang === 'ko' ? '초안의 분석과 해석을 마친 뒤 최종 기록을 저장하세요.' : 'Continue a draft and submit the final record form when the analysis is ready.'}</p>
        </div>
      )}

      {!loading && activeTab === 'records' && records.length > 0 && (
        <>
          <h3 className="settings-section">{lang === 'ko' ? '완료 기록' : 'Records'}</h3>
          <div className="analysis-record-list">
            {records.map((record) => {
              const payload = record.payload as {
                context?: {
                  target_name?: string;
                  sector?: number;
                  frame_count?: number;
                  site_label?: string;
                };
                answers?: {
                  transit_visible?: string;
                  curve_quality?: string;
                  confidence_score?: number;
                  event_classification?: string;
                  fit_quality?: string;
                  coverage_assessment?: string;
                };
              };
              const isDownloading =
                activeAction?.id === String(record.submission_id) &&
                activeAction.type === 'download-record';
              const isDeleting =
                activeAction?.id === String(record.submission_id) &&
                activeAction.type === 'delete-record';
              const canDownloadCsv = record.workflow === 'transit_lab';
              return (
                <article key={record.submission_id} className="analysis-record-card">
                  <div className="analysis-record-head">
                    <div>
                      <span className="analysis-record-kicker">{lang === 'ko' ? '기록' : 'Record'} #{record.submission_id}</span>
                      <h3>{record.title}</h3>
                    </div>
                    <span className="analysis-launcher-tag">
                      {payload.context?.target_name ?? record.target_id}
                    </span>
                  </div>
                  <div className="analysis-record-meta">
                    <span>{record.created_at}</span>
                    {payload.context?.sector !== undefined && (
                      <span>Sector {payload.context.sector}</span>
                    )}
                    {payload.context?.site_label && (
                      <span>{payload.context.site_label}</span>
                    )}
                    {payload.context?.frame_count !== undefined && (
                      <span>{payload.context.frame_count.toLocaleString()} {lang === 'ko' ? '프레임' : 'frames'}</span>
                    )}
                  </div>
                  <div className="analysis-record-summary">
                    {payload.answers?.transit_visible && (
                      <span>{lang === 'ko' ? '식현상' : 'Transit'}: {payload.answers.transit_visible}</span>
                    )}
                    {payload.answers?.curve_quality && (
                      <span>{lang === 'ko' ? '품질' : 'Quality'}: {payload.answers.curve_quality}</span>
                    )}
                    {payload.answers?.event_classification && (
                      <span>{lang === 'ko' ? '이벤트' : 'Event'}: {payload.answers.event_classification}</span>
                    )}
                    {payload.answers?.fit_quality && (
                      <span>{lang === 'ko' ? '적합' : 'Fit'}: {payload.answers.fit_quality}</span>
                    )}
                    {payload.answers?.coverage_assessment && (
                      <span>{lang === 'ko' ? '관측 범위' : 'Coverage'}: {payload.answers.coverage_assessment}</span>
                    )}
                    {payload.answers?.confidence_score !== undefined && (
                      <span>{lang === 'ko' ? '확신도' : 'Confidence'}: {payload.answers.confidence_score}/5</span>
                    )}
                  </div>
                  <div className="analysis-record-actions">
                    <Link to={`/records/${record.submission_id}`} className="btn-sm">
                      {lang === 'ko' ? '기록 열기' : 'Open Record'}
                    </Link>
                    <Link
                      to={`/lab/${record.target_id}?seedRecord=${record.submission_id}`}
                      className="btn-sm"
                    >
                      {lang === 'ko' ? '새 초안 만들기' : 'Create Draft'}
                    </Link>
                    <Link to={`/target/${record.target_id}`} className="btn-sm">
                      {lang === 'ko' ? '대상 보기' : 'View Target'}
                    </Link>
                    {canDownloadCsv && (
                      <button
                        type="button"
                        className="btn-sm"
                        disabled={isDownloading || isDeleting}
                        onClick={() => handleDownloadCsv(record.submission_id)}
                      >
                        {isDownloading
                          ? lang === 'ko' ? '내려받는 중...' : 'Downloading...'
                          : lang === 'ko' ? 'CSV 내려받기' : 'Download CSV'}
                      </button>
                    )}
                    <button
                      type="button"
                    className="btn-sm analysis-record-delete-trigger"
                    disabled={isDownloading || isDeleting}
                    onClick={() => setPendingDeleteTarget({ kind: 'record', item: record })}
                  >
                    {isDeleting
                      ? lang === 'ko' ? '삭제 중...' : 'Deleting...'
                      : lang === 'ko' ? '삭제' : 'Delete'}
                  </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {pendingDeleteTarget && (
        <div
          className="analysis-delete-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!activeAction?.type?.startsWith('delete')) {
              setPendingDeleteTarget(null);
            }
          }}
        >
          <div
            className="analysis-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-delete-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="analysis-delete-modal-kicker">
              {lang === 'ko' ? '분석 삭제' : 'Delete Analysis'}
            </div>
            <h3 id="analysis-delete-modal-title">
              {pendingDeleteTarget.kind === 'record'
                ? lang === 'ko'
                  ? `기록 #${pendingDeleteTarget.item.submission_id}을 삭제할까요?`
                  : `Delete record #${pendingDeleteTarget.item.submission_id}?`
                : lang === 'ko' ? '초안을 삭제할까요?' : 'Delete draft?'}
            </h3>
            <p>
              <strong>
                {pendingDeleteTarget.kind === 'record'
                  ? pendingDeleteTarget.item.title
                  : pendingDeleteTarget.item.title ?? pendingDeleteTarget.item.draft_id}
              </strong>
            </p>
            <p className="hint">
              {pendingDeleteTarget.kind === 'record'
                ? lang === 'ko'
                  ? '저장된 분석이 영구 삭제되며 되돌릴 수 없습니다.'
                  : 'This action permanently removes the saved analysis and cannot be undone.'
                : lang === 'ko'
                  ? '저장된 초안 세션이 영구 삭제됩니다. 연결된 원본 기록은 유지됩니다.'
                  : 'This action permanently removes the saved draft session. The source record, if any, will remain untouched.'}
            </p>
            <div className="analysis-delete-modal-actions">
              <button
                type="button"
                className="btn-sm"
                disabled={Boolean(activeAction?.type?.startsWith('delete'))}
                onClick={() => setPendingDeleteTarget(null)}
              >
                {lang === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={Boolean(activeAction?.type?.startsWith('delete'))}
                onClick={() => {
                  void handleConfirmDeleteTarget();
                }}
              >
                {activeAction?.type?.startsWith('delete')
                  ? lang === 'ko' ? '삭제 중...' : 'Deleting...'
                  : lang === 'ko' ? '삭제' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
