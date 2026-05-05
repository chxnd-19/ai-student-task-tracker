import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

import Login          from './pages/Login';
import Signup         from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import TeacherDashboard  from './pages/TeacherDashboard';
import StudentDashboard  from './pages/StudentDashboard';
import ClassesPage       from './pages/ClassesPage';
import ClassDetailsPage  from './pages/ClassDetailsPage';
import SettingsPage      from './pages/SettingsPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider }     from './context/WorkspaceProvider';
import ErrorBoundary             from './components/ErrorBoundary';

// ── Route guards ──────────────────────────────────────────────────────────────

/** Redirect to /login if not authenticated. */
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

/**
 * RoleRoute — enforce role-based access.
 * Redirects to role-appropriate dashboard if the user's role is not in `roles`.
 */
function RoleRoute({ roles, children }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!roles.includes(user?.role)) {
    // Send to the correct dashboard instead of a dead end
    return <Navigate to={user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
  }
  return children;
}

/** Redirect / to the role-appropriate dashboard. */
function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <h2 className="text-6xl font-black mb-4">404</h2>
      <p className="text-xl text-white/40 mb-8">Page not found</p>
      <Link to="/" className="btn-primary px-8 h-12">Go Home</Link>
    </div>
  );
}

// ── Route tree ────────────────────────────────────────────────────────────────
function AppContent() {
  const { login } = useAuth();

  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────────── */}
      <Route path="/login"              element={<Login onLogin={login} />} />
      <Route path="/signup"             element={<Signup onLogin={login} />} />
      <Route path="/forgot-password"    element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* ── Root redirect ──────────────────────────────────────────────────── */}
      <Route path="/"          element={<HomeRedirect />} />
      <Route path="/dashboard" element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />

      {/* ── Teacher-only routes (/teacher/*) ───────────────────────────────── */}
      <Route
        path="/teacher/dashboard"
        element={
          <RoleRoute roles={['teacher']}>
            <TeacherDashboard />
          </RoleRoute>
        }
      />

      {/* ── Student-only routes (/student/*) ───────────────────────────────── */}
      <Route
        path="/student/dashboard"
        element={
          <RoleRoute roles={['student']}>
            <StudentDashboard />
          </RoleRoute>
        }
      />

      {/* ── Shared protected routes ─────────────────────────────────────────── */}
      <Route path="/classes" element={
        <PrivateRoute><ClassesPage /></PrivateRoute>
      } />
      <Route path="/classes/:classId" element={
        <PrivateRoute><ClassDetailsPage /></PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute><SettingsPage /></PrivateRoute>
      } />

      {/* ── Legacy redirects (keep old URLs working) ───────────────────────── */}
      <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
      <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <WorkspaceProvider>
              <div className="min-h-screen bg-[#0b0f1a] text-white">
                <AppContent />
              </div>
            </WorkspaceProvider>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
