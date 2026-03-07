import { createBrowserRouter, Navigate } from 'react-router';
import App from './App';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InterviewSetupPage from './pages/InterviewSetupPage';
import InterviewPage from './pages/InterviewPage';
import ResultsPage from './pages/ResultsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/layout/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'interviews/:id', element: <InterviewSetupPage /> },
      {
        path: 'interviews/:id/sessions/:sessionId/results',
        element: <ResultsPage />,
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/interview/:token', element: <InterviewPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
