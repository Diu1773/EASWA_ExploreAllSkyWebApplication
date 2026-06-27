import { useState } from 'react';
import { submitRecordTemplate } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLangStore } from '../../i18n';

export interface RecordSaveConfig {
  workflow: string;
  templateId: string;
  targetId: string;
  title: string;
  context: Record<string, unknown>;
}

interface RecordSavePanelProps {
  config: RecordSaveConfig;
  answers: Record<string, string>;
}

/**
 * Single save at the end of the common block (Step 6). Persists the bridged
 * analysis output + the learner's notes as one record — the block, not the
 * Lab, owns saving.
 */
export function RecordSavePanel({ config, answers }: RecordSavePanelProps) {
  const lang = useLangStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) {
      setError(
        lang === 'ko'
          ? '저장하려면 우측 상단에서 Google로 로그인하세요.'
          : 'Sign in with Google (top right) to save.',
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await submitRecordTemplate(config.templateId, {
        workflow: config.workflow,
        target_id: config.targetId,
        observation_ids: [],
        title: config.title,
        context: config.context,
        answers,
      });
      setSavedId(res.submission_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="inquiry-record-save">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '기록 저장' : 'Save Record'}</span>
      {savedId !== null ? (
        <p className="inquiry-record-save-done">
          {lang === 'ko'
            ? `저장됨 (#${savedId}) — '내 분석'에서 다시 볼 수 있습니다.`
            : `Saved (#${savedId}) — find it in My Analyses.`}
        </p>
      ) : (
        <>
          <p>
            {lang === 'ko'
              ? '이번 탐구의 산출값·기준값 비교·해석 기록을 한 번에 저장합니다.'
              : 'Save the derived values, reference comparison, and your interpretation in one record.'}
          </p>
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
            {saving
              ? lang === 'ko'
                ? '저장 중…'
                : 'Saving…'
              : lang === 'ko'
                ? '내 기록에 저장'
                : 'Save to My Records'}
          </button>
          {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
        </>
      )}
    </section>
  );
}
