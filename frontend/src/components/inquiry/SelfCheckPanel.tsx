import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { SelfCheckItem } from '../../explorationBlocks/types';

interface SelfCheckPanelProps {
  items: SelfCheckItem[];
  /** Step id. Scopes answer keys to `${scope}:${item.id}` so that the same item
   *  id appearing in two steps or modules cannot collide in the lifted state. */
  scope: string;
  answers: Record<string, string | number>;
  onAnswer: (key: string, value: string | number) => void;
}

/**
 * Interactive "생각해보기" self-checks (O/X and multiple-choice) with immediate
 * feedback — turns the otherwise read-only info steps into an active check,
 * mirroring the Transit Lab's self-check pattern.
 *
 * Answers are owned by InquiryLayout rather than this panel: they have to
 * survive step navigation (this unmounts on every step change) and they ride
 * along with the Step 6 anonymous submission.
 */
export function SelfCheckPanel({ items, scope, answers, onAnswer }: SelfCheckPanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-selfcheck">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '생각해보기' : 'Check Yourself'}</span>
      {items.map((item) => {
        const key = `${scope}:${item.id}`;
        const answer = answers[key];
        const answered = answer !== undefined;
        const isCorrect =
          item.type === 'ox' ? answer === item.correct : answer === item.correctIndex;

        return (
          <div key={item.id} className="inquiry-selfcheck-item">
            <strong>{localize(item.question, lang)}</strong>

            {item.type === 'ox' ? (
              <div className="inquiry-selfcheck-options">
                {(['O', 'X'] as const).map((opt) => {
                  const chosen = answer === opt;
                  const isAnswer = item.correct === opt;
                  // Only the button the learner PRESSED gets a filled background
                  // (green when right, red when wrong). The correct answer they
                  // did NOT press gets a dashed hint outline — otherwise both O
                  // and X ended up filled and looked like two selections.
                  const showCorrect = answered && chosen && isAnswer;
                  const showWrong = answered && chosen && !isAnswer;
                  const showHint = answered && !chosen && isAnswer;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`inquiry-selfcheck-btn${chosen ? ' chosen' : ''}${showCorrect ? ' correct' : ''}${showWrong ? ' wrong' : ''}${showHint ? ' answer-hint' : ''}`}
                      onClick={() => onAnswer(key, opt)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="inquiry-selfcheck-options choice">
                {item.options.map((opt, idx) => {
                  const chosen = answer === idx;
                  const isAnswer = item.correctIndex === idx;
                  const showCorrect = answered && chosen && isAnswer;
                  const showWrong = answered && chosen && !isAnswer;
                  const showHint = answered && !chosen && isAnswer;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`inquiry-selfcheck-btn${chosen ? ' chosen' : ''}${showCorrect ? ' correct' : ''}${showWrong ? ' wrong' : ''}${showHint ? ' answer-hint' : ''}`}
                      onClick={() => onAnswer(key, idx)}
                    >
                      {localize(opt, lang)}
                    </button>
                  );
                })}
              </div>
            )}

            {answered && (
              <p className="inquiry-selfcheck-feedback">
                <span className={isCorrect ? 'ok' : 'no'}>
                  {isCorrect
                    ? lang === 'ko'
                      ? '맞아요 — '
                      : 'Correct — '
                    : lang === 'ko'
                      ? '다시 생각 — '
                      : 'Not quite — '}
                </span>
                {localize(item.explanation, lang)}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
