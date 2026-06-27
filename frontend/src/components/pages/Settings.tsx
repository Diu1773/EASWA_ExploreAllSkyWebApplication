import { useAuthStore } from '../../stores/useAuthStore';
import { useLangStore } from '../../i18n';

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const lang = useLangStore((s) => s.lang);

  if (!user) {
    return (
      <div className="page-placeholder">
        <h2>{lang === 'ko' ? '설정' : 'Settings'}</h2>
        <p>{lang === 'ko' ? '설정을 사용하려면 로그인하세요.' : 'Please sign in to access settings.'}</p>
        <a href="/api/auth/login" className="btn-primary">
          {lang === 'ko' ? 'Google로 로그인' : 'Sign in with Google'}
        </a>
      </div>
    );
  }

  return (
    <div className="page-placeholder">
      <h2>{lang === 'ko' ? '설정' : 'Settings'}</h2>

      <div className="settings-section">
        <h3>{lang === 'ko' ? '계정' : 'Account'}</h3>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">{lang === 'ko' ? '이름' : 'Name'}</span>
            <span className="settings-value">{user.name}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Email</span>
            <span className="settings-value">{user.email}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">{lang === 'ko' ? '계정' : 'Account'}</span>
            <span className="settings-value">Google</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>{lang === 'ko' ? '세션' : 'Session'}</h3>
        <button className="btn-danger" onClick={logout}>
          {lang === 'ko' ? '로그아웃' : 'Logout'}
        </button>
      </div>
    </div>
  );
}
