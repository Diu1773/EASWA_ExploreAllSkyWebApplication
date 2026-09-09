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
        ? '입력 내용은 로그인 없이 브라우저 세션 식별자로 자동 저장됩니다. 이름·연락처 등 개인 식별 정보는 입력하지 마세요. 저장된 기록은 서비스 개선과 연구의 기능 점검에 사용됩니다.'
        : 'What you enter is saved automatically under a browser session identifier, without a login. Please do not enter personal identifiers such as your name or contact details. Saved records are used to improve the service and to check that its functions work.'}
    </p>
  );
}
