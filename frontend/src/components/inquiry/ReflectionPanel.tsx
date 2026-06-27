import { useLangStore } from '../../i18n';
import { localize } from '../../explorationBlocks/localize';
import type { InquiryPrompt } from '../../explorationBlocks/types';

interface ReflectionPanelProps {
  prompts: InquiryPrompt[];
  notes: Record<string, string>;
  onNoteChange: (fieldId: string, value: string) => void;
}

export function ReflectionPanel({ prompts, notes, onNoteChange }: ReflectionPanelProps) {
  const lang = useLangStore((state) => state.lang);

  return (
    <section className="inquiry-info-panel">
      <span className="inquiry-panel-kicker">{lang === 'ko' ? '해석 질문' : 'Reflection Prompts'}</span>
      <h3>{lang === 'ko' ? '학습자가 해석할 영역' : 'Learner Interpretation'}</h3>
      <p>
        {lang === 'ko'
          ? '아래 질문은 계산된 값을 정답으로 받아들이지 않고 근거와 한계를 설명하게 만들기 위한 영역입니다.'
          : 'These prompts keep the computed values from becoming automatic answers; use them to explain evidence and limits.'}
      </p>
      <div className="inquiry-reflection-list">
        {prompts.map((prompt) => (
          <label key={prompt.id} className="inquiry-record-field">
            <span>{localize(prompt.question, lang)}</span>
            <textarea
              value={notes[prompt.id] ?? ''}
              onChange={(event) => onNoteChange(prompt.id, event.target.value)}
              placeholder={lang === 'ko' ? '해석을 작성하세요.' : 'Write your interpretation.'}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
