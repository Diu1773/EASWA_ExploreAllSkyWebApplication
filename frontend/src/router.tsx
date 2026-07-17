import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RouteErrorScreen } from './components/layout/RouteErrorScreen';
import { TargetDetail } from './components/detail/TargetDetail';
import { LabView } from './components/lab/LabView';
import { MyAnalyses } from './components/pages/MyAnalyses';
import { RecordDetail } from './components/pages/RecordDetail';
import { SharedRecord } from './components/pages/SharedRecord';
import { Settings } from './components/pages/Settings';
import { AdminDashboard } from './components/pages/AdminDashboard';
import { HomePage } from './components/pages/HomePage';
import { KmtnetIntroPage } from './components/pages/KmtnetIntroPage';
import { ObservatorySelectPage } from './components/pages/ObservatorySelectPage';
import { KmtnetExplorerPage } from './components/pages/KmtnetExplorerPage';
import { SkyExplorerPage } from './components/pages/SkyExplorerPage';
import { ModulePage } from './components/pages/ModulePage';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    // Deploy-stale chunks and render errors land here instead of react-router's
    // English "Hey developer" screen; stale chunks self-heal with one reload.
    errorElement: <RouteErrorScreen />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/modules/:moduleId', element: <ModulePage /> },
      { path: '/kmtnet', element: <KmtnetIntroPage /> },
      { path: '/kmtnet/sites', element: <ObservatorySelectPage /> },
      { path: '/kmtnet/explorer', element: <KmtnetExplorerPage /> },
      { path: '/explorer', element: <SkyExplorerPage /> },
      { path: '/target/:targetId', element: <TargetDetail /> },
      { path: '/lab/:targetId', element: <LabView /> },
      { path: '/my', element: <MyAnalyses /> },
      { path: '/records/:recordId', element: <RecordDetail /> },
      { path: '/shared/:token', element: <SharedRecord /> },
      { path: '/settings', element: <Settings /> },
      { path: '/admin', element: <AdminDashboard /> },
      // Anything unrouted — a retired page such as /tess, a stale bookmark, a
      // typo — went to react-router's built-in "Hey developer 👋" error screen.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
