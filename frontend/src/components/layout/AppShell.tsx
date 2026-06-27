import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLangStore } from '../../i18n';

export function AppShell() {
  const checkSession = useAuthStore((s) => s.checkSession);
  const lang = useLangStore((s) => s.lang);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
