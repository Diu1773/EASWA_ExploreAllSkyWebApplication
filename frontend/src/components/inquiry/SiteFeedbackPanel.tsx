import { useLangStore } from '../../i18n';

/**
 * Step 6 사이트 피드백 — 이 웹앱 자체에 대한 개선 의견을 받는다. 공공 배포 시
 * 온라인으로 피드백을 모으기 위한 채널.
 *
 * 학습 기록과 분리: 성격이 다른 데이터라(탐구 응답 = 연구용, 이건 제품 개선용)
 * 시트에서도 별도 컬럼(site_rating/site_feedback)으로 나간다.
 *
 * 선택·접이식: Step 6은 이미 기록칸이 여러 개다. 필수로 강제하면 인지과부하이므로
 * 접어 두고, 원하는 사람만 펼쳐 남긴다.
 */
interface SiteFeedbackPanelProps {
  rating: number;
  feedback: string;
  onRating: (rating: number) => void;
  onFeedback: (feedback: string) => void;
}

export function SiteFeedbackPanel({ rating, feedback, onRating, onFeedback }: SiteFeedbackPanelProps) {
  const lang = useLangStore((s) => s.lang);
  const ko = lang === 'ko';
  return (
    <details className="site-feedback">
      <summary>{ko ? '이 도구는 어땠나요? (선택)' : 'How was this tool? (optional)'}</summary>
      <p className="site-feedback-note">
        {ko
          ? '여러분의 의견은 이 웹앱을 고치는 데만 쓰입니다. 위 탐구 기록과는 별개예요.'
          : 'Your feedback is used only to improve this web app — separate from the inquiry record above.'}
      </p>
      <div className="site-feedback-stars" role="radiogroup" aria-label={ko ? '만족도' : 'Rating'}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === rating}
            aria-label={`${n}`}
            className={`site-feedback-star${n <= rating ? ' on' : ''}`}
            onClick={() => onRating(n === rating ? 0 : n)}
          >
            ★
          </button>
        ))}
        {rating > 0 && <span className="site-feedback-rating-num">{rating} / 5</span>}
      </div>
      <textarea
        className="site-feedback-text"
        placeholder={ko ? '개선하면 좋을 점, 좋았던 점을 자유롭게 적어주세요' : 'What could be better, or what worked well?'}
        value={feedback}
        onChange={(e) => onFeedback(e.target.value)}
        rows={3}
      />
    </details>
  );
}
