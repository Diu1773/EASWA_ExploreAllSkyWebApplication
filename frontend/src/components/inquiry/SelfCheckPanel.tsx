import { useState } from 'react';
import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { SelfCheckItem } from '../../explorationBlocks/types';

interface SelfCheckPanelProps {
  items: SelfCheckItem[];
}

/**
 * Interactive "생각해보기" self-checks (O/X and multiple-choice) with immediate
 * feedback — turns the otherwise read-only info steps into an active check,
 * mirroring the Transit Lab's self-check pattern.
 */
export function SelfCheckPanel({ items }: SelfCheckPanelProps) {
  const lang = useLangStore((state) => state.lang);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});

  return (
    <section className="inquiry-selfcheck">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '생각해보기' : 'Check Yourself'}</span>
      {items.map((item) => {
        const answer = answers[item.id];
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
                  const markCorrect = answered && item.correct === opt;
                  const markWrong = answered && chosen && item.correct !== opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`inquiry-selfcheck-btn${chosen ? ' chosen' : ''}${markCorrect ? ' correct' : ''}${markWrong ? ' wrong' : ''}`}
                      onClick={() => setAnswers((a) => ({ ...a, [item.id]: opt }))}
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
                  const markCorrect = answered && item.correctIndex === idx;
                  const markWrong = answered && chosen && item.correctIndex !== idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`inquiry-selfcheck-btn${chosen ? ' chosen' : ''}${markCorrect ? ' correct' : ''}${markWrong ? ' wrong' : ''}`}
                      onClick={() => setAnswers((a) => ({ ...a, [item.id]: idx }))}
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
