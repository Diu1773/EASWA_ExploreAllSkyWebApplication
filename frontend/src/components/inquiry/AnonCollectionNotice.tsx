import { useLangStore } from '../../i18n';

/**
 * Step 6 collection notice.
 *
 * Replaces the old submit panel. Records now upload themselves as they are
 * written, so there is no button to press — but that is exactly why this notice
 * has to exist: without it the app would collect a learner's work with nothing
 * on screen ever saying so. It is the only place they are told the record is
 * anonymous, where it goes, and that no personal data is taken.
 */
export function AnonCollectionNotice() {
  const lang = useLangStore((s) => s.lang);

  return (
    <p className="inquiry-anon-notice">
      {lang === 'ko'
        ? '이 탐구 기록은 로그인 없이 익명으로 자동 저장되며, 수업과 연구 개선에만 사용됩니다. 이름이나 연락처 같은 개인 정보는 수집하지 않습니다.'
        : 'This record is saved automatically and anonymously, without a login, and is used only to improve the lessons and the research. No personal information such as your name or contact details is collected.'}
    </p>
  );
}
