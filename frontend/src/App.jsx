import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ClassesPage from './pages/ClassesPage';
import ClassDetailsPage from './pages/ClassDetailsPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceProvider';
import { motion } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import GlassCard from './components/GlassCard';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ roles, children }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.role === 'teacher') return <TeacherDashboard />;
  return <StudentDashboard />;
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

function AppContent() {
  const { login } = useAuth();
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login onLogin={login} />} />
      <Route path="/signup" element={<Signup onLogin={login} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route path="/" element={<HomeRedirect />} />
      
      <Route path="/dashboard" element={
        <PrivateRoute><HomeRedirect /></PrivateRoute>
      } />

      <Route path="/classes" element={
        <PrivateRoute><ClassesPage /></PrivateRoute>
      } />

      <Route path="/classes/:classId" element={
        <PrivateRoute><ClassDetailsPage /></PrivateRoute>
      } />

      <Route path="/settings" element={
        <PrivateRoute><SettingsPage /></PrivateRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <WorkspaceProvider>
            <div className="min-h-screen bg-[#0b0f1a] text-white">
              <AppContent />
            </div>
          </WorkspaceProvider>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
