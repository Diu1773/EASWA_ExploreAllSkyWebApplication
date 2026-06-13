import { useEffect, useState } from 'react';
import { fetchGuideStats, type GuideStats } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';

// Map question IDs to readable labels
const QUESTION_LABELS: Record<string, string> = {
  'select_q1': '[TESS 1] 비교성 밝기 기준',
  'select_q2': '[TESS 1] 좋은 비교성 조건',
  'select_q3': '[TESS 1] 목표 별과 비교성 구별',
  'run_q1': '[TESS 2] 비교성 수와 정밀도',
  'run_q2': '[TESS 2] 앙상블 측광의 장점',
  'run_q3': '[TESS 2] 구경 크기의 영향',
  'qc_q1': '[TESS 3] 변광성의 비교성 사용',
  'qc_q2': '[TESS 3] 비교성 RMS 해석',
  'qc_q3': '[TESS 3] 비교성 제외 근거',
  'lc_q1': '[TESS 4] 식 중 밝기 변화',
  'lc_q2': '[TESS 4] 식 깊이와 행성 크기',
  'lc_q3': '[TESS 4] 식 구간 판별 근거',
  'fit_q1': '[TESS 5] χ²_red 해석',
  'fit_q2': '[TESS 5] Rp/R* 해석',
  'fit_q3': '[TESS 5] 기준값 차이 원인',
  'rec_q1': '[TESS 6] 문헌값과 측정값',
  'rec_q2': '[TESS 6] 주요 오차 원인',
  'rec_q3': '[TESS 6] 후속 탐구',
  'kmt_field_q1': '[KMT 1] 단일 관측소의 한계',
  'kmt_field_q2': '[KMT 1] 은하벌지 측광 난점',
  'kmt_field_q3': '[KMT 1] 이벤트 위치 판별',
  'kmt_align_q1': '[KMT 2] 프레임 정렬 필요성',
  'kmt_align_q2': '[KMT 2] 정렬 품질 확인',
  'kmt_align_q3': '[KMT 2] 정렬 전후 비교',
  'kmt_diff_q1': '[KMT 3] 차분영상 원리',
  'kmt_diff_q2': '[KMT 3] 밝은 잔차 해석',
  'kmt_diff_q3': '[KMT 3] 잔차와 시각',
  'kmt_extract_q1': '[KMT 4] 단일 관측소 곡선',
  'kmt_extract_q2': '[KMT 4] 단일 곡선 확인 목적',
  'kmt_extract_q3': '[KMT 4] 관측 공백과 한계',
  'kmt_merge_q1': '[KMT 5] 관측망 배치',
  'kmt_merge_q2': '[KMT 5] 병합 효과 확인',
  'kmt_merge_q3': '[KMT 5] 추가된 정보',
  'kmt_fit_q1': '[KMT 6] u₀와 최대 증폭',
  'kmt_fit_q2': '[KMT 6] tE의 의미',
  'kmt_fit_q3': '[KMT 6] 단일 렌즈 모델 해석',
};

const CORRECT_ANSWERS: Record<string, string> = {
  'select_q1': 'X',
  'select_q2': '목표 별과 비슷한 밝기',
  'run_q1': 'X',
  'run_q2': '개별 비교성의 오차가 평균화된다',
  'qc_q1': 'X',
  'qc_q2': '밝기 변화가 불규칙하다',
  'lc_q1': 'O',
  'lc_q2': '행성이 별에 비해 크다',
  'fit_q1': 'X',
  'fit_q2': '행성 반지름이 별 반지름의 10%',
  'rec_q1': 'X',
  'rec_q2': '데이터 품질(TESS 노이즈)',
  'kmt_field_q1': 'X',
  'kmt_field_q2': '별이 너무 빽빽하게 섞여 있다',
  'kmt_align_q1': 'X',
  'kmt_align_q2': '별상이 reference와 얼마나 겹치는가',
  'kmt_diff_q1': 'O',
  'kmt_diff_q2': '기준영상보다 현재 프레임에서 더 밝아졌다',
  'kmt_extract_q1': 'O',
  'kmt_extract_q2': '관측소별 데이터 품질과 공백을 먼저 확인하려고',
  'kmt_merge_q1': 'O',
  'kmt_merge_q2': '피크와 공백 구간이 얼마나 채워지는가',
  'kmt_fit_q1': 'O',
  'kmt_fit_q2': '아인슈타인 반경 통과 시간',
};

function AnswerBar({
  answer,
  count,
  total,
  isCorrect,
  isOpen,
}: {
  answer: string;
  count: number;
  total: number;
  isCorrect: boolean;
  isOpen: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="admin-answer-row">
      <div className="admin-answer-label" title={answer}>
        {isOpen ? (
          <span className="admin-answer-open">{answer}</span>
        ) : (
          <>
            {isCorrect && <span className="admin-correct-badge">✓</span>}
            <span>{answer}</span>
          </>
        )}
      </div>
      {!isOpen && (
        <div className="admin-bar-wrap">
          <div
            className={`admin-bar ${isCorrect ? 'admin-bar-correct' : ''}`}
            style={{ width: `${pct}%` }}
          />
          <span className="admin-bar-pct">{count} ({pct}%)</span>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  qid,
  answers,
}: {
  qid: string;
  answers: Record<string, number>;
}) {
  const label = QUESTION_LABELS[qid] ?? qid;
  const correctAnswer = CORRECT_ANSWERS[qid];
  const isOpen = qid.endsWith('_q3');
  const total = Object.values(answers).reduce((s, c) => s + c, 0);

  const sortedEntries = Object.entries(answers).sort(([, a], [, b]) => b - a);

  return (
    <div className="admin-question-card">
      <div className="admin-question-label">{label}</div>
      <div className="admin-question-total">{total}개 응답</div>
      <div className="admin-answers">
        {sortedEntries.map(([answer, count]) => (
          <AnswerBar
            key={answer}
            answer={answer}
            count={count}
            total={total}
            isCorrect={answer === correctAnswer}
            isOpen={isOpen}
          />
        ))}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const [statsState, setStatsState] = useState<{
    userId: number | null;
    stats: GuideStats | null;
    error: string | null;
  }>({
    userId: null,
    stats: null,
    error: null,
  });

  useEffect(() => {
    if (authLoading || !user?.is_admin) return;

    let cancelled = false;
    fetchGuideStats()
      .then((data) => {
        if (!cancelled) {
          setStatsState({ userId: user.id, stats: data, error: null });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setStatsState({
            userId: user.id,
            stats: null,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, user?.is_admin]);

  if (authLoading) {
    return <div className="page-placeholder"><p>Checking admin access...</p></div>;
  }
  if (!user) {
    return (
      <div className="page-placeholder">
        <h2>Admin</h2>
        <p>Please sign in with an administrator account.</p>
        <a href="/api/auth/login" className="btn-primary">
          Sign in with Google
        </a>
      </div>
    );
  }
  if (!user.is_admin) {
    return (
      <div className="page-placeholder">
        <h2>Admin</h2>
        <p>You do not have permission to view this dashboard.</p>
      </div>
    );
  }

  const stats = statsState.userId === user.id ? statsState.stats : null;
  const error = statsState.userId === user.id ? statsState.error : null;

  if (!stats && !error) {
    return <div className="page-placeholder"><p>Loading stats…</p></div>;
  }
  if (error) {
    return <div className="page-placeholder"><p style={{ color: 'var(--color-error)' }}>{error}</p></div>;
  }
  if (!stats) {
    return <div className="page-placeholder"><p>No data.</p></div>;
  }

  const guidePct =
    stats.total_records > 0
      ? Math.round((stats.records_with_guide / stats.total_records) * 100)
      : 0;

  const qids = Object.keys(stats.question_stats);

  return (
    <div className="admin-dashboard">
      <h2 className="admin-title">탐구 질문 응답 통계</h2>

      <div className="admin-summary-row">
        <div className="admin-summary-card">
          <div className="admin-summary-value">{stats.total_records}</div>
          <div className="admin-summary-label">전체 기록</div>
        </div>
        <div className="admin-summary-card">
          <div className="admin-summary-value">{stats.records_with_guide}</div>
          <div className="admin-summary-label">탐구 답변 포함</div>
        </div>
        <div className="admin-summary-card">
          <div className="admin-summary-value">{guidePct}%</div>
          <div className="admin-summary-label">탐구 참여율</div>
        </div>
      </div>

      {qids.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', marginTop: '2rem' }}>
          아직 탐구 답변이 없습니다.
        </p>
      ) : (
        <div className="admin-questions-grid">
          {qids.map((qid) => (
            <QuestionCard
              key={qid}
              qid={qid}
              answers={stats.question_stats[qid]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
